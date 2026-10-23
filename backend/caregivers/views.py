from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework import generics, permissions, status, filters, serializers as drf_serializers
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.views import APIView
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from accounts.models import Notification, User
from .models import CaregiverDocument, CaregiverProfile, Specialization, Availability
from .serializers import (
    CaregiverProfileSerializer, CaregiverProfileUpdateSerializer, OwnCaregiverProfileSerializer,
    SpecializationSerializer, AvailabilitySerializer, VerificationStatusSerializer, clean_id_number,
)
from . import documents as doc_store
from accounts.permissions import IsCaregiver, IsAdmin, PhoneVerified


class CaregiverListView(generics.ListAPIView):
    """Public search — patients find caregivers."""
    serializer_class = CaregiverProfileSerializer
    filter_backends  = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_available', 'experience', 'specializations', 'gender']
    search_fields    = ['user__full_name', 'bio', 'location_name', 'specializations__name']
    ordering_fields  = ['rating_avg', 'hourly_rate', 'years_exp']
    ordering         = ['-rating_avg']

    def get_queryset(self):
        qs = CaregiverProfile.objects.select_related('user').prefetch_related('specializations', 'availability')
        # filter by max rate
        max_rate = self.request.query_params.get('max_rate')
        if max_rate:
            qs = qs.filter(hourly_rate__lte=max_rate)
        language = self.request.query_params.get('language')
        if language:
            qs = qs.filter(languages__icontains=language)
        # Families only ever see verified caregivers. Caregivers still being checked
        # use the app (to set up their profile) but stay hidden until approved.
        if getattr(self.request.user, 'role', None) != 'admin' or self.request.query_params.get('verified', 'true') == 'true':
            qs = qs.filter(user__is_verified=True)
        return qs


class CaregiverDetailView(generics.RetrieveAPIView):
    serializer_class = CaregiverProfileSerializer
    lookup_field     = 'id'

    def get_queryset(self):
        qs = CaregiverProfile.objects.select_related('user').prefetch_related('specializations', 'availability')
        user = self.request.user
        if getattr(user, 'role', None) == 'admin':
            return qs
        # Unverified caregivers (still being checked) are only visible to themselves.
        from django.db.models import Q
        return qs.filter(Q(user__is_verified=True) | Q(user_id=getattr(user, 'id', None)))


class MyCaregiverProfileView(generics.RetrieveUpdateAPIView):
    """Caregiver manages their own profile."""
    permission_classes = [IsCaregiver]

    def get_object(self):
        profile, _ = CaregiverProfile.objects.get_or_create(user=self.request.user)
        return profile

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return CaregiverProfileUpdateSerializer
        return OwnCaregiverProfileSerializer


class ProfileSetupView(APIView):
    """
    POST — onboarding step after the documents are in (while the background check runs,
    or after approval): the profile families will see.
      bio (40+ characters), years_exp, hourly_rate (KES 100+), specialization_ids (1+),
      languages (1+), gender (optional), day_shift_rate / night_shift_rate (optional).
    Saves everything and marks the profile step done.
    """
    permission_classes = [IsCaregiver]
    MIN_BIO = 40
    MIN_RATE = 100

    def post(self, request):
        profile, _ = CaregiverProfile.objects.get_or_create(user=request.user)
        VS = CaregiverProfile.VerificationStatus
        if profile.verification_status not in (VS.PENDING, VS.APPROVED) and not request.user.is_verified:
            return Response({'detail': 'Upload your documents first, then set up your profile.'},
                            status=status.HTTP_403_FORBIDDEN)

        allowed = ['bio', 'years_exp', 'hourly_rate', 'specialization_ids', 'languages', 'gender',
                   'day_shift_rate', 'night_shift_rate']
        data = {k: request.data[k] for k in allowed if k in request.data}
        try:
            years = max(0, int(data.get('years_exp') or 0))
        except (TypeError, ValueError):
            years = 0
        data['years_exp'] = years
        data['experience'] = 'senior' if years >= 5 else 'mid' if years >= 2 else 'junior'

        ser = CaregiverProfileUpdateSerializer(profile, data=data, partial=True)
        ser.is_valid(raise_exception=True)
        v = ser.validated_data
        errors = {}
        if len((v.get('bio') or '').strip()) < self.MIN_BIO:
            errors['bio'] = [f'Write at least {self.MIN_BIO} characters about your experience.']
        if (v.get('hourly_rate') or 0) < self.MIN_RATE:
            errors['hourly_rate'] = [f'Set an hourly rate of at least KES {self.MIN_RATE}.']
        if not v.get('specialization_ids'):
            errors['specialization_ids'] = ['Choose at least one type of care you offer.']
        if not v.get('languages'):
            errors['languages'] = ['Choose at least one language you speak.']
        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            ser.save()
            profile.profile_completed_at = timezone.now()
            profile.save(update_fields=['profile_completed_at'])
        return Response(OwnCaregiverProfileSerializer(profile, context={'request': request}).data)


