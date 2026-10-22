from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from accounts.models import Notification
from rest_framework.permissions import IsAuthenticated
from accounts.permissions import IsPatient, IsCaregiver, IsAdmin, PhoneVerified
from .models import Booking
from payments.models import Payment
from .serializers import BookingSerializer, BookingStatusSerializer
from django.utils import timezone
from .services import can_transition, allowed_next, expire_stale_requests, record_position, reopen_care_request


class BookingListCreateView(generics.ListCreateAPIView):
    serializer_class = BookingSerializer
    permission_classes = [IsAuthenticated, PhoneVerified]

    def get_queryset(self):
        expire_stale_requests()
        user = self.request.user
        if user.role == 'patient':
            return Booking.objects.filter(patient=user).select_related('caregiver__user')
        elif user.role == 'caregiver':
            return Booking.objects.filter(caregiver__user=user).select_related('patient')
        return Booking.objects.all().select_related('patient', 'caregiver__user')

    def perform_create(self, serializer):
        booking = serializer.save(patient=self.request.user)
        # notify caregiver
        Notification.objects.create(
            user=booking.caregiver.user,
            title='New Booking Request',
            body=f'{booking.patient.full_name} has requested care from {booking.start_date.strftime("%d %b %Y")}.',
            type='booking',
        )


class BookingDetailView(generics.RetrieveAPIView):
    serializer_class = BookingSerializer

    def get_queryset(self):
        expire_stale_requests()
        user = self.request.user
        if user.role == 'patient':
            return Booking.objects.filter(patient=user)
        elif user.role == 'caregiver':
            return Booking.objects.filter(caregiver__user=user)
        return Booking.objects.all()


class UpdateBookingStatusView(APIView):
    """Caregiver accepts/rejects; patient cancels."""

    def patch(self, request, pk):
        expire_stale_requests()  # a request past its reply window can't be accepted any more
        user = request.user
        try:
            if user.role == 'caregiver':
                booking = Booking.objects.get(pk=pk, caregiver__user=user)
            elif user.role == 'patient':
                booking = Booking.objects.get(pk=pk, patient=user)
            else:
                booking = Booking.objects.get(pk=pk)
        except Booking.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        new_status = request.data.get('status')
        if not can_transition(user.role, booking.status, new_status):
            detail = f'Cannot change a {booking.status} booking to {new_status}.'
            if booking.status == Booking.Status.REJECTED and booking.decline_reason:
                detail = f'This request was declined automatically ({booking.decline_reason.lower()}).'
            return Response({
                'detail': detail,
                'allowed': allowed_next(user.role, booking.status),
            }, status=status.HTTP_400_BAD_REQUEST)

        now = timezone.now()
        booking.status = new_status
        booking.notes  = request.data.get('notes', booking.notes)
        if new_status == Booking.Status.ACCEPTED:
            booking.accepted_at = now
        elif new_status == Booking.Status.ONGOING:
            # GPS check-in: the app sends where the phone is when the visit starts
            record_position(booking, 'in', request.data.get('latitude'), request.data.get('longitude'))
        elif new_status == Booking.Status.COMPLETED:
            booking.completed_at = now
            record_position(booking, 'out', request.data.get('latitude'), request.data.get('longitude'))
        elif new_status in (Booking.Status.REJECTED, Booking.Status.CANCELLED) and user.role == 'caregiver':
            booking.decline_reason = (request.data.get('reason') or '')[:200]
        booking.save()
        if new_status in (Booking.Status.REJECTED, Booking.Status.CANCELLED):
            reopen_care_request(booking)

        if new_status == Booking.Status.COMPLETED:
            # PILOT PLACEHOLDER: no money moves here. This marks the visit paid so the
            # earnings screens work until the M-Pesa STK push + callback flow replaces it.
            booking.is_paid = True
            booking.save(update_fields=['is_paid'])
            payment, created = Payment.objects.get_or_create(
                booking=booking,
                defaults={
                    'user': booking.patient,
                    'phone': booking.patient.phone,
                    'amount': booking.total_amount,
                    'status': Payment.Status.SUCCESS,
                }
            )
            if not created:
                payment.status = Payment.Status.SUCCESS
                payment.save(update_fields=['status'])
            Notification.objects.create(
                user=booking.caregiver.user,
                title='Payment Received',
                body=f'You have been paid KES {booking.total_amount} for booking {booking.id}.',
                type='payment',
            )

        # Notify whoever did not make the change
        label = new_status.capitalize()
        patient_msg   = f'Your booking with {booking.caregiver.user.full_name} was {new_status}.'
        caregiver_msg = f'Your booking with {booking.patient.full_name} was {new_status}.'
        if user.role in ('caregiver', 'admin'):
            Notification.objects.create(user=booking.patient, title=f'Booking {label}',
                                        body=patient_msg, type='booking')
        if user.role in ('patient', 'admin'):
            Notification.objects.create(user=booking.caregiver.user, title=f'Booking {label}',
                                        body=caregiver_msg, type='booking')
        return Response(BookingSerializer(booking, context={'request': request}).data)


class AdminBookingListView(generics.ListAPIView):
    serializer_class   = BookingSerializer
    permission_classes = [IsAdmin]
    queryset           = Booking.objects.all().select_related('patient', 'caregiver__user')
