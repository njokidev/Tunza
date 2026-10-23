"""
Admin API for the web admin dashboard. Every view here is admin-only.

Mounted at /api/admin/ (see tunza/urls.py).
"""
from datetime import timedelta
from decimal import Decimal

from django.db import transaction
from django.db.models import Count, F, Q, Sum
from django.db.models.functions import TruncDate
from django.urls import path
from django.utils import timezone
from rest_framework import generics, serializers, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Notification, User
from accounts.permissions import IsAdmin
from bookings.models import Booking
from bookings.serializers import BookingSerializer
from caregivers.models import CaregiverProfile
from caregivers import documents as doc_store
from payments.models import Payout

COMMISSION_RATE = Decimal('0.125')
TWO_DP = Decimal('0.01')


def money(x):
    return str(Decimal(x or 0).quantize(TWO_DP))


class AdminPagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = 'page_size'
    max_page_size = 100


# ── Overview ──────────────────────────────────────────────────────────────────

class OverviewView(APIView):
    """Totals, 30-day trends and the things that need an admin's attention."""
    permission_classes = [IsAdmin]

    def get(self, request):
        now = timezone.now()
        days = max(7, min(int(request.query_params.get('days', 30)), 180))
        since = (now - timedelta(days=days - 1)).replace(hour=0, minute=0, second=0, microsecond=0)

        roles = dict(User.objects.values_list('role').annotate(n=Count('id')))
        by_status = dict(Booking.objects.values_list('status').annotate(n=Count('id')))
        decided = sum(by_status.get(s, 0) for s in ('accepted', 'ongoing', 'completed', 'rejected'))
        accepted = decided - by_status.get('rejected', 0)
        cancelled = by_status.get('cancelled', 0)
        total_bookings = sum(by_status.values())

        paid = Booking.objects.filter(is_paid=True)
        gmv = paid.aggregate(t=Sum('total_amount'))['t'] or Decimal('0')
        paid_out = Payout.objects.aggregate(t=Sum('amount'))['t'] or Decimal('0')
        earned = gmv * (1 - COMMISSION_RATE)

        # repeat families: families with 2+ bookings
        fam = Booking.objects.values('patient').annotate(n=Count('id'))
        families_booked = fam.count()
        repeat = fam.filter(n__gte=2).count()

        # daily series
        def series(qs, field):
            rows = dict(qs.filter(**{f'{field}__gte': since})
                          .annotate(d=TruncDate(field)).values_list('d').annotate(n=Count('id')))
            return rows
        signups_fam = series(User.objects.filter(role='patient'), 'date_joined')
        signups_cg  = series(User.objects.filter(role='caregiver'), 'date_joined')
        bookings_d  = series(Booking.objects.all(), 'created_at')
        gmv_d = dict(paid.filter(end_date__gte=since).annotate(d=TruncDate('end_date'))
                         .values_list('d').annotate(t=Sum('total_amount')))
        daily = []
        for i in range(days):
            d = (since + timedelta(days=i)).date()
            daily.append({
                'date': d.isoformat(),
                'families': signups_fam.get(d, 0),
                'caregivers': signups_cg.get(d, 0),
                'bookings': bookings_d.get(d, 0),
                'gmv': money(gmv_d.get(d, 0)),
            })

        care_types = dict(Booking.objects.values_list('care_type').annotate(n=Count('id')))
        rating = CaregiverProfile.objects.filter(rating_count__gt=0)
        reviews = rating.aggregate(n=Sum('rating_count'))['n'] or 0
        avg_rating = None
        if reviews:
            weighted = sum(float(p.rating_avg) * p.rating_count for p in rating)
            avg_rating = round(weighted / reviews, 2)

        stale = now - timedelta(minutes=30)
        attention = {
            'caregivers_to_verify': User.objects.filter(role='caregiver', is_verified=False, is_active=True).count(),
            'requests_waiting_30m': Booking.objects.filter(status='pending', created_at__lt=stale).count(),
            'late_starts': Booking.objects.filter(status='accepted', start_date__lt=now - timedelta(minutes=15)).count(),
            'overrunning': Booking.objects.filter(status='ongoing', end_date__lt=now - timedelta(hours=1)).count(),
            'payouts_due': _due_queryset().values('caregiver').distinct().count(),
        }

        return Response({
            'users': {
                'families': roles.get('patient', 0),
                'caregivers': roles.get('caregiver', 0),
                'caregivers_verified': User.objects.filter(role='caregiver', is_verified=True).count(),
                'caregivers_pending': User.objects.filter(role='caregiver', is_verified=False).count(),
                'suspended': User.objects.filter(is_active=False).count(),
            },
            'bookings': {
                'total': total_bookings,
                'by_status': {s: by_status.get(s, 0) for s in Booking.Status.values},
                'by_care_type': {c: care_types.get(c, 0) for c in Booking.CareType.values},
                'acceptance_rate': round(accepted / decided, 3) if decided else None,
                'cancellation_rate': round(cancelled / total_bookings, 3) if total_bookings else None,
                'repeat_family_rate': round(repeat / families_booked, 3) if families_booked else None,
            },
            'quality': {'avg_rating': avg_rating, 'reviews': reviews},
            'money': {
                'gmv': money(gmv),
                'commission': money(gmv * COMMISSION_RATE),
                'caregiver_earnings': money(earned),
                'paid_out': money(paid_out),
                'owed_to_caregivers': money(earned - paid_out),
            },
            'attention': attention,
            'daily': daily,
            'pilot_note': 'Bookings are marked paid when a visit is completed; M-Pesa collection is not live yet.',
        })


