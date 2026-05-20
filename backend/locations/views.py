from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from accounts.permissions import IsCaregiver
from bookings.models import Booking
from .models import LocationUpdate


class UpdateLocationView(APIView):
    """Caregiver pushes their GPS coordinates during an active booking."""
    permission_classes = [IsCaregiver]

    def post(self, request):
        booking_id = request.data.get('booking_id')
        lat        = request.data.get('latitude')
        lng        = request.data.get('longitude')
        accuracy   = request.data.get('accuracy')

        if not all([booking_id, lat, lng]):
            return Response({'detail': 'booking_id, latitude, longitude required.'}, status=400)

        try:
            booking = Booking.objects.get(id=booking_id, caregiver__user=request.user, status='ongoing')
        except Booking.DoesNotExist:
            return Response({'detail': 'Active booking not found.'}, status=404)

        # upsert — one record per caregiver/booking, update in place for real-time feel
        loc, _ = LocationUpdate.objects.update_or_create(
            caregiver=request.user,
            booking=booking,
            defaults={'latitude': lat, 'longitude': lng, 'accuracy': accuracy}
        )
        return Response({'detail': 'Location updated.', 'timestamp': loc.timestamp})


class GetCaregiverLocationView(APIView):
    """Patient polls for their caregiver's current location during an active booking."""

    def get(self, request, booking_id):
        try:
            booking = Booking.objects.get(
                id=booking_id,
                patient=request.user,
                status='ongoing'
            )
        except Booking.DoesNotExist:
            return Response({'detail': 'Active booking not found.'}, status=404)

        loc = LocationUpdate.objects.filter(booking=booking).first()
        if not loc:
            return Response({'detail': 'Caregiver location not yet available.'}, status=404)

        return Response({
            'latitude':  loc.latitude,
            'longitude': loc.longitude,
            'accuracy':  loc.accuracy,
            'timestamp': loc.timestamp,
            'caregiver': booking.caregiver.user.full_name,
        })
