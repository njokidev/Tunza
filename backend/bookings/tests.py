"""
End-to-end tests for the booking flow.

Run with:  python manage.py test bookings
"""
from datetime import timedelta
from decimal import Decimal

from django.utils import timezone
from rest_framework.test import APITestCase

from accounts.models import User, Notification
from caregivers.models import CaregiverDocument, CaregiverProfile
from care_requests.models import CareRequest, CareMatch, CareApplication
from bookings.models import Booking


_phones = iter(range(254700000001, 254799999999))


def make_user(email, role, verified=False):
    # every account needs its own phone number now (unique, 2547XXXXXXXX)
    return User.objects.create_user(email=email, password='pass12345', full_name=email.split('@')[0],
                                    role=role, is_verified=verified, phone=str(next(_phones)), phone_verified=True)


class BookingFlowTests(APITestCase):
    def setUp(self):
        self.admin   = make_user('admin@t.ke', 'admin')
        self.family  = make_user('family@t.ke', 'patient')
        self.family2 = make_user('family2@t.ke', 'patient')
        self.carer   = make_user('carer@t.ke', 'caregiver', verified=True)
        self.newbie  = make_user('newbie@t.ke', 'caregiver', verified=False)
        self.cp  = CaregiverProfile.objects.create(user=self.carer, hourly_rate=Decimal('500'))
        self.cp2 = CaregiverProfile.objects.create(user=self.newbie, hourly_rate=Decimal('400'))

    def as_(self, user):
        self.client.force_authenticate(user)

    def book(self, caregiver_id, hours=4, days_ahead=1):
        start = timezone.now() + timedelta(days=days_ahead)
        return self.client.post('/api/bookings/', {
            'caregiver_id': str(caregiver_id), 'care_type': 'daycare',
            'start_date': start.isoformat(), 'end_date': (start + timedelta(hours=hours)).isoformat(),
            'address': 'Kilimani, Nairobi',
        }, format='json')

    def set_status(self, booking_id, new):
        # Starting and finishing a visit need the PIN the family hands over.
        b = Booking.objects.get(id=booking_id)
        pin = {'ongoing': b.start_pin, 'completed': b.end_pin}.get(new)
        data = {'status': new, **({'pin': pin} if pin else {})}
        return self.client.patch(f'/api/bookings/{booking_id}/status/', data, format='json')

    # ── Direct booking ──────────────────────────────────────────────────────
    def test_full_lifecycle(self):
        self.as_(self.family)
        r = self.book(self.cp.id)
        self.assertEqual(r.status_code, 201, r.data)
        bid = r.data['id']
        self.assertEqual(Decimal(r.data['total_amount']), Decimal('2000.00'))

        self.as_(self.carer)
        for s in ['accepted', 'ongoing', 'completed']:
            r = self.set_status(bid, s)
            self.assertEqual(r.status_code, 200, (s, r.data))
        b = Booking.objects.get(id=bid)
        self.assertEqual(b.status, 'completed')
        self.assertTrue(b.is_paid)

        self.as_(self.family)
        r = self.client.post('/api/ratings/', {'booking': bid, 'caregiver': str(self.cp.id), 'score': 5}, format='json')
        self.assertEqual(r.status_code, 201, r.data)

    def test_cannot_book_unverified_caregiver(self):
        self.as_(self.family)
        r = self.book(self.cp2.id)
        self.assertEqual(r.status_code, 400)

    def test_cannot_book_unavailable_caregiver(self):
        self.cp.is_available = False
        self.cp.save()
        self.as_(self.family)
        self.assertEqual(self.book(self.cp.id).status_code, 400)

    def test_cannot_book_in_the_past(self):
        self.as_(self.family)
        self.assertEqual(self.book(self.cp.id, days_ahead=-1).status_code, 400)

    def test_cannot_skip_states(self):
        self.as_(self.family)
        bid = self.book(self.cp.id).data['id']
        self.as_(self.carer)
        r = self.set_status(bid, 'completed')
        self.assertEqual(r.status_code, 400)
        self.assertEqual(sorted(r.data['allowed']), ['accepted', 'rejected'])
        self.assertFalse(Booking.objects.get(id=bid).is_paid)

    def test_family_cannot_cancel_completed(self):
        self.as_(self.family)
        bid = self.book(self.cp.id).data['id']
        self.as_(self.carer)
        for s in ['accepted', 'ongoing', 'completed']:
            self.set_status(bid, s)
        self.as_(self.family)
        self.assertEqual(self.set_status(bid, 'cancelled').status_code, 400)

    def test_family_cancel_notifies_caregiver(self):
        self.as_(self.family)
        bid = self.book(self.cp.id).data['id']
        before = Notification.objects.filter(user=self.carer).count()
        r = self.set_status(bid, 'cancelled')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(Notification.objects.filter(user=self.carer).count(), before + 1)

    def test_other_family_cannot_touch_booking(self):
        self.as_(self.family)
        bid = self.book(self.cp.id).data['id']
        self.as_(self.family2)
        self.assertEqual(self.set_status(bid, 'cancelled').status_code, 404)

    # ── Smart Match and Open Request bookings (previously crashed) ─────────
    def _care_request(self, **kw):
        start = timezone.localdate() + timedelta(days=2)
        defaults = dict(patient=self.family, care_recipient='elderly', care_types=['daycare'],
                        start_date=start, end_date=start + timedelta(days=2), hours_per_day=8,
                        address='Westlands, Nairobi')
        defaults.update(kw)
        return CareRequest.objects.create(**defaults)

    def test_book_from_match(self):
        cr = self._care_request()
        m = CareMatch.objects.create(care_request=cr, caregiver=self.cp, match_score=90)
        self.as_(self.family)
        r = self.client.post(f'/api/care-requests/{cr.id}/matches/{m.id}/book/')
        self.assertEqual(r.status_code, 201, r.data)
        # 3 days x 8 h x KES 500
        self.assertEqual(Decimal(r.data['total_amount']), Decimal('12000.00'))
        cr.refresh_from_db()
        self.assertEqual(cr.status, 'booked')
        # booking twice is refused
        r = self.client.post(f'/api/care-requests/{cr.id}/matches/{m.id}/book/')
        self.assertEqual(r.status_code, 400)

    def test_accept_application_uses_proposed_rate(self):
        cr = self._care_request(is_public=True, discovery_path='open_request',
                                schedule_type='recurring', days_of_week=[0, 2, 4],
                                end_date=None)
        cr.end_date = cr.start_date + timedelta(days=13)
        cr.save()
        self.as_(self.carer)
        r = self.client.post(f'/api/care-requests/{cr.id}/apply/', {'message': 'Hi', 'proposed_rate': '450'}, format='json')
        self.assertEqual(r.status_code, 201, r.data)
        app = CareApplication.objects.get(id=r.data['id'])
        self.as_(self.family)
        r = self.client.post(f'/api/care-requests/{cr.id}/applications/{app.id}/accept/')
        self.assertEqual(r.status_code, 201, r.data)
        # 14-day range, Mon/Wed/Fri only = 6 days x 8 h x KES 450
        self.assertEqual(Decimal(r.data['total_amount']), Decimal('21600.00'))

    def test_unverified_caregiver_cannot_apply(self):
        cr = self._care_request(is_public=True, discovery_path='open_request')
        self.as_(self.newbie)
        r = self.client.post(f'/api/care-requests/{cr.id}/apply/', {'message': 'Hi'}, format='json')
        self.assertEqual(r.status_code, 403)


