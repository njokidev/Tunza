from django.urls import path
from . import views

urlpatterns = [
    path('initiate/',             views.InitiatePaymentView.as_view(),  name='initiate_payment'),
    path('mpesa/callback/',       views.MpesaCallbackView.as_view(),    name='mpesa_callback'),
    path('status/<uuid:booking_id>/', views.PaymentStatusView.as_view(), name='payment_status'),
]
