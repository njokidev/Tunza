from rest_framework import serializers
from accounts.serializers import UserSerializer
from caregivers.serializers import CaregiverProfileSerializer
from .models import Booking


class BookingSerializer(serializers.ModelSerializer):
    patient   = UserSerializer(read_only=True)
    caregiver = CaregiverProfileSerializer(read_only=True)
    caregiver_id = serializers.UUIDField(write_only=True)
    review = serializers.UUIDField(source='review.id', read_only=True)
    allowed_actions = serializers.SerializerMethodField()

    class Meta:
        model  = Booking
        fields = [
            'id', 'patient', 'caregiver', 'caregiver_id',
            'care_type', 'status', 'start_date', 'end_date',
            'address', 'latitude', 'longitude', 'special_needs',
            'total_amount', 'is_paid', 'notes', 'review', 'allowed_actions', 'created_at',
        ]
        read_only_fields = ['id', 'patient', 'status', 'total_amount', 'is_paid', 'created_at']

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