# ── Caregivers / verification ─────────────────────────────────────────────────

class AdminCaregiverSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()
    specializations = serializers.SlugRelatedField(many=True, read_only=True, slug_field='name')
    certificate = serializers.FileField(read_only=True)
    bookings_total = serializers.IntegerField(read_only=True)
    bookings_completed = serializers.IntegerField(read_only=True)
    documents = serializers.SerializerMethodField()

    class Meta:
        model = CaregiverProfile
        fields = ['id', 'user', 'bio', 'specializations', 'experience', 'years_exp', 'hourly_rate',
                  'id_number', 'certificate', 'is_available', 'location_name', 'work_areas',
                  'rating_avg', 'rating_count', 'bookings_total', 'bookings_completed',
                  'verification_status', 'verification_submitted_at', 'verification_note', 'nurse_verified',
                  'documents', 'created_at']

    def get_documents(self, p):
        # Signed links that expire after 15 minutes — reload the list for fresh ones.
        request = self.context.get('request')
        return [{'id': str(d.id), 'doc_type': d.doc_type, 'label': d.get_doc_type_display(),
                 'original_name': d.original_name, 'uploaded_at': d.uploaded_at,
                 'url': doc_store.document_url(d, request)} for d in p.documents.all()]

    def get_user(self, p):
        u = p.user
        return {'id': str(u.id), 'full_name': u.full_name, 'email': u.email, 'phone': u.phone,
                'is_verified': u.is_verified, 'is_active': u.is_active, 'date_joined': u.date_joined}


class CaregiverListView(generics.ListAPIView):
    permission_classes = [IsAdmin]
    serializer_class = AdminCaregiverSerializer
    pagination_class = AdminPagination

    def get_queryset(self):
        qs = (CaregiverProfile.objects.select_related('user').prefetch_related('specializations', 'documents')
              .annotate(bookings_total=Count('bookings', distinct=True),
                        bookings_completed=Count('bookings', filter=Q(bookings__status='completed'), distinct=True)))
        st = self.request.query_params.get('status')
        if st == 'pending':
            # Submitted applications first (oldest first), then caregivers who haven't uploaded yet.
            qs = qs.filter(user__is_verified=False, user__is_active=True).order_by(
                F('verification_submitted_at').asc(nulls_last=True), 'created_at')
        elif st == 'verified':
            qs = qs.filter(user__is_verified=True, user__is_active=True).order_by('-rating_avg')
        elif st == 'suspended':
            qs = qs.filter(user__is_active=False)
        q = self.request.query_params.get('search', '').strip()
        if q:
            qs = qs.filter(Q(user__full_name__icontains=q) | Q(user__email__icontains=q)
                           | Q(user__phone__icontains=q) | Q(location_name__icontains=q))
        return qs


# ── Users ─────────────────────────────────────────────────────────────────────

class AdminUserSerializer(serializers.ModelSerializer):
    bookings = serializers.IntegerField(source='booking_count', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'full_name', 'phone', 'role', 'is_verified', 'is_active', 'date_joined', 'bookings']


def users_with_counts():
    # families book as `patient`; caregivers through their profile
    return User.objects.annotate(
        booking_count=Count('bookings', distinct=True) + Count('caregiver_profile__bookings', distinct=True))


class UserListView(generics.ListAPIView):
    permission_classes = [IsAdmin]
    serializer_class = AdminUserSerializer
    pagination_class = AdminPagination

    def get_queryset(self):
        qs = users_with_counts()
        p = self.request.query_params
        if p.get('role') in User.Role.values:
            qs = qs.filter(role=p['role'])
        if p.get('active') in ('true', 'false'):
            qs = qs.filter(is_active=p['active'] == 'true')
        q = p.get('search', '').strip()
        if q:
            qs = qs.filter(Q(full_name__icontains=q) | Q(email__icontains=q) | Q(phone__icontains=q))
        return qs.order_by('-date_joined')


