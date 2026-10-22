"""
Booking rules shared by every way a booking is created or changed.

- create_booking_from_care_request(): used by Smart Match and Open Request flows
- can_transition(): the one place that decides which status moves are allowed
"""
from datetime import datetime, time, timedelta
from decimal import Decimal

import math

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from .models import Booking

DAY_START = time(8, 0)  # care requests carry dates only; visits start at 08:00 local time

# Which status changes each role may make. Admin may make any change.
TRANSITIONS = {
    'caregiver': {
        Booking.Status.PENDING:  {Booking.Status.ACCEPTED, Booking.Status.REJECTED},
        Booking.Status.ACCEPTED: {Booking.Status.ONGOING, Booking.Status.CANCELLED},
        Booking.Status.ONGOING:  {Booking.Status.COMPLETED},
    },
    'patient': {
        Booking.Status.PENDING:  {Booking.Status.CANCELLED},
        Booking.Status.ACCEPTED: {Booking.Status.CANCELLED},
    },
}


def can_transition(role, current, new):
    if new not in Booking.Status.values or new == current:
        return False
    if role == 'admin':
        return True
    return new in TRANSITIONS.get(role, {}).get(current, set())


def allowed_next(role, current):
    if role == 'admin':
        return [s for s in Booking.Status.values if s != current]
    return sorted(TRANSITIONS.get(role, {}).get(current, set()))


def _care_days(cr):
    """Dates on which care happens: every day in range, or only the chosen weekdays (0 = Monday)."""
    last = cr.end_date or cr.start_date
    if last < cr.start_date:
        last = cr.start_date
    days, d = [], cr.start_date
    while d <= last:
        if not cr.days_of_week or d.weekday() in cr.days_of_week:
            days.append(d)
        d += timedelta(days=1)
    return days or [cr.start_date]


def create_booking_from_care_request(patient, caregiver, care_request, rate=None):
    cr    = care_request
    tz    = timezone.get_current_timezone()
    days  = _care_days(cr)
    hours = max(int(cr.hours_per_day or 8), 1)
    rate  = Decimal(rate) if rate else caregiver.hourly_rate

    start = timezone.make_aware(datetime.combine(days[0], DAY_START), tz)
    end   = timezone.make_aware(datetime.combine(days[-1], DAY_START), tz) + timedelta(hours=hours)

    care_type = next((t for t in (cr.care_types or []) if t in Booking.CareType.values), Booking.CareType.DAYCARE)
    notes = f'From care request {cr.id}: {len(days)} day(s) x {hours} h at KES {rate}/h.'

    return Booking.objects.create(
        patient=patient, caregiver=caregiver, care_type=care_type, care_request=cr,
        start_date=start, end_date=end,
        address=cr.address, latitude=cr.latitude, longitude=cr.longitude,
        special_needs=cr.special_needs, notes=notes,
        total_amount=(rate * len(days) * hours).quantize(Decimal('0.01')),
    )



# ── Auto-decline ─────────────────────────────────────────────────────────────

def reopen_care_request(booking):
    """A booking made from a care request fell through: put the request back in play."""
    from care_requests.models import CareRequest, CareMatch, CareApplication
    cr = booking.care_request
    if not cr or cr.status != CareRequest.Status.BOOKED:
        return
    if cr.bookings.exclude(pk=booking.pk).filter(status__in=['pending', 'accepted', 'ongoing', 'completed']).exists():
        return
    cr.status = CareRequest.Status.OPEN if cr.is_public else CareRequest.Status.MATCHED
    cr.save(update_fields=['status', 'updated_at'])
    CareMatch.objects.filter(care_request=cr, caregiver=booking.caregiver, status='booked').update(status='declined')
    CareApplication.objects.filter(care_request=cr, caregiver=booking.caregiver, status='accepted').update(status='rejected')


def expire_stale_requests():
    """
    Booking requests a caregiver hasn't answered within BOOKING_AUTO_DECLINE_MINUTES
    are declined automatically, so families aren't left waiting. Runs on the way into
    the booking endpoints (no background worker needed) and from
    `python manage.py expire_bookings` if you add a cron job.
    """
    from accounts.models import Notification
    minutes = settings.BOOKING_AUTO_DECLINE_MINUTES
    if minutes <= 0:
        return 0
    cutoff = timezone.now() - timedelta(minutes=minutes)
    n = 0
    with transaction.atomic():
        stale = list(Booking.objects.select_for_update(skip_locked=True)
                     .filter(status=Booking.Status.PENDING, created_at__lt=cutoff)
                     .select_related('patient', 'caregiver__user', 'care_request'))
        for b in stale:
            b.status = Booking.Status.REJECTED
            b.decline_reason = f'No reply within {minutes} minutes'
            b.save(update_fields=['status', 'decline_reason', 'updated_at'])
            reopen_care_request(b)
            Notification.objects.create(
                user=b.patient, type='booking', title='Caregiver did not respond',
                body=(f'{b.caregiver.user.full_name} did not reply within {minutes} minutes, so the request '
                      'was cancelled. You have not been charged — please choose another caregiver.'))
            Notification.objects.create(
                user=b.caregiver.user, type='booking', title='Booking request expired',
                body=(f'A request from {b.patient.full_name} was declined automatically because there was no '
                      f'reply within {minutes} minutes. Turn off "Available" when you can\'t take work.'))
            n += 1
    return n


# ── Contact details ──────────────────────────────────────────────────────────

def contact_unlocked(booking):
    """
    The family's full address and both phone numbers are shared only once the
    visit is paid for. While M-Pesa collection isn't live (MPESA_COLLECTION_LIVE
    off), acceptance by the caregiver unlocks them instead.
    """
    if booking.status in (Booking.Status.REJECTED, Booking.Status.CANCELLED):
        return False
    if booking.is_paid:
        return True
    if not settings.MPESA_COLLECTION_LIVE:
        return booking.status in (Booking.Status.ACCEPTED, Booking.Status.ONGOING, Booking.Status.COMPLETED)
    return False


def area_only(address):
    """'Hse 12, Othaya Rd, Kileleshwa' -> 'Kileleshwa' (the last part)."""
    parts = [p.strip() for p in (address or '').split(',') if p.strip()]
    return parts[-1] if parts else ''


# ── GPS check-in / check-out ─────────────────────────────────────────────────

def metres_between(lat1, lon1, lat2, lon2):
    if None in (lat1, lon1, lat2, lon2):
        return None
    r = 6371000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    a = (math.sin((p2 - p1) / 2) ** 2
         + math.cos(p1) * math.cos(p2) * math.sin(math.radians(lon2 - lon1) / 2) ** 2)
    return int(round(2 * r * math.asin(math.sqrt(a))))


def record_position(booking, kind, lat, lng):
    """kind: 'in' (visit started) or 'out' (visit ended). Returns the distance in metres or None."""
    try:
        lat, lng = float(lat), float(lng)
    except (TypeError, ValueError):
        lat = lng = None
    now = timezone.now()
    d = metres_between(lat, lng, booking.latitude, booking.longitude) if lat is not None else None
    if kind == 'in':
        booking.check_in_at, booking.check_in_latitude, booking.check_in_longitude, booking.check_in_distance_m = now, lat, lng, d
    else:
        booking.check_out_at, booking.check_out_latitude, booking.check_out_longitude, booking.check_out_distance_m = now, lat, lng, d
    return d
