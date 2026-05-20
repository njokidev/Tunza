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
    is_paid       = models.BooleanField(default=False)
    notes         = models.TextField(blank=True)
    created_at    = models.DateTimeField(auto_now_add=True)
    updated_at    = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Booking {self.id} — {self.patient.full_name} → {self.caregiver.user.full_name}'

    def calculate_amount(self):
        duration_hours = (self.end_date - self.start_date).total_seconds() / 3600
        self.total_amount = round(duration_hours * float(self.caregiver.hourly_rate), 2)
        self.save(update_fields=['total_amount'])
        return self.total_amount