class UserActionView(APIView):
    """PATCH {action: verify | reject | unverify | verify_nurse | unverify_nurse | suspend | reactivate, reason?}"""
    permission_classes = [IsAdmin]

    CAREGIVER_ONLY = {'verify', 'reject', 'unverify', 'verify_nurse', 'unverify_nurse'}
    MESSAGES = {
        'verify': ('You are verified', 'Your background check is complete. Families can now find and book you.'),
        'reject': ('Application not approved', 'We could not approve your application. Please check the reason, then upload your documents again.'),
        'unverify': ('Verification removed', 'Your profile is hidden from families while we review it.'),
        'verify_nurse': ('Nursing certificate verified', 'You can now take medication administration jobs. Add it to your specialties.'),
        'unverify_nurse': ('Nursing verification removed', 'You can no longer take medication administration jobs.'),
        'suspend': ('Account suspended', 'Your Tunza account has been suspended.'),
        'reactivate': ('Account reactivated', 'Your Tunza account is active again.'),
    }

    def patch(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=404)
        action = request.data.get('action')
        reason = (request.data.get('reason') or '').strip()
        if action not in self.MESSAGES:
            return Response({'detail': 'Unknown action.'}, status=400)
        if action in self.CAREGIVER_ONLY and user.role != User.Role.CAREGIVER:
            return Response({'detail': 'Only caregivers are verified.'}, status=400)
        if user.role == User.Role.ADMIN or user.id == request.user.id:
            return Response({'detail': 'Admin accounts are managed in Django admin.'}, status=400)
        if action == 'reject' and not reason:
            return Response({'detail': 'Give the caregiver a reason so they know what to fix.'}, status=400)

        VS = CaregiverProfile.VerificationStatus
        profile = None
        if action in self.CAREGIVER_ONLY:
            profile, _ = CaregiverProfile.objects.get_or_create(user=user)

        with transaction.atomic():
            if action == 'verify':
                user.is_verified = True
                profile.verification_status, profile.verification_note = VS.APPROVED, ''
            elif action == 'reject':
                user.is_verified = False
                profile.verification_status, profile.verification_note = VS.REJECTED, reason
            elif action == 'unverify':
                user.is_verified = False
                profile.verification_status = VS.PENDING
            elif action == 'verify_nurse':
                profile.nurse_verified = True
            elif action == 'unverify_nurse':
                profile.nurse_verified = False
                med = profile.specializations.filter(name__iexact='Medication Administration')
                profile.specializations.remove(*med)
            elif action == 'suspend':
                user.is_active = False
            elif action == 'reactivate':
                user.is_active = True
            user.save(update_fields=['is_verified', 'is_active'])
            if profile is not None:
                profile.save(update_fields=['verification_status', 'verification_note', 'nurse_verified'])

        title, body = self.MESSAGES[action]
        if action == 'verify' and profile.profile_completed_at is None:
            # Still onboarding: the next step is setting up the profile families see.
            body = 'Your background check is complete. Open Tunza to set up your profile and start getting jobs.'
        if reason:
            body = f'{body} Reason: {reason}'
        Notification.objects.create(user=user, title=title, body=body, type='system')
        if action in ('verify', 'reject') and user.phone:
            # Caregivers wait 2-3 days for this, usually with the app closed, so text them too.
            from .sms import SMSError, send_sms
            try:
                send_sms(user.phone, f'Tunza: {body}')
            except SMSError:
                pass  # the in-app notification is still there
        return Response(AdminUserSerializer(users_with_counts().get(id=user.id)).data)


# ── Bookings ──────────────────────────────────────────────────────────────────

class BookingListView(generics.ListAPIView):
    permission_classes = [IsAdmin]
    serializer_class = BookingSerializer
    pagination_class = AdminPagination

    def get_queryset(self):
        qs = Booking.objects.select_related('patient', 'caregiver__user').prefetch_related(
            'caregiver__specializations', 'caregiver__availability')
        p = self.request.query_params
        if p.get('status') in Booking.Status.values:
            qs = qs.filter(status=p['status'])
        if p.get('paid') in ('true', 'false'):
            qs = qs.filter(is_paid=p['paid'] == 'true')
        q = p.get('search', '').strip()
        if q:
            qs = qs.filter(Q(patient__full_name__icontains=q) | Q(caregiver__user__full_name__icontains=q)
                           | Q(address__icontains=q))
        return qs.order_by('-created_at')


# ── Payouts ───────────────────────────────────────────────────────────────────

