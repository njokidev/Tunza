from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.db import models
import uuid


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra):
        if not email:
            raise ValueError('Email is required')
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
    # optional phone number , may be blank
    phone        = models.CharField(max_length=20, blank=True)
    # role determines permissions and behaviours in the app , default role is patient
    role         = models.CharField(max_length=20, choices=Role.choices, default=Role.PATIENT)
    # profile picture
    avatar       = models.ImageField(upload_to='avatars/', blank=True, null=True)

    is_active    = models.BooleanField(default=True)
    is_staff     = models.BooleanField(default=False)
    is_verified  = models.BooleanField(default=False)
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
