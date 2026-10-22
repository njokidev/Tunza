from django.db import models
from accounts.models import User
from caregivers.models import CaregiverProfile
import uuid


class Booking(models.Model):
    class Status(models.TextChoices):
        PENDING   = 'pending',   'Pending'
        ACCEPTED  = 'accepted',  'Accepted'
        REJECTED  = 'rejected',  'Rejected'
        CANCELLED = 'cancelled', 'Cancelled'
        ONGOING   = 'ongoing',   'Ongoing'
        COMPLETED = 'completed', 'Completed'

    class CareType(models.TextChoices):
        PALLIATIVE = 'palliative', 'Palliative Care'
        LONGTERM   = 'longterm',   'Long-term Care'
        DAYCARE    = 'daycare',    'Day Care'
        OVERNIGHT  = 'overnight',  'Overnight Care'
        POSTOP     = 'postop',     'Post-operative Care'

    id            = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient       = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bookings')
    caregiver     = models.ForeignKey(CaregiverProfile, on_delete=models.CASCADE, related_name='bookings')
    care_type     = models.CharField(max_length=30, choices=CareType.choices)
    status        = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    start_date    = models.DateTimeField()
    end_date      = models.DateTimeField()
    address       = models.TextField()
    latitude      = models.FloatField(null=True, blank=True)
    longitude     = models.FloatField(null=True, blank=True)
    special_needs = models.TextField(blank=True)
    total_amount  = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    care_request  = models.ForeignKey('care_requests.CareRequest', on_delete=models.SET_NULL,
                                      null=True, blank=True, related_name='bookings')
    decline_reason = models.CharField(max_length=200, blank=True)
    accepted_at   = models.DateTimeField(null=True, blank=True)
    completed_at  = models.DateTimeField(null=True, blank=True)
    # GPS check-in (start) / check-out (end): where the caregiver's phone was
    check_in_at        = models.DateTimeField(null=True, blank=True)
    check_in_latitude  = models.FloatField(null=True, blank=True)
    check_in_longitude = models.FloatField(null=True, blank=True)
    check_in_distance_m = models.PositiveIntegerField(null=True, blank=True)   # from the care address
    check_out_at        = models.DateTimeField(null=True, blank=True)
    check_out_latitude  = models.FloatField(null=True, blank=True)
    check_out_longitude = models.FloatField(null=True, blank=True)
    check_out_distance_m = models.PositiveIntegerField(null=True, blank=True)
    is_paid       = models.BooleanField(default=False)
    notes         = models.TextField(blank=True)
    created_at    = models.DateTimeField(auto_now_add=True)
    updated_at    = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Booking {self.id} — {self.patient.full_name} → {self.caregiver.user.full_name}'

    def calculate_amount(self):
        """Hourly by default; a caregiver's shift price is used when the visit is a shift:
        overnight care with a night rate, or a 10+ hour day with a day rate."""
        from decimal import Decimal
        cg = self.caregiver
        duration_hours = (self.end_date - self.start_date).total_seconds() / 3600
        if self.care_type == self.CareType.OVERNIGHT and cg.night_shift_rate:
            nights = max(1, round(duration_hours / 12))
            amount = cg.night_shift_rate * nights
        elif duration_hours >= 10 and cg.day_shift_rate:
            days = max(1, round(duration_hours / 12))
            amount = cg.day_shift_rate * days
        else:
            amount = Decimal(str(duration_hours)) * cg.hourly_rate
        self.total_amount = Decimal(amount).quantize(Decimal('0.01'))
        self.save(update_fields=['total_amount'])
        return self.total_amount
