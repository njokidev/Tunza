from django.contrib import admin
from .models import Booking

@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display  = ['patient', 'caregiver', 'care_type', 'status', 'total_amount', 'is_paid', 'start_date']
    list_filter   = ['status', 'care_type', 'is_paid']
    search_fields = ['patient__full_name', 'caregiver__user__full_name']
