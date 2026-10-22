from datetime import timedelta

from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from accounts.models import Notification
from accounts.permissions import IsPatient, IsCaregiver
from .models import CareRequest, CareMatch, CareApplication
from .serializers import CareRequestSerializer, CareMatchSerializer, CareApplicationSerializer, OpenJobSerializer
from .matching import run_matching
from bookings.services import create_booking_from_care_request
from caregivers.models import requires_nurse

# How long a taken / expired job stays visible (greyed out) on the open jobs list.
SHOW_CLOSED_JOBS_FOR = timedelta(days=2)

NOT_OPEN_MESSAGES = {
    CareRequest.JobState.TAKEN:   "Sorry, this job has just been taken by another caregiver.",
    CareRequest.JobState.EXPIRED: "This job has expired: its start date has passed.",
    CareRequest.JobState.CLOSED:  "The family has closed this job.",
}
NURSE_ONLY_MESSAGE = ("This job includes medication administration, which only caregivers with a "
                      "Tunza-verified nursing or CNA certificate can take.")


def _notify(user, title, body, ntype="booking"):
    Notification.objects.create(user=user, title=title, body=body, type=ntype)


def _lock_request(pk, patient):
    """Fetch a care request with a row lock so two acceptances can't both win."""
    return CareRequest.objects.select_for_update().get(id=pk, patient=patient)


def _close_other_applications(cr, winner):
    """Once a job is filled, tell everyone else who applied."""
    others = (CareApplication.objects
              .filter(care_request=cr, status__in=[CareApplication.Status.APPLIED, CareApplication.Status.SHORTLISTED])
              .exclude(caregiver=winner).select_related("caregiver__user"))
    for app in others:
        _notify(app.caregiver.user, "Job filled",
                "A job you applied to has been taken by another caregiver. Keep an eye on Open jobs for new requests.")
    others.update(status=CareApplication.Status.REJECTED)


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
        with transaction.atomic():
            try:
                cr = _lock_request(pk, request.user)
                m = CareMatch.objects.select_related("caregiver__user").get(id=match_id, care_request=cr)
            except (CareRequest.DoesNotExist, CareMatch.DoesNotExist):
                return Response({"detail":"Not found."}, status=404)

            if cr.status in (CareRequest.Status.BOOKED, CareRequest.Status.CLOSED, CareRequest.Status.CANCELLED):
                return Response({"detail": f"This care request is already {cr.status}."}, status=400)
            if not (m.caregiver.user.is_verified and m.caregiver.is_available):
                return Response({"detail": "This caregiver is no longer available."}, status=400)
            if requires_nurse(cr.care_types) and not m.caregiver.nurse_verified:
                return Response({"detail": NURSE_ONLY_MESSAGE}, status=400)

            booking = create_booking_from_care_request(request.user, m.caregiver, cr)

            m.status  = CareMatch.Status.BOOKED
            cr.status = CareRequest.Status.BOOKED
            m.save(); cr.save()
            _close_other_applications(cr, m.caregiver)

        _notify(m.caregiver.user, "New Booking Request",
                f"{request.user.full_name} wants to book you starting {cr.start_date}.")

        from bookings.serializers import BookingSerializer
        return Response(BookingSerializer(booking, context={"request": request}).data, status=201)


class OpenRequestsView(generics.ListAPIView):
    """
    Caregivers browse public care requests. Besides open jobs, jobs that were
    taken or expired in the last 2 days stay in the list (with job_state set)
    so caregivers can see what happened to a job instead of it vanishing.
    Pass ?state=open to get only jobs that can still be applied to.
    """
    serializer_class   = OpenJobSerializer
    permission_classes = [IsCaregiver]

    def get_queryset(self):
        today  = timezone.localdate()
        cutoff = timezone.now() - SHOW_CLOSED_JOBS_FOR
        live = Q(status=CareRequest.Status.OPEN, start_date__gte=today)
        if self.request.query_params.get("state") == "open":
            cond = live
        else:
            recently_expired = Q(status=CareRequest.Status.OPEN, start_date__lt=today,
                                 start_date__gte=today - SHOW_CLOSED_JOBS_FOR)
            recently_closed = Q(status__in=[CareRequest.Status.BOOKED, CareRequest.Status.CLOSED,
                                            CareRequest.Status.CANCELLED], updated_at__gte=cutoff)
            cond = live | recently_expired | recently_closed
        return CareRequest.objects.filter(cond, is_public=True).select_related("patient")

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        profile = getattr(self.request.user, "caregiver_profile", None)
        ctx["profile"] = profile
        ctx["applied_ids"] = set(
            CareApplication.objects.filter(caregiver=profile).values_list("care_request_id", flat=True)
        ) if profile else set()
        return ctx


class ApplyToCareRequestView(APIView):
    permission_classes = [IsCaregiver]

    def post(self, request, pk):
        try:
            cr = CareRequest.objects.get(id=pk, is_public=True)
        except CareRequest.DoesNotExist:
            return Response({"detail":"Not found."}, status=404)
        if cr.job_state != CareRequest.JobState.OPEN:
            return Response({"detail": NOT_OPEN_MESSAGES[cr.job_state], "job_state": cr.job_state}, status=409)

        profile = getattr(request.user, "caregiver_profile", None)
        if profile is None:
            return Response({"detail": "Complete your caregiver profile first."}, status=400)
        if not request.user.is_verified:
            return Response({"detail": "Your profile must be verified before you can apply."}, status=403)
        if requires_nurse(cr.care_types) and not profile.nurse_verified:
            return Response({"detail": NURSE_ONLY_MESSAGE}, status=403)

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
        with transaction.atomic():
            try:
                cr = _lock_request(pk, request.user)
                app = CareApplication.objects.select_related("caregiver__user").get(id=app_id, care_request=cr)
            except (CareRequest.DoesNotExist, CareApplication.DoesNotExist):
                return Response({"detail":"Not found."}, status=404)

            if cr.status in (CareRequest.Status.BOOKED, CareRequest.Status.CLOSED, CareRequest.Status.CANCELLED):
                return Response({"detail": f"This care request is already {cr.status}."}, status=400)
            if not (app.caregiver.user.is_verified and app.caregiver.is_available):
                return Response({"detail": "This caregiver is no longer available."}, status=400)
            if requires_nurse(cr.care_types) and not app.caregiver.nurse_verified:
                return Response({"detail": NURSE_ONLY_MESSAGE}, status=400)

            # The caregiver's proposed rate wins if they gave one
            booking = create_booking_from_care_request(request.user, app.caregiver, cr, rate=app.proposed_rate)

            app.status = CareApplication.Status.ACCEPTED
            cr.status  = CareRequest.Status.BOOKED
            app.save(); cr.save()
            _close_other_applications(cr, app.caregiver)

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
