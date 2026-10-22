from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.db import models
import uuid


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra):
        if not email:
            raise ValueError('Email is required')
        if not extra.get('phone'):
            extra['phone'] = None
        user = self.model(email=self.normalize_email(email), **extra)
        user.set_password(password) #hashes the password
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra):
        #set default role and permission for super user 
        extra.setdefault('role', User.Role.ADMIN)
        extra.setdefault('is_staff', True)
        extra.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra)


class User(AbstractBaseUser, PermissionsMixin):
    class Role(models.TextChoices):
        ADMIN    = 'admin',    'Admin'
        PATIENT  = 'patient',  'Patient'
        CAREGIVER = 'caregiver', 'Caregiver'

    
    # primary key : UUID instead of autoincrement-integer 
    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    # email must be used as the unique login identifier (USERNAME_FIELD), must be unique across all users
    email        = models.EmailField(unique=True)
    # users full name must be required because its in the required fields
    full_name    = models.CharField(max_length=150)
    # Kenyan mobile as 2547XXXXXXXX / 2541XXXXXXXX (see accounts/phone.py) — unique,
    # needed for M-Pesa STK push and OTP. NULL (not '') when missing so unique works.
    phone        = models.CharField(max_length=12, unique=True, null=True, blank=True)
    phone_verified = models.BooleanField(default=False)
    # role determines permissions and behaviours in the app , default role is patient
    role         = models.CharField(max_length=20, choices=Role.choices, default=Role.PATIENT)
    # profile picture
    avatar       = models.ImageField(upload_to='avatars/', blank=True, null=True)

    is_active    = models.BooleanField(default=True)
    is_staff     = models.BooleanField(default=False)
    is_verified  = models.BooleanField(default=False)
    # Terms of Service + Privacy Policy consent (Kenya Data Protection Act needs a record)
    terms_accepted_at = models.DateTimeField(null=True, blank=True)
    terms_version     = models.CharField(max_length=20, blank=True)
    # Family home location — pre-fills care requests and bookings
    home_area      = models.CharField(max_length=120, blank=True)
    home_address   = models.CharField(max_length=255, blank=True)
    home_latitude  = models.FloatField(null=True, blank=True)
    home_longitude = models.FloatField(null=True, blank=True)
    onboarding_completed_at = models.DateTimeField(null=True, blank=True)
    date_joined  = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)

    USERNAME_FIELD  = 'email'
    REQUIRED_FIELDS = ['full_name']
    objects = UserManager()

    class Meta:
        # defaulr ordering , newest users first 
        ordering = ['-date_joined']
    # string representation 
    def __str__(self):
        return f'{self.full_name} ({self.role})'
     
    # check role without comparing strings everywhere
    @property
    def is_admin(self):
        return self.role == self.Role.ADMIN

    @property
    def is_patient(self):
        return self.role == self.Role.PATIENT

    @property
    def is_caregiver(self):
        return self.role == self.Role.CAREGIVER


class Notification(models.Model):
    class Type(models.TextChoices):
        BOOKING  = 'booking',  'Booking'
        MESSAGE  = 'message',  'Message'
        PAYMENT  = 'payment',  'Payment'
        SYSTEM   = 'system',   'System'

    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user       = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title      = models.CharField(max_length=200)
    body       = models.TextField()
    type       = models.CharField(max_length=20, choices=Type.choices, default=Type.SYSTEM)
    is_read    = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']


class PhoneOTP(models.Model):
    """A one-time code sent by SMS. Only a hash of the code is stored."""
    class Purpose(models.TextChoices):
        VERIFY = 'verify', 'Verify phone'
        RESET  = 'reset',  'Reset password'

    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user       = models.ForeignKey(User, on_delete=models.CASCADE, related_name='otps')
    phone      = models.CharField(max_length=12)
    purpose    = models.CharField(max_length=10, choices=Purpose.choices)
    code_hash  = models.CharField(max_length=128)
    attempts   = models.PositiveSmallIntegerField(default=0)
    expires_at = models.DateTimeField()
    used_at    = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']


class CareRecipient(models.Model):
    """Someone a family books care for: the account holder or a relative."""
    class AgeGroup(models.TextChoices):
        CHILD   = 'child',   'Child'
        ADULT   = 'adult',   'Adult'
        ELDERLY = 'elderly', 'Elderly'

    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner        = models.ForeignKey(User, on_delete=models.CASCADE, related_name='care_recipients')
    is_self      = models.BooleanField(default=False)
    name         = models.CharField(max_length=120)
    relationship = models.CharField(max_length=40, blank=True)   # Mother, Son, Spouse…
    age_group    = models.CharField(max_length=10, choices=AgeGroup.choices)
    # What kind of care they usually need — matches CareRequest.CareRecipient values
    care_recipient = models.CharField(max_length=30, blank=True)
    notes        = models.TextField(blank=True)
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-is_self', 'created_at']

    def __str__(self):
        return f'{self.name} ({self.relationship or "self"}) — {self.owner.full_name}'
