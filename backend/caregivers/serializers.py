from rest_framework import serializers
from accounts.serializers import UserSerializer
from .models import CaregiverProfile, Specialization, Availability


class SpecializationSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Specialization
        fields = ['id', 'name']


class AvailabilitySerializer(serializers.ModelSerializer):
    day_display = serializers.CharField(source='get_day_display', read_only=True)

    class Meta:
        model  = Availability
        fields = ['id', 'day', 'day_display', 'start_time', 'end_time']


class CaregiverProfileSerializer(serializers.ModelSerializer):
    user            = UserSerializer(read_only=True)
    specializations = SpecializationSerializer(many=True, read_only=True)
    availability    = AvailabilitySerializer(many=True, read_only=True)

    class Meta:
        model  = CaregiverProfile
        fields = [
            'id', 'user', 'bio', 'specializations', 'experience',
            'hourly_rate', 'years_exp', 'is_available', 'rating_avg',
            'rating_count', 'location_name', 'latitude', 'longitude',
            'availability', 'created_at',
        ]
        read_only_fields = ['id', 'rating_avg', 'rating_count', 'created_at']


class CaregiverProfileUpdateSerializer(serializers.ModelSerializer):
    specialization_ids = serializers.PrimaryKeyRelatedField(
        queryset=Specialization.objects.all(), many=True, write_only=True, required=False
    )

    class Meta:
        model  = CaregiverProfile
        fields = [
            'bio', 'experience', 'hourly_rate', 'years_exp',
            'is_available', 'id_number', 'location_name',
            'latitude', 'longitude', 'specialization_ids',
        ]

    def update(self, instance, validated_data):
        spec_ids = validated_data.pop('specialization_ids', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if spec_ids is not None:
            instance.specializations.set(spec_ids)
        return instance
