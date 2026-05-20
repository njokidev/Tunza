from django.db import models
from accounts.models import User
from caregivers.models import CaregiverProfile
import uuid

class Review(models.Model):
    id        = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    caregiver = models.ForeignKey(CaregiverProfile, on_delete=models.CASCADE, related_name='reviews')
    patient   = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews')
    booking   = models.OneToOneField('bookings.Booking', on_delete=models.CASCADE, related_name='review')
    score     = models.PositiveSmallIntegerField()   # 1–5
    comment   = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.caregiver.update_rating()
