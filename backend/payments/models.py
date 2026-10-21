from django.db import models
from accounts.models import User
import uuid


class Payment(models.Model):
    class Status(models.TextChoices):
        PENDING  = 'pending',  'Pending'
        SUCCESS  = 'success',  'Success'
        FAILED   = 'failed',   'Failed'

    id              = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking         = models.OneToOneField('bookings.Booking', on_delete=models.CASCADE, related_name='payment')
    user            = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payments')
    phone           = models.CharField(max_length=20)
    amount          = models.DecimalField(max_digits=10, decimal_places=2)
    status          = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    checkout_request_id = models.CharField(max_length=100, blank=True)
    mpesa_receipt   = models.CharField(max_length=100, blank=True)
    merchant_request_id = models.CharField(max_length=100, blank=True)
    result_desc     = models.TextField(blank=True)
    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Payment {self.id} — {self.status}'


class Payout(models.Model):
    """
    Money sent to a caregiver for completed visits. Pilot: an admin sends it by
    M-Pesa by hand, then records it here with the M-Pesa reference.
    """
    id             = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    caregiver      = models.ForeignKey('caregivers.CaregiverProfile', on_delete=models.PROTECT, related_name='payouts')
    bookings       = models.ManyToManyField('bookings.Booking', related_name='payouts')
    gross_amount   = models.DecimalField(max_digits=12, decimal_places=2)   # what families paid
    commission     = models.DecimalField(max_digits=12, decimal_places=2)   # Tunza's 12.5%
    amount         = models.DecimalField(max_digits=12, decimal_places=2)   # sent to the caregiver
    phone          = models.CharField(max_length=20)
    mpesa_reference = models.CharField(max_length=40, unique=True)
    note           = models.TextField(blank=True)
    created_by     = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='payouts_recorded')
    created_at     = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Payout {self.mpesa_reference} — KES {self.amount}'
