from rest_framework import generics, permissions, status, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import CaregiverProfile, Specialization, Availability
from .serializers import (
    CaregiverProfileSerializer, CaregiverProfileUpdateSerializer,
    SpecializationSerializer, AvailabilitySerializer
)
from accounts.permissions import IsCaregiver, IsAdmin


class CaregiverListView(generics.ListAPIView):
    """Public search — patients find caregivers."""
    serializer_class = CaregiverProfileSerializer
    filter_backends  = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_available', 'experience', 'specializations']
    search_fields    = ['user__full_name', 'bio', 'location_name', 'specializations__name']
    ordering_fields  = ['rating_avg', 'hourly_rate', 'years_exp']
    ordering         = ['-rating_avg']

    def get_queryset(self):
        qs = CaregiverProfile.objects.select_related('user').prefetch_related('specializations', 'availability')
        # filter by max rate
        max_rate = self.request.query_params.get('max_rate')
        if max_rate:
            qs = qs.filter(hourly_rate__lte=max_rate)
        # filter verified only by default
        verified = self.request.query_params.get('verified', 'true')
        if verified == 'true':
            qs = qs.filter(user__is_verified=True)
        return qs


class CaregiverDetailView(generics.RetrieveAPIView):
    queryset         = CaregiverProfile.objects.select_related('user').prefetch_related('specializations', 'availability')
    serializer_class = CaregiverProfileSerializer
    lookup_field     = 'id'


class MyCaregiverProfileView(generics.RetrieveUpdateAPIView):
    """Caregiver manages their own profile."""
    permission_classes = [IsCaregiver]

    def get_object(self):
        profile, _ = CaregiverProfile.objects.get_or_create(user=self.request.user)
        return profile

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return CaregiverProfileUpdateSerializer
        return CaregiverProfileSerializer


class AvailabilityView(APIView):
    permission_classes = [IsCaregiver]

    def get(self, request):
        avail = Availability.objects.filter(caregiver__user=request.user)
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
