import logging
import math
from datetime import timedelta as _td

import requests
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone as _tz
from rest_framework import status as http
from rest_framework.views import APIView
from rest_framework.response import Response

from accounts.phone import mask_phone, normalize_ke_phone
from . import mpesa
from .models import Payment

log = logging.getLogger(__name__)

# A second tap within this window returns the prompt already on its way
# instead of sending the family another one.
RESEND_AFTER = _td(minutes=2)


def _err(code, detail, status=http.HTTP_400_BAD_REQUEST):
    return Response({'code': code, 'detail': detail}, status=status)


class InitiatePaymentView(APIView):
    """
    POST /api/payments/initiate/  {"booking_id": "...", "phone": "0712 345 678"}

    The family starts paying for a booking the caregiver has accepted: Tunza sends
    an M-Pesa STK push to the phone (theirs by default) and returns 202. The
    payment stays "pending" until Safaricom's callback says how it went; poll
    /api/payments/status/<booking_id>/ in the meantime.
    """

    def post(self, request):
        from bookings.models import Booking

        booking_id = request.data.get('booking_id')
        if not booking_id:
            return _err('booking_required', 'booking_id is required.')
        try:
            booking = Booking.objects.get(pk=booking_id, patient=request.user)
        except (Booking.DoesNotExist, ValidationError):   # unknown, someone else's, or not a UUID
            return _err('not_found', 'Booking not found.', http.HTTP_404_NOT_FOUND)

        if booking.is_paid or Payment.objects.filter(booking=booking, status=Payment.Status.SUCCESS).exists():
            return _err('already_paid', 'This booking is already paid for.', http.HTTP_409_CONFLICT)
        if booking.status != Booking.Status.ACCEPTED:
            return _err('not_payable', 'You can pay once the caregiver has accepted the booking.')

        amount = math.ceil(booking.total_amount or 0)   # M-Pesa takes whole shillings
        if amount < 1:
            return _err('no_amount', 'This booking has no amount to pay yet.')

        phone = normalize_ke_phone(request.data.get('phone') or request.user.phone)
        if not phone:
            return _err('invalid_phone', 'Enter a Safaricom number like 0712 345 678.')

        if not mpesa.is_configured():
            return _err('payments_unavailable', 'M-Pesa payments are not switched on yet.',
                        http.HTTP_503_SERVICE_UNAVAILABLE)

        # Claim the payment row under a lock so a double tap sends one prompt, not two.
        with transaction.atomic():
            Booking.objects.select_for_update().get(pk=booking.pk)
            payment = Payment.objects.filter(booking=booking).first()
            if (payment and payment.status == Payment.Status.PENDING
                    and _tz.now() - payment.updated_at < RESEND_AFTER):
                return Response(self._body(payment, 'We already sent the M-Pesa prompt. Check your phone.'),
                                status=http.HTTP_202_ACCEPTED)
            payment = payment or Payment(booking=booking)
            payment.user = request.user
            payment.phone = phone
            payment.amount = amount
            payment.status = Payment.Status.PENDING
            payment.checkout_request_id = payment.merchant_request_id = payment.mpesa_receipt = ''
            payment.result_desc = ''
            payment.save()

        try:
            resp = mpesa.stk_push(phone, amount, booking.id)
        except (requests.RequestException, KeyError, ValueError) as e:
            log.warning('STK push for booking %s failed: %s', booking.id, e)
            self._fail(payment, 'Could not reach M-Pesa.')
            return _err('mpesa_unreachable', 'Could not reach M-Pesa. Please try again in a minute.',
                        http.HTTP_502_BAD_GATEWAY)

        if str(resp.get('ResponseCode')) != '0':
            reason = resp.get('errorMessage') or resp.get('ResponseDescription') or 'M-Pesa declined the request.'
            log.warning('STK push for booking %s rejected: %s', booking.id, resp)
            self._fail(payment, reason)
            return _err('mpesa_rejected', reason, http.HTTP_502_BAD_GATEWAY)

        payment.checkout_request_id = resp.get('CheckoutRequestID', '')
        payment.merchant_request_id = resp.get('MerchantRequestID', '')
        payment.save(update_fields=['checkout_request_id', 'merchant_request_id', 'updated_at'])
        return Response(self._body(payment, 'Check your phone and enter your M-Pesa PIN to pay.'),
                        status=http.HTTP_202_ACCEPTED)

    @staticmethod
    def _fail(payment, reason):
        payment.status = Payment.Status.FAILED
        payment.result_desc = reason[:500]
        payment.save(update_fields=['status', 'result_desc', 'updated_at'])

    @staticmethod
    def _body(payment, message):
        return {'payment_id': str(payment.id), 'booking_id': str(payment.booking_id), 'status': payment.status,
                'amount': str(payment.amount), 'phone': mask_phone(payment.phone),
                'checkout_request_id': payment.checkout_request_id, 'message': message}

