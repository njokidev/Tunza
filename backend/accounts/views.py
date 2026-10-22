from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User, Notification
from .serializers import RegisterSerializer, UserSerializer, TunzaTokenSerializer, NotificationSerializer
from .permissions import IsAdmin


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class LoginView(TokenObtainPairView):
    permission_classes = [permissions.AllowAny]
    serializer_class  = TunzaTokenSerializer


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
