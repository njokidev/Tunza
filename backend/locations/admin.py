from django.contrib import admin
from .models import LocationUpdate

@admin.register(LocationUpdate)
class LocationAdmin(admin.ModelAdmin):
    list_display = ['caregiver', 'booking', 'latitude', 'longitude', 'timestamp']
