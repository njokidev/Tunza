from rest_framework import serializers
from accounts.serializers import PublicUserSerializer, UserSerializer
from caregivers.models import requires_nurse
from caregivers.serializers import CaregiverProfileSerializer
from .models import CareRequest, CareMatch, CareApplication


class CareRequestSerializer(serializers.ModelSerializer):
    patient        = UserSerializer(read_only=True)
    job_state      = serializers.CharField(read_only=True)
    requires_nurse = serializers.SerializerMethodField()

    def get_requires_nurse(self, obj):
        return requires_nurse(obj.care_types)

    def validate_recipient(self, value):
        request = self.context.get("request")
        if value and request and value.owner_id != request.user.id:
            raise serializers.ValidationError("Choose one of your own care recipients.")
        return value

    def validate_start_date(self, value):
        from django.utils import timezone
        if value < timezone.localdate():
            raise serializers.ValidationError("The start date can't be in the past.")
        return value

    class Meta:
        model  = CareRequest
        fields = [
            "id","patient","recipient","care_recipient","care_types","special_needs",
            "schedule_type","start_date","end_date","hours_per_day","days_of_week",
            "address","latitude","longitude","location_name",
            "budget_min","budget_max","preferred_gender","preferred_language",
            "discovery_path","is_public","status","job_state","requires_nurse",
            "created_at","updated_at",
        ]
        read_only_fields = ["id","patient","is_public","status","created_at","updated_at"]


class OpenJobSerializer(CareRequestSerializer):
    """
    An open-jobs card for the caregiver who is looking at it. No street address,
    exact pin or family contact details: those are shared only after booking.
    """
    patient     = PublicUserSerializer(read_only=True)
    has_applied = serializers.SerializerMethodField()
    can_apply   = serializers.SerializerMethodField()

    class Meta(CareRequestSerializer.Meta):
        fields = [f for f in CareRequestSerializer.Meta.fields if f not in ("address", "recipient")] + ["has_applied", "can_apply"]

    def to_representation(self, obj):
        data = super().to_representation(obj)
        # Round the pin to ~1 km so distance still works but the house can't be found.
        for k in ("latitude", "longitude"):
            if data.get(k) is not None:
                data[k] = round(data[k], 2)
        return data

    def get_has_applied(self, obj):
        return obj.pk in self.context.get("applied_ids", set())

    def get_can_apply(self, obj):
        profile = self.context.get("profile")
        if obj.job_state != CareRequest.JobState.OPEN or self.get_has_applied(obj):
            return False
        if requires_nurse(obj.care_types) and not (profile and profile.nurse_verified):
            return False
        return True


class CareMatchSerializer(serializers.ModelSerializer):
    caregiver    = CaregiverProfileSerializer(read_only=True)
    match_pct    = serializers.SerializerMethodField()

    class Meta:
        model  = CareMatch
        fields = ["id","caregiver","match_score","match_pct",
                  "match_reasons","status","created_at"]

    def get_match_pct(self, obj):
        return f"{int(obj.match_score)}%"


class CareApplicationSerializer(serializers.ModelSerializer):
    caregiver = CaregiverProfileSerializer(read_only=True)

    class Meta:
        model  = CareApplication
        fields = ["id","caregiver","message","proposed_rate","status","created_at"]
        read_only_fields = ["id","caregiver","status","created_at"]
