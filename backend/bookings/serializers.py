from rest_framework import serializers
from accounts.serializers import UserSerializer
from caregivers.serializers import CaregiverProfileSerializer
from .models import Booking


class BookingSerializer(serializers.ModelSerializer):
    patient   = UserSerializer(read_only=True)
    caregiver = CaregiverProfileSerializer(read_only=True)
    caregiver_id = serializers.UUIDField(write_only=True)

    class Meta:
        model  = Booking
        fields = [
            'id', 'patient', 'caregiver', 'caregiver_id',
            'care_type', 'status', 'start_date', 'end_date',
            'address', 'latitude', 'longitude', 'special_needs',
            'total_amount', 'is_paid', 'notes', 'created_at',
        ]
        read_only_fields = ['id', 'patient', 'status', 'total_amount', 'is_paid', 'created_at']

    def validate(self, data):
        if data['start_date'] >= data['end_date']:
            raise serializers.ValidationError('end_date must be after start_date.')
        return data

    def create(self, validated_data):
        from caregivers.models import CaregiverProfile
        cg_id = validated_data.pop('caregiver_id')
        try:
            caregiver = CaregiverProfile.objects.get(id=cg_id)
        except CaregiverProfile.DoesNotExist:
            raise serializers.ValidationError({'caregiver_id': 'Caregiver not found.'})
        booking = Booking.objects.create(caregiver=caregiver, **validated_data)
        booking.calculate_amount()
        return booking


class BookingStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Booking
        fields = ['status', 'notes']
