"""
Kenyan phone numbers, stored the way M-Pesa (Daraja STK push) wants them:
12 digits, 254 + 9-digit subscriber number, e.g. 254712345678 / 254110123456.

Accepts what people actually type: 0712 345 678, +254 712 345 678,
254712345678, 712345678, 0110 123 456.
"""
import re

KE_MOBILE = re.compile(r'^254(7\d{8}|1\d{8})$')


def normalize_ke_phone(raw):
    """Return 2547XXXXXXXX / 2541XXXXXXXX, or None if it isn't a Kenyan mobile number."""
    if raw is None:
        return None
    digits = re.sub(r'\D', '', str(raw))
    if digits.startswith('254'):
        n = digits
    elif digits.startswith('0') and len(digits) == 10:
        n = '254' + digits[1:]
    elif len(digits) == 9 and digits[0] in '71':
        n = '254' + digits
    else:
        return None
    return n if KE_MOBILE.match(n) else None


def looks_like_phone(value):
    """True when a login identifier is a phone number rather than an email."""
    return bool(value) and '@' not in value and normalize_ke_phone(value) is not None


def mask_phone(n):
    """254712345678 -> +254 7•• ••• 678 (for 'we sent a code to …')."""
    if not n or len(n) != 12:
        return n or ''
    return f'+254 {n[3]}•• ••• {n[-3:]}'
