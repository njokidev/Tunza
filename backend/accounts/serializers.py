from django.conf import settings
from django.utils import timezone
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import CareRecipient, User, Notification
from .phone import looks_like_phone, normalize_ke_phone

PHONE_ERROR = 'Enter a Kenyan mobile number, e.g. 0712 345 678.'


def clean_phone(value, exclude_user=None):
    phone = normalize_ke_phone(value)
    if not phone:
        raise serializers.ValidationError(PHONE_ERROR)
    taken = User.objects.filter(phone=phone)
    if exclude_user is not None:
        taken = taken.exclude(pk=exclude_user.pk)
    if taken.exists():
        raise serializers.ValidationError('This phone number is already used by another Tunza account.')
    return phone


class RegisterSerializer(serializers.ModelSerializer):
    password  = serializers.CharField(write_only=True, min_length=8)
    password2 = serializers.CharField(write_only=True)
    phone     = serializers.CharField()
    accept_terms = serializers.BooleanField(write_only=True)

    class Meta:
        model  = User
        fields = ['email', 'full_name', 'phone', 'role', 'password', 'password2', 'accept_terms']

    def validate_phone(self, value):
        return clean_phone(value)

    def validate_accept_terms(self, value):
        if not value:
            raise serializers.ValidationError('Please accept the Terms of Service and Privacy Policy to continue.')
        return value

    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError({'password': 'Passwords do not match.'})
        if data.get('role') == User.Role.ADMIN:
            raise serializers.ValidationError({'role': 'Cannot self-register as admin.'})
        return data

    def create(self, validated_data):
        validated_data.pop('password2')
        validated_data.pop('accept_terms')
        validated_data['terms_accepted_at'] = timezone.now()
        validated_data['terms_version'] = settings.TERMS_VERSION
        return User.objects.create_user(**validated_data)


class UserSerializer(serializers.ModelSerializer):
    phone_verification_required = serializers.SerializerMethodField()
    needs_onboarding = serializers.SerializerMethodField()
    caregiver_setup = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = ['id', 'email', 'full_name', 'phone', 'phone_verified', 'phone_verification_required',
                  'role', 'avatar', 'is_verified', 'home_area', 'home_address', 'home_latitude',
                  'home_longitude', 'onboarding_completed_at', 'needs_onboarding',
                  'caregiver_setup', 'terms_accepted_at', 'date_joined']
        read_only_fields = ['id', 'email', 'role', 'is_verified', 'phone_verified',
                            'onboarding_completed_at', 'terms_accepted_at', 'date_joined']

    def get_phone_verification_required(self, obj):
        from .otp import phone_verification_required
        return phone_verification_required()

    def get_needs_onboarding(self, obj):
        # Families get a short first-run setup: home area + who the care is for.
        return obj.role == User.Role.PATIENT and obj.onboarding_completed_at is None

    CAREGIVER_STEPS = ('documents', 'profile', 'areas', 'availability')

    def get_caregiver_setup(self, obj):
        """
        New caregivers go through these screens, in order, before the app opens:
          documents     upload ID, good conduct, certificates
          profile       bio, experience, rate, specialties, languages
          areas         where they'll work
          availability  days and hours
        `next` is the first one not done yet, or None when they're through (the apps
        route on it). A rejected application goes back to `documents`.

        The background check (2-3 days) does NOT block the app: once the documents are
        in, caregivers set up their profile and use the app while they wait. Until an
        admin approves them they are hidden from families and can't be booked or apply
        (see caregivers/views.py, bookings/serializers.py, care_requests/views.py).
        `verified` and the verification_* fields let the apps show where the check is.
        """
        if obj.role != User.Role.CAREGIVER:
            return None
        profile = getattr(obj, 'caregiver_profile', None)
        status = profile.verification_status if profile else 'not_submitted'
        if profile is None:
            done = dict.fromkeys(self.CAREGIVER_STEPS, False)
        else:
            done = {
                # Documents must actually be in. A rejected application goes back here.
                'documents': status in ('pending', 'approved'),
                'profile': profile.profile_completed_at is not None,
                'areas': bool(profile.work_areas) or bool(profile.location_name),
                'availability': profile.availability.exists(),
            }
        nxt = next((k for k in self.CAREGIVER_STEPS if not done[k]), None)
        return {
            'next': nxt, **done,
            'verified': status == 'approved' or obj.is_verified,
            'verification_status': status,
            'verification_submitted_at': profile.verification_submitted_at if profile else None,
            'verification_expected_by': profile.verification_expected_by if profile else None,
            'verification_note': profile.verification_note if profile else '',
        }

    def validate_phone(self, value):
        return clean_phone(value, exclude_user=self.instance)

    def update(self, instance, validated_data):
        if 'phone' in validated_data and validated_data['phone'] != instance.phone:
            instance.phone_verified = False  # a new number has to be verified again
        return super().update(instance, validated_data)


class PublicUserSerializer(serializers.ModelSerializer):
    """A user as another user sees them: no phone, email or address."""
    class Meta:
        model  = User
        fields = ['id', 'full_name', 'role', 'avatar', 'is_verified']
        read_only_fields = fields


class TunzaTokenSerializer(TokenObtainPairSerializer):
    """
    Login with email or phone (any Kenyan format) + password. The field is
    still called `email` for older app versions; `identifier` works too.
    Adds user info to the JWT login response.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields[self.username_field].required = False
        self.fields['identifier'] = serializers.CharField(required=False, write_only=True)

    def validate(self, attrs):
        ident = (attrs.pop('identifier', None) or attrs.get(self.username_field) or '').strip()
        if looks_like_phone(ident):
            user = User.objects.filter(phone=normalize_ke_phone(ident)).first()
            ident = user.email if user else f'no-account-{normalize_ke_phone(ident)}@invalid'
        elif '@' in ident:
            # emails are matched case-insensitively
            user = User.objects.filter(email__iexact=ident).first()
            ident = user.email if user else ident
        attrs[self.username_field] = ident
        data = super().validate(attrs)
        data['user'] = UserSerializer(self.user).data
        return data


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Notification
        fields = ['id', 'title', 'body', 'type', 'is_read', 'created_at']
        read_only_fields = ['id', 'created_at']


class CareRecipientSerializer(serializers.ModelSerializer):
    class Meta:
        model  = CareRecipient
        fields = ['id', 'is_self', 'name', 'relationship', 'age_group', 'care_recipient', 'notes', 'created_at']
        read_only_fields = ['id', 'created_at']
        extra_kwargs = {'name': {'required': False, 'allow_blank': True}}

    def validate_care_recipient(self, value):
        from care_requests.models import CareRequest
        if value and value not in CareRequest.CareRecipient.values:
            raise serializers.ValidationError('Unknown care type.')
        return value

    def validate(self, data):
        if data.get('is_self') and not data.get('name'):
            data['name'] = self.context['request'].user.full_name
        if not data.get('name') and not (self.instance and self.instance.name):
            raise serializers.ValidationError({'name': 'Add their name.'})
        return data
