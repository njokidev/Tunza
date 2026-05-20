from django.contrib import admin
from .models import CaregiverProfile, Specialization, Availability

@admin.register(Specialization)
class SpecializationAdmin(admin.ModelAdmin):
    list_display = ['name']

@admin.register(CaregiverProfile)
class CaregiverProfileAdmin(admin.ModelAdmin):
    list_display  = ['user', 'experience', 'hourly_rate', 'is_available', 'rating_avg', 'rating_count']
    list_filter   = ['experience', 'is_available']
    search_fields = ['user__full_name', 'user__email']

@admin.register(Availability)
class AvailabilityAdmin(admin.ModelAdmin):
    list_display = ['caregiver', 'day', 'start_time', 'end_time']