class AvailabilityView(APIView):
    permission_classes = [IsCaregiver]

    def get(self, request):
        avail = Availability.objects.filter(caregiver__user=request.user)
        return Response(AvailabilitySerializer(avail, many=True).data)

    def put(self, request):
        """Replace the whole week in one go: {slots: [{day, start_time, end_time}, ...]}"""
        profile, _ = CaregiverProfile.objects.get_or_create(user=request.user)
        s = AvailabilitySerializer(data=request.data.get('slots', []), many=True)
        s.is_valid(raise_exception=True)
        days = [row['day'] for row in s.validated_data]
        if len(days) != len(set(days)):
            return Response({'detail': 'Each day can only appear once.'}, status=status.HTTP_400_BAD_REQUEST)
        with transaction.atomic():
            Availability.objects.filter(caregiver=profile).delete()
            Availability.objects.bulk_create([Availability(caregiver=profile, **row) for row in s.validated_data])
        avail = Availability.objects.filter(caregiver=profile)
        return Response(AvailabilitySerializer(avail, many=True).data)

    def post(self, request):
        profile = request.user.caregiver_profile
        s = AvailabilitySerializer(data=request.data)
        s.is_valid(raise_exception=True)
        s.save(caregiver=profile)
        return Response(s.data, status=status.HTTP_201_CREATED)

    def delete(self, request, pk):
        try:
            a = Availability.objects.get(pk=pk, caregiver__user=request.user)
            a.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Availability.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)


class SpecializationListView(generics.ListCreateAPIView):
    queryset           = Specialization.objects.all()
    serializer_class   = SpecializationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdmin()]
        return super().get_permissions()


class VerificationView(APIView):
    """
    GET  — the caregiver's application status and the documents on file.
    POST — multipart upload of the application:
             id_number      7–8 digits (required)
             id_front       scan/photo of the ID, front (required)
             id_back        scan/photo of the ID, back (required)
             good_conduct   Certificate of Good Conduct (required)
             cna            Certified Nurse Assistant certificate (required: how Tunza
                            checks a caregiver is trained)
             nursing        nursing certificate (optional)
             other          any other relevant certificate (optional, repeatable)
           Moves the application to "pending" — Tunza reviews within 2–3 days.
    """
    permission_classes = [IsCaregiver, PhoneVerified]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    REQUIRED = ['id_front', 'id_back', 'good_conduct', 'cna']
    OPTIONAL = ['nursing']
    MAX_OTHER = 5

    def get(self, request):
        profile, _ = CaregiverProfile.objects.get_or_create(user=request.user)
        return Response(VerificationStatusSerializer(profile).data)

    def post(self, request):
        profile, _ = CaregiverProfile.objects.get_or_create(user=request.user)
        VS = CaregiverProfile.VerificationStatus
        if profile.verification_status == VS.PENDING:
            return Response({'detail': 'Your application is already being reviewed. We\'ll get back to you within 2–3 days.'},
                            status=status.HTTP_400_BAD_REQUEST)
        if profile.verification_status == VS.APPROVED:
            return Response({'detail': 'You are already verified.'}, status=status.HTTP_400_BAD_REQUEST)

        if not doc_store.cloudinary_enabled() and not settings.DEBUG:
            # Never put ID documents on Render's public, wiped-on-deploy disk.
            return Response({'detail': 'Document uploads are temporarily unavailable. Please try again later.'},
                            status=status.HTTP_503_SERVICE_UNAVAILABLE)

        errors = {}
        try:
            id_number = clean_id_number(request.data.get('id_number', ''), exclude_profile=profile)
        except drf_serializers.ValidationError as e:
            errors['id_number'] = e.detail
            id_number = None

        files = request.FILES
        for key in self.REQUIRED:
            if key not in files:
                errors[key] = ['This document is required.']
        others = files.getlist('other')[:self.MAX_OTHER]
        uploads = [(k, files[k]) for k in self.REQUIRED + self.OPTIONAL if k in files] + [('other', f) for f in others]
        for key, f in uploads:
            msg = doc_store.validate_upload(f)
            if msg:
                errors.setdefault(key, []).append(msg)
        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)

        # Resubmission after a rejection replaces the old documents.
        old = list(profile.documents.all())
        new_docs = []
        try:
            for key, f in uploads:
                doc = CaregiverDocument(caregiver=profile, doc_type=key)
                doc_store.store(doc, f)
                new_docs.append(doc)
        except Exception:
            for doc in new_docs:
                doc_store.remove(doc)
            return Response({'detail': 'We could not upload your documents. Check your connection and try again.'},
                            status=status.HTTP_502_BAD_GATEWAY)

        with transaction.atomic():
            for doc in new_docs:
                doc.save()
            CaregiverDocument.objects.filter(pk__in=[d.pk for d in old]).delete()
            profile.id_number = id_number
            profile.verification_status = VS.PENDING
            profile.verification_submitted_at = timezone.now()
            profile.verification_note = ''
            profile.save(update_fields=['id_number', 'verification_status',
                                        'verification_submitted_at', 'verification_note'])
        for doc in old:
            doc_store.remove(doc)

        for admin in User.objects.filter(role=User.Role.ADMIN, is_active=True):
            Notification.objects.create(
                user=admin, type='system', title='New caregiver application',
                body=f'{request.user.full_name} submitted documents for a background check.')
        return Response(VerificationStatusSerializer(profile).data, status=status.HTTP_201_CREATED)
