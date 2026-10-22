import re

from rest_framework import serializers
from accounts.serializers import UserSerializer
from .models import (
    CaregiverDocument, CaregiverProfile, Specialization, Availability,
    KENYAN_ID_REGEX, NURSE_ONLY_CARE_TYPES,
)


def clean_id_number(value, exclude_profile=None):
    """Shared ID check: 7–8 digits and not already used by another caregiver."""
    value = re.sub(r'\s+', '', value or '')
    if not re.match(KENYAN_ID_REGEX, value):
        raise serializers.ValidationError('Enter a valid ID number: 7 or 8 digits, numbers only.')
    taken = CaregiverProfile.objects.filter(id_number=value)
    if exclude_profile is not None:
        taken = taken.exclude(pk=exclude_profile.pk)
    if taken.exists():
        raise serializers.ValidationError('This ID number is already registered on Tunza. Contact support if this is your ID.')
    return value


class SpecializationSerializer(serializers.ModelSerializer):
    nurse_only = serializers.SerializerMethodField()

    class Meta:
        model  = Specialization
        fields = ['id', 'name', 'nurse_only']

    def get_nurse_only(self, obj):
        return obj.name.strip().lower() in NURSE_ONLY_CARE_TYPES


class AvailabilitySerializer(serializers.ModelSerializer):
    day_display = serializers.CharField(source='get_day_display', read_only=True)

    class Meta:
        model  = Availability
        fields = ['id', 'day', 'day_display', 'start_time', 'end_time']

    def validate(self, attrs):
        # end before start is allowed: it means an overnight shift (e.g. 20:00 → 06:00)
        if attrs.get('start_time') == attrs.get('end_time'):
            raise serializers.ValidationError('Start and end time cannot be the same.')
        return attrs


class CaregiverProfileSerializer(serializers.ModelSerializer):
    user            = UserSerializer(read_only=True)
    specializations = SpecializationSerializer(many=True, read_only=True)
    availability    = AvailabilitySerializer(many=True, read_only=True)

    class Meta:
        model  = CaregiverProfile
        fields = [
            'id', 'user', 'bio', 'specializations', 'experience',
            'hourly_rate', 'years_exp', 'is_available', 'rating_avg',
            'rating_count', 'location_name', 'latitude', 'longitude', 'work_areas',
            'availability', 'verification_status', 'nurse_verified', 'created_at',
        ]
        read_only_fields = ['id', 'rating_avg', 'rating_count', 'verification_status', 'nurse_verified', 'created_at']


class CaregiverProfileUpdateSerializer(serializers.ModelSerializer):
    specialization_ids = serializers.PrimaryKeyRelatedField(
        queryset=Specialization.objects.all(), many=True, write_only=True, required=False
    )
    work_areas = serializers.ListField(
        child=serializers.CharField(max_length=80, allow_blank=True), required=False, max_length=40
    )

    class Meta:
        model  = CaregiverProfile
        fields = [
            'bio', 'experience', 'hourly_rate', 'years_exp',
            'is_available', 'id_number', 'location_name',
            'latitude', 'longitude', 'work_areas', 'specialization_ids',
        ]

    def validate_id_number(self, value):
        if not value:
            return value
        if self.instance and self.instance.id_number and self.instance.verification_status in (
                CaregiverProfile.VerificationStatus.PENDING, CaregiverProfile.VerificationStatus.APPROVED):
            if value != self.instance.id_number:
                raise serializers.ValidationError('Your ID number is locked while it is being checked or after approval.')
        return clean_id_number(value, exclude_profile=self.instance)

    def validate_work_areas(self, value):
        seen, out = set(), []
        for area in value:
            name = area.strip()
            if name and name.lower() not in seen:
                seen.add(name.lower())
                out.append(name)
        return out

    def validate_specialization_ids(self, specs):
        nurse_only = [s.name for s in specs if s.name.strip().lower() in NURSE_ONLY_CARE_TYPES]
        if nurse_only and not (self.instance and self.instance.nurse_verified):
            raise serializers.ValidationError(
                f'{", ".join(nurse_only)} is only for caregivers whose nursing or CNA certificate '
                'has been verified by Tunza.')
        return specs

    def update(self, instance, validated_data):
        spec_ids = validated_data.pop('specialization_ids', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if spec_ids is not None:
            instance.specializations.set(spec_ids)
        return instance


class CaregiverDocumentSerializer(serializers.ModelSerializer):
    label = serializers.CharField(source='get_doc_type_display', read_only=True)

    class Meta:
        model  = CaregiverDocument
        fields = ['id', 'doc_type', 'label', 'original_name', 'uploaded_at']


class VerificationStatusSerializer(serializers.ModelSerializer):
    """What a caregiver sees about their own application."""
    documents = CaregiverDocumentSerializer(many=True, read_only=True)
    id_number_masked = serializers.SerializerMethodField()

    class Meta:
        model  = CaregiverProfile
        fields = ['verification_status', 'verification_submitted_at', 'verification_note',
                  'nurse_verified', 'id_number_masked', 'documents']

    def get_id_number_masked(self, obj):
        n = obj.id_number or ''
        return f'{"•" * max(len(n) - 3, 0)}{n[-3:]}' if n else ''
