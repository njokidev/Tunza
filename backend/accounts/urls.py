from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    path('register/',           views.RegisterView.as_view(),            name='register'),
    path('login/',              views.LoginView.as_view(),               name='login'),
    path('logout/',             views.LogoutView.as_view(),              name='logout'),
    path('token/refresh/',      TokenRefreshView.as_view(),              name='token_refresh'),
    path('me/',                 views.MeView.as_view(),                  name='me'),
    path('users/',              views.UserListView.as_view(),            name='user_list'),
    path('users/<uuid:user_id>/verify/', views.VerifyUserView.as_view(), name='verify_user'),
    path('notifications/',      views.NotificationListView.as_view(),    name='notifications'),
    path('notifications/<uuid:pk>/read/', views.MarkNotificationReadView.as_view(), name='notif_read'),
]
