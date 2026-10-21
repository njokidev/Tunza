from django.utils import timezone
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from accounts.models import Notification
from accounts.permissions import IsPatient, IsCaregiver
from .models import CareRequest, CareMatch, CareApplication
from .serializers import CareRequestSerializer, CareMatchSerializer, CareApplicationSerializer
from .matching import run_matching
from bookings.services import create_booking_from_care_request


def _notify(user, title, body, ntype="booking"):
    Notification.objects.create(user=user, title=title, body=body, type=ntype)


class CreateCareRequestView(generics.CreateAPIView):
    serializer_class   = CareRequestSerializer
    permission_classes = [IsPatient]

    def perform_create(self, serializer):
        cr = serializer.save(patient=self.request.user)
        if cr.discovery_path == CareRequest.DiscoveryPath.SMART_MATCH:
            run_matching(cr)
        elif cr.discovery_path == CareRequest.DiscoveryPath.OPEN_REQUEST:
            cr.is_public = True
            cr.save(update_fields=["is_public"])


class MyCareRequestsView(generics.ListAPIView):
    serializer_class   = CareRequestSerializer
    permission_classes = [IsPatient]

    def get_queryset(self):
        return CareRequest.objects.filter(patient=self.request.user)


class CareRequestMatchesView(generics.ListAPIView):
    serializer_class   = CareMatchSerializer
    permission_classes = [IsPatient]

    def get_queryset(self):
        return CareMatch.objects.filter(
            care_request__id=self.kwargs["pk"],
            care_request__patient=self.request.user
        ).select_related("caregiver__user")


class ShortlistMatchView(APIView):
    permission_classes = [IsPatient]

    def patch(self, request, pk, match_id):
        try:
            m = CareMatch.objects.get(id=match_id, care_request__patient=request.user)
        except CareMatch.DoesNotExist:
            return Response({"detail":"Not found."}, status=404)
        m.status = CareMatch.Status.SHORTLISTED
        m.save()
        _notify(m.caregiver.user, "You've been shortlisted!",
                f"{request.user.full_name} shortlisted you for their care request.")
        return Response({"detail":"Shortlisted."})


class BookFromMatchView(APIView):
    permission_classes = [IsPatient]

    def post(self, request, pk, match_id):
        from bookings.models import Booking
        try:
            m = CareMatch.objects.get(id=match_id, care_request__patient=request.user)
        except CareMatch.DoesNotExist:
            return Response({"detail":"Not found."}, status=404)

        cr = m.care_request
        if cr.status in (CareRequest.Status.BOOKED, CareRequest.Status.CLOSED, CareRequest.Status.CANCELLED):
            return Response({"detail": f"This care request is already {cr.status}."}, status=400)
        if not (m.caregiver.user.is_verified and m.caregiver.is_available):
            return Response({"detail": "This caregiver is no longer available."}, status=400)

        booking = create_booking_from_care_request(request.user, m.caregiver, cr)

        m.status  = CareMatch.Status.BOOKED
        cr.status = CareRequest.Status.BOOKED
        m.save(); cr.save()

        _notify(m.caregiver.user, "New Booking Request",
                f"{request.user.full_name} wants to book you starting {cr.start_date}.")

        from bookings.serializers import BookingSerializer
        return Response(BookingSerializer(booking, context={"request": request}).data, status=201)


class OpenRequestsView(generics.ListAPIView):
    """Caregivers browse public care requests."""
    serializer_class   = CareRequestSerializer
    permission_classes = [IsCaregiver]

    def get_queryset(self):
        return CareRequest.objects.filter(
            is_public=True, status=CareRequest.Status.OPEN
        ).select_related("patient")


class ApplyToCareRequestView(APIView):
    permission_classes = [IsCaregiver]

    def post(self, request, pk):
        try:
            cr = CareRequest.objects.get(id=pk, is_public=True, status=CareRequest.Status.OPEN)
        except CareRequest.DoesNotExist:
            return Response({"detail":"Not found."}, status=404)

        profile = getattr(request.user, "caregiver_profile", None)
        if profile is None:
            return Response({"detail": "Complete your caregiver profile first."}, status=400)
        if not request.user.is_verified:
            return Response({"detail": "Your profile must be verified before you can apply."}, status=403)

        if CareApplication.objects.filter(care_request=cr, caregiver=profile).exists():
            return Response({"detail":"Already applied."}, status=400)

        app = CareApplication.objects.create(
            care_request=cr,
            caregiver=profile,
            message=request.data.get("message",""),
            proposed_rate=request.data.get("proposed_rate"),
        )
        _notify(cr.patient, "New Application",
                f"{request.user.full_name} applied to your care request.")
        return Response(CareApplicationSerializer(app).data, status=201)


class CareRequestApplicationsView(generics.ListAPIView):
    serializer_class   = CareApplicationSerializer
    permission_classes = [IsPatient]

    def get_queryset(self):
        return CareApplication.objects.filter(
            care_request__id=self.kwargs["pk"],
            care_request__patient=self.request.user
        ).select_related("caregiver__user")


class AcceptApplicationView(APIView):
    permission_classes = [IsPatient]

    def post(self, request, pk, app_id):
        from bookings.models import Booking
        try:
            app = CareApplication.objects.get(id=app_id, care_request__patient=request.user)
        except CareApplication.DoesNotExist:
            return Response({"detail":"Not found."}, status=404)

        cr = app.care_request
        if cr.status in (CareRequest.Status.BOOKED, CareRequest.Status.CLOSED, CareRequest.Status.CANCELLED):
            return Response({"detail": f"This care request is already {cr.status}."}, status=400)
        if not (app.caregiver.user.is_verified and app.caregiver.is_available):
            return Response({"detail": "This caregiver is no longer available."}, status=400)

        # The caregiver's proposed rate wins if they gave one
        booking = create_booking_from_care_request(request.user, app.caregiver, cr, rate=app.proposed_rate)

        app.status = CareApplication.Status.ACCEPTED
        cr.status  = CareRequest.Status.BOOKED
        app.save(); cr.save()

        _notify(app.caregiver.user, "Application Accepted 🎉",
                f"{request.user.full_name} accepted your application. Booking created.")

        from bookings.serializers import BookingSerializer
        return Response(BookingSerializer(booking, context={"request": request}).data, status=201)


class RejectApplicationView(APIView):
    permission_classes = [IsPatient]

    def post(self, request, pk, app_id):
        try:
            app = CareApplication.objects.get(id=app_id, care_request__patient=request.user)
        except CareApplication.DoesNotExist:
            return Response({"detail":"Not found."}, status=404)
        app.status = CareApplication.Status.REJECTED
        app.save()
        return Response({"detail":"Application rejected."})
