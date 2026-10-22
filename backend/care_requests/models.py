from django.db import models
from django.utils import timezone
from accounts.models import User
from caregivers.models import CaregiverProfile
import uuid

class CareRequest(models.Model):
    class Status(models.TextChoices):
        OPEN         = "open",        "Open"
        MATCHED      = "matched",     "Matched"
        SHORTLISTED  = "shortlisted", "Shortlisted"
        BOOKED       = "booked",      "Booked"
        CLOSED       = "closed",      "Closed"
        CANCELLED    = "cancelled",   "Cancelled"

    class ScheduleType(models.TextChoices):
        ONE_TIME  = "one_time",  "One time"
        RECURRING = "recurring", "Recurring"
        LIVE_IN   = "live_in",   "Live-in"

    class CareRecipient(models.TextChoices):
        ELDERLY    = "elderly",    "Elderly parent"
        DEMENTIA   = "dementia",   "Person with dementia"
        CHRONIC    = "chronic",    "Chronic illness"
        SURGERY    = "surgery",    "Post-surgery recovery"
        DISABILITY = "disability", "Person with disability"
        PALLIATIVE = "palliative", "Palliative / end of life"
        CHILD      = "child",      "A child"
        OTHER      = "other",      "Other"

    class DiscoveryPath(models.TextChoices):
        SMART_MATCH   = "smart_match",   "Smart Match"
        BROWSE        = "browse",        "Browse"
        OPEN_REQUEST  = "open_request",  "Open Request"

    id               = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient          = models.ForeignKey(User, on_delete=models.CASCADE, related_name="care_requests")
    care_recipient   = models.CharField(max_length=30, choices=CareRecipient.choices)
    care_types       = models.JSONField(default=list)
    special_needs    = models.TextField(blank=True)
    schedule_type    = models.CharField(max_length=20, choices=ScheduleType.choices, default=ScheduleType.ONE_TIME)
    start_date       = models.DateField()
    end_date         = models.DateField(null=True, blank=True)
    hours_per_day    = models.PositiveSmallIntegerField(default=8)
    days_of_week     = models.JSONField(default=list)
    address          = models.TextField()
    latitude         = models.FloatField(null=True, blank=True)
    longitude        = models.FloatField(null=True, blank=True)
    location_name    = models.CharField(max_length=200, blank=True)
    budget_min       = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    budget_max       = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    preferred_gender = models.CharField(max_length=10, blank=True)
    preferred_language = models.CharField(max_length=50, blank=True)
    discovery_path   = models.CharField(max_length=20, choices=DiscoveryPath.choices, default=DiscoveryPath.SMART_MATCH)
    is_public        = models.BooleanField(default=False)
    status           = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    created_at       = models.DateTimeField(auto_now_add=True)
    updated_at       = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"CareRequest by {self.patient.full_name} [{self.status}]"

    # How a job looks to caregivers browsing open jobs.
    class JobState(models.TextChoices):
        OPEN    = "open",    "Open"
        TAKEN   = "taken",   "Taken by another caregiver"
        EXPIRED = "expired", "Expired"
        CLOSED  = "closed",  "Closed by the family"

    @property
    def job_state(self):
        if self.status == self.Status.BOOKED:
            return self.JobState.TAKEN
        if self.status in (self.Status.CLOSED, self.Status.CANCELLED):
            return self.JobState.CLOSED
        # Still unfilled but the start date has passed — the window to apply is over.
        if self.start_date < timezone.localdate():
            return self.JobState.EXPIRED
        return self.JobState.OPEN


class CareMatch(models.Model):
    class Status(models.TextChoices):
        SUGGESTED   = "suggested",   "Suggested"
        SHORTLISTED = "shortlisted", "Shortlisted"
        DECLINED    = "declined",    "Declined"
        BOOKED      = "booked",      "Booked"

    id            = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    care_request  = models.ForeignKey(CareRequest, on_delete=models.CASCADE, related_name="matches")
    caregiver     = models.ForeignKey(CaregiverProfile, on_delete=models.CASCADE, related_name="matches")
    match_score   = models.FloatField(default=0)
    match_reasons = models.JSONField(default=list)
    status        = models.CharField(max_length=20, choices=Status.choices, default=Status.SUGGESTED)
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering        = ["-match_score"]
        unique_together = ("care_request","caregiver")


class CareApplication(models.Model):
    class Status(models.TextChoices):
        APPLIED     = "applied",     "Applied"
        SHORTLISTED = "shortlisted", "Shortlisted"
        ACCEPTED    = "accepted",    "Accepted"
        REJECTED    = "rejected",    "Rejected"

    id            = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    care_request  = models.ForeignKey(CareRequest, on_delete=models.CASCADE, related_name="applications")
    caregiver     = models.ForeignKey(CaregiverProfile, on_delete=models.CASCADE, related_name="applications")
    message       = models.TextField(blank=True)
    proposed_rate = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    status        = models.CharField(max_length=20, choices=Status.choices, default=Status.APPLIED)
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering        = ["-created_at"]
        unique_together = ("care_request","caregiver")