def _due_queryset():
    """Paid, completed bookings not yet covered by a payout and past the earnings hold
    (EARNINGS_HOLD_HOURS) — the same "available" money the caregiver's wallet shows."""
    from django.conf import settings
    cutoff = timezone.now() - timedelta(hours=settings.EARNINGS_HOLD_HOURS)
    return Booking.objects.filter(status='completed', is_paid=True, payouts__isnull=True).filter(
        Q(completed_at__lt=cutoff) | Q(completed_at__isnull=True, end_date__lt=cutoff))


class PayoutsDueView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        rows = (_due_queryset().values('caregiver', 'caregiver__user__full_name', 'caregiver__user__phone', 'caregiver__payout_phone')
                .annotate(visits=Count('id'), gross=Sum('total_amount')).order_by('-gross'))
        out = []
        for r in rows:
            gross = r['gross'] or Decimal('0')
            out.append({
                'caregiver_id': str(r['caregiver']),
                'name': r['caregiver__user__full_name'],
                'phone': r['caregiver__payout_phone'] or r['caregiver__user__phone'],
                'visits': r['visits'],
                'gross': money(gross),
                'commission': money(gross * COMMISSION_RATE),
                'amount': money(gross * (1 - COMMISSION_RATE)),
            })
        return Response(out)


class PayoutSerializer(serializers.ModelSerializer):
    caregiver_name = serializers.CharField(source='caregiver.user.full_name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True, default='')
    visits = serializers.SerializerMethodField()

    class Meta:
        model = Payout
        fields = ['id', 'caregiver', 'caregiver_name', 'gross_amount', 'commission', 'amount', 'phone',
                  'mpesa_reference', 'note', 'visits', 'created_by_name', 'created_at']

    def get_visits(self, obj):
        return obj.bookings.count()


class PayoutListCreateView(generics.ListAPIView):
    """GET: payout history. POST {caregiver_id, mpesa_reference, note?}: record a payout for everything due."""
    permission_classes = [IsAdmin]
    serializer_class = PayoutSerializer
    pagination_class = AdminPagination
    queryset = Payout.objects.select_related('caregiver__user', 'created_by').order_by('-created_at')

    def post(self, request):
        ref = (request.data.get('mpesa_reference') or '').strip().upper()
        if not (6 <= len(ref) <= 40) or not ref.isalnum():
            return Response({'mpesa_reference': 'Enter the M-Pesa confirmation code, e.g. SJK4XY7Z2P.'}, status=400)
        if Payout.objects.filter(mpesa_reference=ref).exists():
            return Response({'mpesa_reference': 'This M-Pesa code is already recorded.'}, status=400)
        try:
            cg = CaregiverProfile.objects.select_related('user').get(id=request.data.get('caregiver_id'))
        except Exception:  # missing, malformed or unknown id
            return Response({'caregiver_id': 'Caregiver not found.'}, status=400)

        with transaction.atomic():
            # Lock only the bookings: "no payout yet" is an outer join Postgres can't lock.
            due = list(_due_queryset().select_for_update(of=('self',)).filter(caregiver=cg))
            if not due:
                return Response({'detail': 'Nothing is due to this caregiver.'}, status=400)
            gross = sum((b.total_amount for b in due), Decimal('0'))
            payout = Payout.objects.create(
                caregiver=cg, gross_amount=gross.quantize(TWO_DP),
                commission=(gross * COMMISSION_RATE).quantize(TWO_DP),
                amount=(gross * (1 - COMMISSION_RATE)).quantize(TWO_DP),
                phone=cg.payout_number, mpesa_reference=ref,
                note=(request.data.get('note') or '').strip(), created_by=request.user,
            )
            payout.bookings.set(due)
        Notification.objects.create(
            user=cg.user, title='Payout sent',
            body=f'KES {payout.amount} for {len(due)} visit(s) was sent to {payout.phone}. M-Pesa ref {ref}.',
            type='payment')
        return Response(PayoutSerializer(payout).data, status=status.HTTP_201_CREATED)


urlpatterns = [
    path('overview/',               OverviewView.as_view(),         name='admin_overview'),
    path('caregivers/',             CaregiverListView.as_view(),    name='admin_caregivers'),
    path('users/',                  UserListView.as_view(),         name='admin_users'),
    path('users/<uuid:user_id>/',   UserActionView.as_view(),       name='admin_user_action'),
    path('bookings/',               BookingListView.as_view(),      name='admin_bookings_list'),
    path('payouts/',                PayoutListCreateView.as_view(), name='admin_payouts'),
    path('payouts/due/',            PayoutsDueView.as_view(),       name='admin_payouts_due'),
]
