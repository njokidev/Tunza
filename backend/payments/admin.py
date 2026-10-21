from django.contrib import admin
from .models import Payment

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display  = ['booking', 'user', 'amount', 'status', 'mpesa_receipt', 'created_at']
    list_filter   = ['status']
    search_fields = ['user__full_name', 'mpesa_receipt', 'checkout_request_id']


from .models import Payout

@admin.register(Payout)
class PayoutAdmin(admin.ModelAdmin):
    list_display  = ['mpesa_reference', 'caregiver', 'amount', 'created_by', 'created_at']
    search_fields = ['mpesa_reference', 'caregiver__user__full_name']