class PermissionTests(APITestCase):
    def setUp(self):
        self.admin  = make_user('admin@t.ke', 'admin')
        self.family = make_user('family@t.ke', 'patient')
        self.other  = make_user('other@t.ke', 'patient')
        self.carer  = make_user('carer@t.ke', 'caregiver', verified=True)
        self.newbie = make_user('newbie@t.ke', 'caregiver')
        CaregiverProfile.objects.create(user=self.carer)
        CaregiverProfile.objects.create(user=self.newbie)

    def start_chat(self, me, other):
        self.client.force_authenticate(me)
        return self.client.post('/api/messages/start/', {'user_id': str(other.id)}, format='json')

    def test_chat_rules(self):
        self.assertEqual(self.start_chat(self.family, self.carer).status_code, 200)    # family -> verified carer
        self.assertEqual(self.start_chat(self.family, self.other).status_code, 403)    # family -> family
        self.assertEqual(self.start_chat(self.family, self.newbie).status_code, 403)   # family -> unverified carer
        self.assertEqual(self.start_chat(self.carer, self.other).status_code, 403)     # carer -> stranger family
        self.assertEqual(self.start_chat(self.admin, self.other).status_code, 200)     # admin -> anyone

    def test_verify_only_caregivers(self):
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.patch(f'/api/auth/users/{self.family.id}/verify/').status_code, 400)
        url = f'/api/auth/users/{self.newbie.id}/verify/'
        self.assertEqual(self.client.patch(url).data['code'], 'cna_required')   # no CNA certificate yet
        profile, _ = CaregiverProfile.objects.get_or_create(user=self.newbie)
        CaregiverDocument.objects.create(caregiver=profile, doc_type='cna')
        self.assertEqual(self.client.patch(url).status_code, 200)
        self.newbie.refresh_from_db()
        self.assertTrue(self.newbie.is_verified)

    def test_admin_stats(self):
        for i in range(25):
            make_user(f'p{i}@t.ke', 'patient')
        self.client.force_authenticate(self.family)
        self.assertEqual(self.client.get('/api/auth/admin/stats/').status_code, 403)
        self.client.force_authenticate(self.admin)
        r = self.client.get('/api/auth/admin/stats/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['users']['patients'], 27)   # counts beyond the first page of 20
        self.assertEqual(r.data['users']['caregivers_pending'], 1)
