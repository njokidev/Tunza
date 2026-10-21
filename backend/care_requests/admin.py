from django.contrib import admin
from .models import CareRequest, CareMatch, CareApplication

@admin.register(CareRequest)
class CareRequestAdmin(admin.ModelAdmin):
    list_display  = ["patient","care_recipient","discovery_path","status","is_public","created_at"]
    list_filter   = ["status","discovery_path","is_public"]
    search_fields = ["patient__full_name","address"]

@admin.register(CareMatch)
class CareMatchAdmin(admin.ModelAdmin):
    list_display = ["care_request","caregiver","match_score","status"]
    list_filter  = ["status"]

@admin.register(CareApplication)
class CareApplicationAdmin(admin.ModelAdmin):
    list_display = ["care_request","caregiver","proposed_rate","status","created_at"]
    list_filter  = ["status"]
