from django.urls import path
from . import views

urlpatterns = [
    path('',                views.CaregiverListView.as_view(),       name='caregiver_list'),
    path('<uuid:id>/',      views.CaregiverDetailView.as_view(),     name='caregiver_detail'),
    path('me/',             views.MyCaregiverProfileView.as_view(),  name='my_profile'),
    path('availability/',   views.AvailabilityView.as_view(),        name='availability'),
    path('availability/<int:pk>/', views.AvailabilityView.as_view(), name='availability_delete'),
    path('specializations/', views.SpecializationListView.as_view(), name='specializations'),
]
