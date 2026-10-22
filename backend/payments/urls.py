from django.urls import path
from . import views

urlpatterns = [
    path('status/<uuid:booking_id>/', views.PaymentStatusView.as_view(), name='payment_status'),
    path('wallet/', views.WalletView.as_view(), name='wallet'),
]