class PaymentStatusView(APIView):
    def get(self, request, booking_id):
        try:
            payment = Payment.objects.get(booking__id=booking_id, user=request.user)
            return Response({
                'status': payment.status,
                'amount': payment.amount,
            })
        except Payment.DoesNotExist:
            return Response({'detail': 'No payment found.'}, status=404)


# ── Caregiver wallet ─────────────────────────────────────────────────────────
from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.db.models import Sum
from django.utils import timezone

from accounts.permissions import IsCaregiver

COMMISSION_RATE = Decimal('0.125')
TWO_DP = Decimal('0.01')


def _net(gross):
    return (Decimal(gross or 0) * (1 - COMMISSION_RATE)).quantize(TWO_DP)


class WalletView(APIView):
    """
    The caregiver's money, worked out on the server from bookings and payouts:

    - upcoming:  accepted / in-progress visits (not earned yet)
    - on_hold:   paid visits that ended less than EARNINGS_HOLD_HOURS ago
    - available: paid visits past the hold, not yet paid out
    - paid_out:  everything Tunza has sent by M-Pesa, with the history
    All amounts are after Tunza's 12.5% commission.
    """
    permission_classes = [IsCaregiver]

    def get(self, request):
        from bookings.models import Booking
        from .models import Payout
        from caregivers.models import CaregiverProfile
        profile = CaregiverProfile.objects.select_related('user').filter(user=request.user).first()
        if profile is None:
            return Response({'detail': 'Complete your caregiver profile first.'}, status=400)

        now = timezone.now()
        hold = timedelta(hours=settings.EARNINGS_HOLD_HOURS)
        mine = Booking.objects.filter(caregiver=profile)
        unpaid_out = mine.filter(status='completed', is_paid=True, payouts__isnull=True)

        def ends(b):
            return b.completed_at or b.end_date

        on_hold, available = [], []
        for b in unpaid_out.select_related('patient').order_by('-end_date'):
            (on_hold if ends(b) and now - ends(b) < hold else available).append(b)

        upcoming = mine.filter(status__in=['accepted', 'ongoing'])
        payouts = Payout.objects.filter(caregiver=profile).prefetch_related('bookings')

        def visit(b):
            release = (ends(b) + hold) if ends(b) else None
            return {'booking_id': str(b.id), 'family': b.patient.full_name.split(' ')[0],
                    'date': ends(b), 'gross': str(b.total_amount), 'net': str(_net(b.total_amount)),
                    'available_at': release}

        month_start = now.astimezone(timezone.get_current_timezone()).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        month_gross = mine.filter(status='completed', is_paid=True, end_date__gte=month_start).aggregate(t=Sum('total_amount'))['t']
        return Response({
            'commission_rate': str(COMMISSION_RATE),
            'hold_hours': settings.EARNINGS_HOLD_HOURS,
            'payout_number': profile.payout_number,
            'upcoming': str(_net(upcoming.aggregate(t=Sum('total_amount'))['t'])),
            'upcoming_count': upcoming.count(),
            'on_hold': str(sum((_net(b.total_amount) for b in on_hold), Decimal('0.00'))),
            'available': str(sum((_net(b.total_amount) for b in available), Decimal('0.00'))),
            'paid_out': str(Decimal(payouts.aggregate(t=Sum('amount'))['t'] or 0).quantize(TWO_DP)),
            'this_month': str(_net(month_gross)),
            'completed_visits': mine.filter(status='completed').count(),
            'on_hold_visits': [visit(b) for b in on_hold],
            'available_visits': [visit(b) for b in available],
            'payouts': [{'id': str(p.id), 'amount': str(p.amount), 'phone': p.phone, 'mpesa_reference': p.mpesa_reference,
                         'visits': p.bookings.count(), 'created_at': p.created_at} for p in payouts[:50]],
        })
