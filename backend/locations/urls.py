from django.urls import path
from . import views

urlpatterns = [
    path('update/',                       views.UpdateLocationView.as_view(),     name='update_location'),
    path('booking/<uuid:booking_id>/',    views.GetCaregiverLocationView.as_view(), name='caregiver_location'),
]
