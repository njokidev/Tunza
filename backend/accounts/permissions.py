from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'admin'


class IsPatient(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'patient'


class IsCaregiver(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'caregiver'


class IsAdminOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        from rest_framework.permissions import SAFE_METHODS
        if request.method in SAFE_METHODS:
            return request.user.is_authenticated
        return request.user.is_authenticated and request.user.role == 'admin'


class PhoneVerified(BasePermission):
    """Booking, posting a request, applying and uploading documents need a verified phone
    (when phone verification is switched on — see accounts/otp.py)."""
    message = {'detail': 'Verify your phone number first.', 'code': 'phone_unverified'}

    def has_permission(self, request, view):
        from .otp import phone_verification_required
        if request.method in ('GET', 'HEAD', 'OPTIONS'):
            return True
        u = request.user
        return bool(u and u.is_authenticated and (u.phone_verified or u.role == 'admin' or not phone_verification_required()))
