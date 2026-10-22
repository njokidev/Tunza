from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Payment

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
