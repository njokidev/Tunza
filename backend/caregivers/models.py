from django.core.validators import RegexValidator
from django.db import models
from accounts.models import User
import uuid

# Kenyan national ID numbers: 7 or 8 digits (older IDs are 7).
KENYAN_ID_REGEX = r'^\d{7,8}$'
validate_kenyan_id = RegexValidator(KENYAN_ID_REGEX, 'Enter a valid ID number: 7 or 8 digits, numbers only.')

# Care types that only verified nurses (nursing or CNA certificate checked by Tunza) can take.
NURSE_ONLY_CARE_TYPES = {'medication administration'}


def requires_nurse(care_types):
    return any((t or '').strip().lower() in NURSE_ONLY_CARE_TYPES for t in (care_types or []))


class Specialization(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name


class CaregiverProfile(models.Model):
    class ExperienceLevel(models.TextChoices):
        JUNIOR = 'junior', 'Junior (0-2 yrs)'
        MID    = 'mid',    'Mid (2-5 yrs)'
        SENIOR = 'senior', 'Senior (5+ yrs)'

    id              = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user            = models.OneToOneField(User, on_delete=models.CASCADE, related_name='caregiver_profile')
    bio             = models.TextField(blank=True)
    specializations = models.ManyToManyField(Specialization, blank=True)
    experience      = models.CharField(max_length=20, choices=ExperienceLevel.choices, default=ExperienceLevel.JUNIOR)
    hourly_rate     = models.DecimalField(max_digits=8, decimal_places=2, default=500)  # KES
    years_exp       = models.PositiveIntegerField(default=0)
    id_number       = models.CharField(max_length=20, blank=True, validators=[validate_kenyan_id])  # national ID
    certificate     = models.FileField(upload_to='certificates/', blank=True, null=True)
    is_available    = models.BooleanField(default=True)
    rating_avg      = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    rating_count    = models.PositiveIntegerField(default=0)
    location_name   = models.CharField(max_length=200, blank=True)       # human-readable area (home base)
    work_areas      = models.JSONField(default=list, blank=True)          # every area they'll take jobs in
    languages       = models.JSONField(default=list, blank=True)          # e.g. ["English", "Kiswahili"]

    class Gender(models.TextChoices):
        FEMALE = 'female', 'Female'
        MALE   = 'male',   'Male'

    gender          = models.CharField(max_length=10, choices=Gender.choices, blank=True)
    # Optional flat prices per shift, alongside the hourly rate (KES)
    day_shift_rate   = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)   # 12-hour day
    night_shift_rate = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)   # overnight
    # M-Pesa number payouts go to, if different from the account phone (2547XXXXXXXX)
    payout_phone    = models.CharField(max_length=12, blank=True)
    latitude        = models.FloatField(null=True, blank=True)
    longitude       = models.FloatField(null=True, blank=True)
    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)

    # ── Verification (background check) ──
    class VerificationStatus(models.TextChoices):
        NOT_SUBMITTED = 'not_submitted', 'Not submitted'
        PENDING       = 'pending',       'Under review'
        APPROVED      = 'approved',      'Approved'
        REJECTED      = 'rejected',      'Rejected'

    verification_status       = models.CharField(max_length=20, choices=VerificationStatus.choices,
                                                 default=VerificationStatus.NOT_SUBMITTED)
    verification_submitted_at = models.DateTimeField(null=True, blank=True)
    verification_note         = models.TextField(blank=True)   # reason shown to the caregiver if rejected
    # Set by an admin after checking a nursing / CNA certificate. Unlocks medication administration jobs.
    nurse_verified            = models.BooleanField(default=False)

    class Meta:
        ordering = ['-rating_avg']

    def __str__(self):
        return f'{self.user.full_name} — Caregiver'

    @property
    def payout_number(self):
        return self.payout_phone or self.user.phone or ''

    def update_rating(self):
        from ratings.models import Review
        reviews = Review.objects.filter(caregiver=self)
        count = reviews.count()
        if count:
            avg = reviews.aggregate(models.Avg('score'))['score__avg']
            self.rating_avg   = round(avg, 2)
            self.rating_count = count
            self.save(update_fields=['rating_avg', 'rating_count'])


def _document_path(instance, filename):
    return f'verification/{instance.caregiver_id}/{instance.doc_type}/{uuid.uuid4().hex}_{filename}'


class CaregiverDocument(models.Model):
    """A verification document. Stored privately on Cloudinary in production
    (see caregivers/documents.py); falls back to local media in development."""
    class DocType(models.TextChoices):
        ID_FRONT     = 'id_front',     'National ID (front)'
        ID_BACK      = 'id_back',      'National ID (back)'
        GOOD_CONDUCT = 'good_conduct', 'Certificate of Good Conduct'
        NURSING      = 'nursing',      'Nursing licence (NCK) or certificate'
        CNA          = 'cna',          'Certified Nurse Assistant certificate'
        OTHER        = 'other',        'Other certificate'

    id                = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    caregiver         = models.ForeignKey(CaregiverProfile, on_delete=models.CASCADE, related_name='documents')
    doc_type          = models.CharField(max_length=20, choices=DocType.choices)
    original_name     = models.CharField(max_length=255, blank=True)
    file              = models.FileField(upload_to=_document_path, blank=True, null=True)  # local fallback
    cloud_public_id   = models.CharField(max_length=255, blank=True)
    cloud_resource    = models.CharField(max_length=20, blank=True)   # image | raw
    cloud_format      = models.CharField(max_length=20, blank=True)
    uploaded_at       = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['doc_type', 'uploaded_at']

    def __str__(self):
        return f'{self.get_doc_type_display()} — {self.caregiver.user.full_name}'


class Availability(models.Model):
    class Day(models.IntegerChoices):
        MON = 0, 'Monday'
        TUE = 1, 'Tuesday'
        WED = 2, 'Wednesday'
        THU = 3, 'Thursday'
        FRI = 4, 'Friday'
        SAT = 5, 'Saturday'
        SUN = 6, 'Sunday'

    caregiver  = models.ForeignKey(CaregiverProfile, on_delete=models.CASCADE, related_name='availability')
    day        = models.IntegerField(choices=Day.choices)
    start_time = models.TimeField()
    end_time   = models.TimeField()

    class Meta:
        unique_together = ('caregiver', 'day')
        ordering = ['day']
