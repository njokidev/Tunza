"""
Booking rules shared by every way a booking is created or changed.

- create_booking_from_care_request(): used by Smart Match and Open Request flows
- can_transition(): the one place that decides which status moves are allowed
"""
from datetime import datetime, time, timedelta
from decimal import Decimal

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
        patient=patient, caregiver=caregiver, care_type=care_type,
        start_date=start, end_date=end,
        address=cr.address, latitude=cr.latitude, longitude=cr.longitude,
        special_needs=cr.special_needs, notes=notes,
        total_amount=(rate * len(days) * hours).quantize(Decimal('0.01')),
    )
