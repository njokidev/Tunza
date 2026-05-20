from django.db import models
from accounts.models import User
import uuid


class LocationUpdate(models.Model):
    """Stores the most-recent GPS ping from a caregiver during an active booking."""
    id        = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    caregiver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='location_updates')
    booking   = models.ForeignKey('bookings.Booking', on_delete=models.CASCADE, related_name='location_updates')
    latitude  = models.FloatField()
    longitude = models.FloatField()
    accuracy  = models.FloatField(null=True, blank=True)  # metres
    timestamp = models.DateTimeField(auto_now=True)

    class Meta:
        get_latest_by = 'timestamp'
        ordering      = ['-timestamp']

    def __str__(self):
        return f'{self.caregiver.full_name} @ ({self.latitude}, {self.longitude})'
