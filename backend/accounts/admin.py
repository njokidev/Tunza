from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import CareRecipient, Notification, PhoneOTP, User

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display  = ['email', 'full_name', 'phone', 'phone_verified', 'role', 'is_verified', 'is_active', 'date_joined']
    list_filter   = ['role', 'is_verified', 'phone_verified', 'is_active']
    search_fields = ['email', 'full_name', 'phone']
    ordering      = ['-date_joined']
    fieldsets     = (
        (None,          {'fields': ('email', 'password')}),
        ('Personal',    {'fields': ('full_name', 'phone', 'phone_verified', 'avatar')}),
        ('Home',        {'fields': ('home_area', 'home_address', 'home_latitude', 'home_longitude')}),
        ('Role',        {'fields': ('role', 'is_verified')}),
        ('Consent',     {'fields': ('terms_accepted_at', 'terms_version', 'onboarding_completed_at')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
    )
    add_fieldsets = (
        (None, {'classes': ('wide',), 'fields': ('email', 'full_name', 'role', 'password1', 'password2')}),
    )

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['user', 'title', 'type', 'is_read', 'created_at']
    list_filter  = ['type', 'is_read']


@admin.register(CareRecipient)
class CareRecipientAdmin(admin.ModelAdmin):
    list_display  = ['name', 'relationship', 'age_group', 'owner', 'created_at']
    list_filter   = ['age_group']
    search_fields = ['name', 'owner__full_name', 'owner__email']


@admin.register(PhoneOTP)
class PhoneOTPAdmin(admin.ModelAdmin):
    list_display = ['user', 'purpose', 'phone', 'attempts', 'created_at', 'expires_at', 'used_at']
    list_filter  = ['purpose']
    readonly_fields = ['user', 'purpose', 'phone', 'attempts', 'code_hash', 'created_at', 'expires_at', 'used_at']
