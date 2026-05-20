from django.db import models
from accounts.models import User
import uuid


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
    id_number       = models.CharField(max_length=20, blank=True)        # national ID
    certificate     = models.FileField(upload_to='certificates/', blank=True, null=True)
    is_available    = models.BooleanField(default=True)
    rating_avg      = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    rating_count    = models.PositiveIntegerField(default=0)
    location_name   = models.CharField(max_length=200, blank=True)       # human-readable area
    latitude        = models.FloatField(null=True, blank=True)
    longitude       = models.FloatField(null=True, blank=True)
    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-rating_avg']

    def __str__(self):
        return f'{self.user.full_name} — Caregiver'

    def update_rating(self):
        from ratings.models import Review
        reviews = Review.objects.filter(caregiver=self)
        count = reviews.count()
        if count:
            avg = reviews.aggregate(models.Avg('score'))['score__avg']
            self.rating_avg   = round(avg, 2)
            self.rating_count = count
            self.save(update_fields=['rating_avg', 'rating_count'])


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
