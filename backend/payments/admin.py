from django.contrib import admin
from .models import Payment

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display  = ['booking', 'user', 'amount', 'status', 'mpesa_receipt', 'created_at']
    list_filter   = ['status']
    search_fields = ['user__full_name', 'mpesa_receipt', 'checkout_request_id']
