from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from rest_framework import generics, permissions, status, viewsets
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from .models import CareRecipient, PhoneOTP, User, Notification
from .serializers import (
    CareRecipientSerializer, RegisterSerializer, UserSerializer, TunzaTokenSerializer, NotificationSerializer,
)
from .permissions import IsAdmin, IsPatient
from .phone import mask_phone, normalize_ke_phone
from . import otp as otp_service
from .sms import SMSError


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'register'


class LoginView(TokenObtainPairView):
    """Email or phone + password."""
    permission_classes = [permissions.AllowAny]
    serializer_class  = TunzaTokenSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'


def _otp_error(e):
    return Response({'detail': e.message, 'code': e.code}, status=status.HTTP_400_BAD_REQUEST)


class SendPhoneCodeView(APIView):
    """POST — text a 6-digit code to the signed-in user's phone."""
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'otp'

    def post(self, request):
        if request.user.phone_verified:
            return Response({'detail': 'Your phone is already verified.'})
        try:
            _, dev_code = otp_service.send_code(request.user, PhoneOTP.Purpose.VERIFY)
        except otp_service.OTPError as e:
            return _otp_error(e)
        except SMSError as e:
            return Response({'detail': str(e)}, status=status.HTTP_502_BAD_GATEWAY)
        out = {'detail': f'We sent a code to {mask_phone(request.user.phone)}.', 'phone': mask_phone(request.user.phone)}
        if dev_code:
            out['dev_code'] = dev_code  # DEBUG without Africa's Talking only
        return Response(out)


class VerifyPhoneCodeView(APIView):
    """POST {code} — mark the phone verified."""
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'otp_check'

    def post(self, request):
        try:
            otp_service.check_code(request.user, PhoneOTP.Purpose.VERIFY, request.data.get('code', ''))
        except otp_service.OTPError as e:
            return _otp_error(e)
        request.user.phone_verified = True
        request.user.save(update_fields=['phone_verified'])
        return Response(UserSerializer(request.user).data)


def _find_user_for_reset(identifier):
    phone = normalize_ke_phone(identifier)
    if phone:
        return User.objects.filter(phone=phone, is_active=True).first()
    if identifier and '@' in identifier:
        return User.objects.filter(email__iexact=identifier.strip(), is_active=True).first()
    return None


class PasswordResetRequestView(APIView):
    """POST {identifier} (phone or email) — text a reset code to the account's phone."""
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'reset'

    def post(self, request):
        ident = (request.data.get('identifier') or request.data.get('phone') or '').strip()
        if not ident:
            return Response({'detail': 'Enter your phone number or email.'}, status=status.HTTP_400_BAD_REQUEST)
        user = _find_user_for_reset(ident)
        # Same answer whether or not the account exists, so this can't be used to find accounts.
        out = {'detail': 'If a Tunza account uses these details, we have sent a reset code to its phone.'}
        if user and user.phone:
            try:
                _, dev_code = otp_service.send_code(user, PhoneOTP.Purpose.RESET)
                out['phone'] = mask_phone(user.phone)
                if dev_code:
                    out['dev_code'] = dev_code
            except otp_service.OTPError as e:
                if e.code == 'too_soon':
                    return _otp_error(e)
            except SMSError as e:
                return Response({'detail': str(e)}, status=status.HTTP_502_BAD_GATEWAY)
        return Response(out)


class PasswordResetConfirmView(APIView):
    """POST {identifier, code, new_password} — set a new password and sign out other devices."""
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'otp_check'

    def post(self, request):
        ident = (request.data.get('identifier') or request.data.get('phone') or '').strip()
        new_password = request.data.get('new_password') or ''
        user = _find_user_for_reset(ident)
        if not user:
            return Response({'detail': 'That code is not right. Ask for a new one.', 'code': 'wrong'},
                            status=status.HTTP_400_BAD_REQUEST)
        try:
            validate_password(new_password, user)
        except DjangoValidationError as e:
            return Response({'new_password': list(e.messages)}, status=status.HTTP_400_BAD_REQUEST)
        try:
            otp_service.check_code(user, PhoneOTP.Purpose.RESET, request.data.get('code', ''))
        except otp_service.OTPError as e:
            return _otp_error(e)
        user.set_password(new_password)
        user.phone_verified = True  # they just proved they hold the phone
        user.save(update_fields=['password', 'phone_verified'])
        for t in OutstandingToken.objects.filter(user=user):
            BlacklistedToken.objects.get_or_create(token=t)
        return Response({'detail': 'Password changed. Sign in with your new password.'})


