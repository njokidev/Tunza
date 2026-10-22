"""
Phone one-time codes: 6 digits, valid 5 minutes, 3 tries, one new code per minute.
"""
import hashlib
import hmac
import secrets
from datetime import timedelta

from django.conf import settings
from django.utils import timezone

from .models import PhoneOTP
from .sms import send_sms, sms_enabled

CODE_TTL = timedelta(minutes=5)
MAX_ATTEMPTS = 3
RESEND_AFTER = timedelta(seconds=60)


class OTPError(Exception):
    def __init__(self, message, code='invalid'):
        super().__init__(message)
        self.message, self.code = message, code


def phone_verification_required():
    """
    Whether accounts must verify their phone before booking / applying.
    Default: on when SMS can actually be sent (AT_API_KEY set) or in DEBUG
    (codes are then returned in the API response for testing). Override with
    PHONE_VERIFICATION_REQUIRED=True/False.
    """
    forced = getattr(settings, 'PHONE_VERIFICATION_REQUIRED', None)
    if forced is not None:
        return forced
    return sms_enabled() or settings.DEBUG


def _hash(code):
    return hmac.new(settings.SECRET_KEY.encode(), code.encode(), hashlib.sha256).hexdigest()


def send_code(user, purpose):
    """Create and text a new code. Returns (otp, dev_code) — dev_code only in DEBUG without SMS."""
    if not user.phone:
        raise OTPError('Add your phone number first.', 'no_phone')
    now = timezone.now()
    last = PhoneOTP.objects.filter(user=user, purpose=purpose).first()
    if last and last.used_at is None and now - last.created_at < RESEND_AFTER:
        wait = int((RESEND_AFTER - (now - last.created_at)).total_seconds()) + 1
        raise OTPError(f'Please wait {wait} seconds before asking for a new code.', 'too_soon')

    code = f'{secrets.randbelow(1_000_000):06d}'
    PhoneOTP.objects.filter(user=user, purpose=purpose, used_at__isnull=True).update(used_at=now)  # old codes stop working
    otp = PhoneOTP.objects.create(user=user, phone=user.phone, purpose=purpose,
                                  code_hash=_hash(code), expires_at=now + CODE_TTL)
    what = 'verification' if purpose == PhoneOTP.Purpose.VERIFY else 'password reset'
    send_sms(user.phone, f'Your Tunza {what} code is {code}. It expires in 5 minutes. Never share this code.')
    dev_code = code if (settings.DEBUG and not sms_enabled()) else None
    return otp, dev_code


def check_code(user, purpose, code):
    """Validate a code; marks it used. Raises OTPError with a user-facing message."""
    otp = PhoneOTP.objects.filter(user=user, purpose=purpose, used_at__isnull=True).first()
    if otp is None:
        raise OTPError('Ask for a new code.', 'no_code')
    if timezone.now() > otp.expires_at:
        otp.used_at = timezone.now()
        otp.save(update_fields=['used_at'])
        raise OTPError('This code has expired. Ask for a new one.', 'expired')
    if otp.phone != user.phone:
        raise OTPError('Your phone number changed. Ask for a new code.', 'no_code')
    otp.attempts += 1
    if not hmac.compare_digest(otp.code_hash, _hash(str(code).strip())):
        if otp.attempts >= MAX_ATTEMPTS:
            otp.used_at = timezone.now()
            otp.save(update_fields=['attempts', 'used_at'])
            raise OTPError('Too many wrong tries. Ask for a new code.', 'locked')
        otp.save(update_fields=['attempts'])
        left = MAX_ATTEMPTS - otp.attempts
        raise OTPError(f'That code is not right. {left} {"try" if left == 1 else "tries"} left.', 'wrong')
    otp.used_at = timezone.now()
    otp.save(update_fields=['attempts', 'used_at'])
    return otp
