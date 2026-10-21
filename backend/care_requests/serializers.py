from rest_framework import serializers
from accounts.serializers import UserSerializer
from caregivers.serializers import CaregiverProfileSerializer
from .models import CareRequest, CareMatch, CareApplication


class CareRequestSerializer(serializers.ModelSerializer):
    patient = UserSerializer(read_only=True)

    class Meta:
        model  = CareRequest
        fields = [
            "id","patient","care_recipient","care_types","special_needs",
            "schedule_type","start_date","end_date","hours_per_day","days_of_week",
            "address","latitude","longitude","location_name",
            "budget_min","budget_max","preferred_gender","preferred_language",
            "discovery_path","is_public","status","created_at",
        ]
        read_only_fields = ["id","patient","is_public","status","created_at"]


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