class CompleteOnboardingView(APIView):
    """POST — the family finished (or skipped) first-run setup."""
    def post(self, request):
        if not request.user.onboarding_completed_at:
            request.user.onboarding_completed_at = timezone.now()
            request.user.save(update_fields=['onboarding_completed_at'])
        return Response(UserSerializer(request.user).data)


class CareRecipientViewSet(viewsets.ModelViewSet):
    """The people a family books care for (themselves, a parent, a child…)."""
    serializer_class = CareRecipientSerializer
    permission_classes = [IsPatient]
    pagination_class = None

    def get_queryset(self):
        return CareRecipient.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        if serializer.validated_data.get('is_self'):
            CareRecipient.objects.filter(owner=self.request.user, is_self=True).delete()  # only one "me"
        serializer.save(owner=self.request.user)


class LogoutView(APIView):
    def post(self, request):
        try:
            token = RefreshToken(request.data.get('refresh'))
            token.blacklist()
            return Response({'detail': 'Logged out successfully.'})
        except Exception:
            return Response({'detail': 'Invalid token.'}, status=status.HTTP_400_BAD_REQUEST)


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


class UserListView(generics.ListAPIView):
    """Admin only — list all users, filterable by role."""
    serializer_class   = UserSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        qs   = User.objects.all()
        role = self.request.query_params.get('role')
        if role:
            qs = qs.filter(role=role)
        return qs


class VerifyUserView(APIView):
    """Admin can verify a caregiver's credentials."""
    permission_classes = [IsAdmin]

    def patch(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
        if user.role != User.Role.CAREGIVER:
            return Response({'detail': 'Only caregivers are verified.'}, status=status.HTTP_400_BAD_REQUEST)
        user.is_verified = True
        user.save(update_fields=['is_verified'])
        from caregivers.models import CaregiverProfile
        CaregiverProfile.objects.filter(user=user).update(
            verification_status=CaregiverProfile.VerificationStatus.APPROVED, verification_note='')
        Notification.objects.create(
            user=user, title='You are verified',
            body='Your Tunza profile is verified. Families can now find and book you.',
            type='system',
        )
        return Response({'detail': f'{user.full_name} verified.'})


class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)


class MarkNotificationReadView(APIView):
    def patch(self, request, pk):
        try:
            n = Notification.objects.get(pk=pk, user=request.user)
            n.is_read = True
            n.save()
            return Response({'detail': 'Marked as read.'})
        except Notification.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)


class AdminStatsView(APIView):
    """Admin only: platform totals computed on the server, so they cover every record."""
    permission_classes = [IsAdmin]

    def get(self, request):
        from decimal import Decimal
        from django.db.models import Count, Sum
        from bookings.models import Booking

        COMMISSION = Decimal('0.125')
        roles = dict(User.objects.values_list('role').annotate(n=Count('id')))
        by_status = dict(Booking.objects.values_list('status').annotate(n=Count('id')))
        paid = Booking.objects.filter(is_paid=True)
        gmv = paid.aggregate(t=Sum('total_amount'))['t'] or Decimal('0')
        total_bookings = sum(by_status.values())
        decided = by_status.get('accepted', 0) + by_status.get('ongoing', 0) + by_status.get('completed', 0) + by_status.get('rejected', 0)
        accepted = decided - by_status.get('rejected', 0)

        return Response({
            'users': {
                'patients':   roles.get(User.Role.PATIENT, 0),
                'caregivers': roles.get(User.Role.CAREGIVER, 0),
                'admins':     roles.get(User.Role.ADMIN, 0),
                'caregivers_verified': User.objects.filter(role=User.Role.CAREGIVER, is_verified=True).count(),
                'caregivers_pending':  User.objects.filter(role=User.Role.CAREGIVER, is_verified=False).count(),
            },
            'bookings': {
                'total': total_bookings,
                'by_status': {s: by_status.get(s, 0) for s in Booking.Status.values},
                'acceptance_rate': round(accepted / decided, 3) if decided else None,
            },
            'money': {
                'gmv': str(gmv),
                'commission': str((gmv * COMMISSION).quantize(Decimal('0.01'))),
                'caregiver_earnings': str((gmv * (1 - COMMISSION)).quantize(Decimal('0.01'))),
                'paid_bookings': paid.count(),
                'note': 'Pilot: bookings are marked paid on completion; no M-Pesa collection yet.',
            },
        })
