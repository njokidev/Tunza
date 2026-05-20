from django.urls import path
from . import views

urlpatterns = [
    path('',              views.BookingListCreateView.as_view(),   name='booking_list'),
    path('<uuid:pk>/',    views.BookingDetailView.as_view(),       name='booking_detail'),
    path('<uuid:pk>/status/', views.UpdateBookingStatusView.as_view(), name='booking_status'),
    path('admin/all/',    views.AdminBookingListView.as_view(),    name='admin_bookings'),
]
