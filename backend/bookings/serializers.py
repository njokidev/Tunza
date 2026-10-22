from rest_framework import serializers
from accounts.serializers import PublicUserSerializer
from caregivers.serializers import CaregiverProfileSerializer
from .models import Booking


class BookingSerializer(serializers.ModelSerializer):
    patient   = PublicUserSerializer(read_only=True)
    caregiver = CaregiverProfileSerializer(read_only=True)
    caregiver_id = serializers.UUIDField(write_only=True)
    review = serializers.UUIDField(source='review.id', read_only=True)
    family_review = serializers.UUIDField(source='family_review.id', read_only=True)
    allowed_actions = serializers.SerializerMethodField()
    contact = serializers.SerializerMethodField()
    family_rating = serializers.SerializerMethodField()
    check_in_flagged = serializers.SerializerMethodField()

    class Meta:
        model  = Booking
        fields = [
            'id', 'patient', 'caregiver', 'caregiver_id',
            'care_type', 'status', 'start_date', 'end_date',
            'address', 'latitude', 'longitude', 'special_needs',
            'total_amount', 'is_paid', 'notes', 'review', 'family_review', 'allowed_actions',
            'contact', 'family_rating', 'decline_reason', 'accepted_at', 'completed_at',
            'check_in_at', 'check_in_distance_m', 'check_out_at', 'check_out_distance_m', 'check_in_flagged',
            'created_at',
        ]
        read_only_fields = ['id', 'patient', 'status', 'total_amount', 'is_paid', 'decline_reason',
                            'accepted_at', 'completed_at', 'check_in_at', 'check_in_distance_m',
                            'check_out_at', 'check_out_distance_m', 'created_at']

    def to_representation(self, obj):
        data = super().to_representation(obj)
        request = self.context.get('request')
        viewer = getattr(request, 'user', None)
        # The caregiver sees only the area (and no pin) until the visit is paid for / accepted.
        if viewer and viewer.is_authenticated and viewer.role == 'caregiver':
            from .services import area_only, contact_unlocked
            if not contact_unlocked(obj):
                data['address'] = area_only(obj.address)
                data['latitude'] = data['longitude'] = None
        return data

    def get_contact(self, obj):
        """Phone numbers, shared both ways once unlocked (see services.contact_unlocked)."""
        from .services import contact_unlocked
        request = self.context.get('request')
        viewer = getattr(request, 'user', None)
        if not viewer or not viewer.is_authenticated:
            return {'unlocked': False}
        unlocked = viewer.role == 'admin' or contact_unlocked(obj)
        out = {'unlocked': unlocked}
        if unlocked:
            out['patient_phone'] = obj.patient.phone or ''
            out['caregiver_phone'] = obj.caregiver.user.phone or ''
        else:
            from django.conf import settings
            out['unlocks_when'] = 'paid' if settings.MPESA_COLLECTION_LIVE else 'accepted'
        return out

    def get_family_rating(self, obj):
        request = self.context.get('request')
        viewer = getattr(request, 'user', None)
        if not viewer or getattr(viewer, 'role', None) not in ('caregiver', 'admin'):
            return None
        from ratings.views import family_rating
        return family_rating(obj.patient)

    def get_check_in_flagged(self, obj):
        from django.conf import settings
        limit = settings.CHECKIN_MAX_DISTANCE_M
        return any(d is not None and d > limit for d in (obj.check_in_distance_m, obj.check_out_distance_m))

    def get_allowed_actions(self, obj):
        # Status moves the current user may make; lets the apps show the right buttons
        from .services import allowed_next
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return []
        return allowed_next(request.user.role, obj.status)

    def validate(self, data):
        from django.utils import timezone
        from datetime import timedelta
        from caregivers.models import CaregiverProfile
        if data['start_date'] >= data['end_date']:
            raise serializers.ValidationError('end_date must be after start_date.')
        if data['start_date'] < timezone.now() - timedelta(minutes=5):
            raise serializers.ValidationError({'start_date': 'Start time is in the past.'})
        try:
            caregiver = CaregiverProfile.objects.select_related('user').get(id=data['caregiver_id'])
        except CaregiverProfile.DoesNotExist:
            raise serializers.ValidationError({'caregiver_id': 'Caregiver not found.'})
        # Only verified, active, available caregivers can be booked
        if not (caregiver.user.is_verified and caregiver.user.is_active):
            raise serializers.ValidationError({'caregiver_id': 'This caregiver has not been verified yet.'})
        if not caregiver.is_available:
            raise serializers.ValidationError({'caregiver_id': 'This caregiver is not taking bookings right now.'})
        data['caregiver'] = caregiver
        return data

    def create(self, validated_data):
        validated_data.pop('caregiver_id')
        caregiver = validated_data.pop('caregiver')
        booking = Booking.objects.create(caregiver=caregiver, **validated_data)
        booking.calculate_amount()
        return booking


class BookingStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Booking
        fields = ['status', 'notes']
