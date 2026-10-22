from django.urls import path
from . import views
urlpatterns = [
    path('', views.ReviewListCreateView.as_view(), name='reviews'),
    path('family/', views.FamilyReviewCreateView.as_view(), name='family_reviews'),
]
