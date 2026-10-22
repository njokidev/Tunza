from django.urls import path
from rest_framework.routers import SimpleRouter
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

router = SimpleRouter()
router.register('recipients', views.CareRecipientViewSet, basename='care_recipient')

urlpatterns = [
    path('register/',           views.RegisterView.as_view(),            name='register'),
    path('login/',              views.LoginView.as_view(),               name='login'),
    path('logout/',             views.LogoutView.as_view(),              name='logout'),
    path('token/refresh/',      TokenRefreshView.as_view(),              name='token_refresh'),
    path('me/',                 views.MeView.as_view(),                  name='me'),
    path('phone/send-code/',    views.SendPhoneCodeView.as_view(),       name='phone_send_code'),
    path('phone/verify/',       views.VerifyPhoneCodeView.as_view(),     name='phone_verify'),
    path('password/reset/',     views.PasswordResetRequestView.as_view(), name='password_reset'),
    path('password/reset/confirm/', views.PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    path('onboarding/complete/', views.CompleteOnboardingView.as_view(), name='onboarding_complete'),
    path('users/',              views.UserListView.as_view(),            name='user_list'),
    path('users/<uuid:user_id>/verify/', views.VerifyUserView.as_view(), name='verify_user'),
    path('admin/stats/',       views.AdminStatsView.as_view(),          name='admin_stats'),
    path('notifications/',      views.NotificationListView.as_view(),    name='notifications'),
    path('notifications/<uuid:pk>/read/', views.MarkNotificationReadView.as_view(), name='notif_read'),
]

urlpatterns += router.urls
