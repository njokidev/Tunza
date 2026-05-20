from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from accounts.models import Notification
from accounts.permissions import IsPatient, IsCaregiver, IsAdmin
from .models import Booking
from .serializers import BookingSerializer, BookingStatusSerializer


class BookingListCreateView(generics.ListCreateAPIView):
    serializer_class = BookingSerializer

    def get_queryset(self):
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
        user = self.request.user
        if user.role == 'patient':
            return Booking.objects.filter(patient=user)
        elif user.role == 'caregiver':
            return Booking.objects.filter(caregiver__user=user)
        return Booking.objects.all()


class UpdateBookingStatusView(APIView):
    """Caregiver accepts/rejects; patient cancels."""

    def patch(self, request, pk):
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
        allowed = {
            'caregiver': ['accepted', 'rejected', 'ongoing', 'completed'],
            'patient':   ['cancelled'],
            'admin':     list(Booking.Status.values),
        }
        if new_status not in allowed.get(user.role, []):
            return Response({'detail': 'Status transition not allowed.'}, status=status.HTTP_400_BAD_REQUEST)

        booking.status = new_status
        booking.notes  = request.data.get('notes', booking.notes)
        booking.save()

        # notify the other party
        if user.role == 'caregiver':
            Notification.objects.create(
                user=booking.patient,
                title=f'Booking {new_status.capitalize()}',
                body=f'Your booking with {booking.caregiver.user.full_name} was {new_status}.',
                type='booking',
            )
        return Response(BookingSerializer(booking).data)


class AdminBookingListView(generics.ListAPIView):
    serializer_class   = BookingSerializer
    permission_classes = [IsAdmin]
    queryset           = Booking.objects.all().select_related('patient', 'caregiver__user')
