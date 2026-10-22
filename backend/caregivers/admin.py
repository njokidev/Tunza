from django.contrib import admin
from django.utils.html import format_html
from .models import CaregiverDocument, CaregiverProfile, Specialization, Availability
from . import documents as doc_store


@admin.register(Specialization)
class SpecializationAdmin(admin.ModelAdmin):
    list_display = ['name']


class CaregiverDocumentInline(admin.TabularInline):
    model = CaregiverDocument
    extra = 0
    can_delete = False
    fields = ['doc_type', 'original_name', 'uploaded_at', 'open_link']
    readonly_fields = fields

    def has_add_permission(self, request, obj=None):
        return False

    @admin.display(description='File')
    def open_link(self, obj):
        url = doc_store.document_url(obj)
        return format_html('<a href="{}" target="_blank" rel="noopener">Open (link expires in 15 min)</a>', url) if url else '—'


@admin.register(CaregiverProfile)
class CaregiverProfileAdmin(admin.ModelAdmin):
    list_display  = ['user', 'verification_status', 'nurse_verified', 'experience', 'hourly_rate', 'is_available', 'rating_avg']
    list_filter   = ['verification_status', 'nurse_verified', 'experience', 'is_available']
    search_fields = ['user__full_name', 'user__email', 'id_number']
    inlines       = [CaregiverDocumentInline]

    def save_model(self, request, obj, form, change):
        # Keep the account-level flag (used everywhere for search/booking) in step.
        super().save_model(request, obj, form, change)
        approved = obj.verification_status == CaregiverProfile.VerificationStatus.APPROVED
        if obj.user.is_verified != approved:
            obj.user.is_verified = approved
            obj.user.save(update_fields=['is_verified'])


@admin.register(Availability)
class AvailabilityAdmin(admin.ModelAdmin):
    list_display = ['caregiver', 'day', 'start_time', 'end_time']
