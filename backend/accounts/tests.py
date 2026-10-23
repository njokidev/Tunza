"""
Tests for the web admin API (/api/admin/).

Run with:  python manage.py test accounts
"""
from datetime import timedelta
from decimal import Decimal

from django.utils import timezone
from rest_framework.test import APITestCase

from accounts.models import User
from bookings.models import Booking
from caregivers.models import CaregiverDocument, CaregiverProfile
from payments.models import Payout


_phones = iter(range(254700000001, 254799999999))


def make_user(email, role, verified=False):
    # every account needs its own phone number now (unique, 2547XXXXXXXX)
    return User.objects.create_user(email=email, password='pass12345', full_name=email.split('@')[0],
                                    role=role, is_verified=verified, phone=str(next(_phones)), phone_verified=True)


class AdminApiTests(APITestCase):
    def setUp(self):
        self.admin = make_user('admin@t.ke', 'admin')
        self.family = make_user('family@t.ke', 'patient')
        self.carer = make_user('carer@t.ke', 'caregiver', verified=True)
        self.newbie = make_user('newbie@t.ke', 'caregiver')
        self.cp = CaregiverProfile.objects.create(user=self.carer, hourly_rate=Decimal('500'))
        CaregiverProfile.objects.create(user=self.newbie)
        start = timezone.now() - timedelta(days=2)  # past the 24 h earnings hold
        self.done = [Booking.objects.create(
            patient=self.family, caregiver=self.cp, care_type='daycare', status='completed', is_paid=True,
            start_date=start, end_date=start + timedelta(hours=4), address='Kilimani', total_amount=Decimal('2000'),
        ) for _ in range(2)]
        Booking.objects.create(patient=self.family, caregiver=self.cp, care_type='daycare', status='pending',
                               start_date=start + timedelta(days=3), end_date=start + timedelta(days=3, hours=2),
                               address='Kilimani', total_amount=Decimal('1000'))
        self.client.force_authenticate(self.admin)

    def test_non_admin_blocked(self):
        self.client.force_authenticate(self.family)
        for url in ['/api/admin/overview/', '/api/admin/users/', '/api/admin/bookings/',
                    '/api/admin/caregivers/', '/api/admin/payouts/', '/api/admin/payouts/due/']:
            self.assertEqual(self.client.get(url).status_code, 403, url)

    def test_overview(self):
        r = self.client.get('/api/admin/overview/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['bookings']['total'], 3)
        self.assertEqual(r.data['money']['gmv'], '4000.00')
        self.assertEqual(r.data['money']['commission'], '500.00')
        self.assertEqual(r.data['money']['owed_to_caregivers'], '3500.00')
        self.assertEqual(r.data['attention']['caregivers_to_verify'], 1)
        self.assertEqual(len(r.data['daily']), 30)

    def test_verification_queue_and_actions(self):
        r = self.client.get('/api/admin/caregivers/?status=pending')
        self.assertEqual([c['user']['email'] for c in r.data['results']], ['newbie@t.ke'])
        url = f'/api/admin/users/{self.newbie.id}/'
        r = self.client.patch(url, {'action': 'verify'}, format='json')
        self.assertEqual((r.status_code, r.data['code']), (400, 'cna_required'))   # no CNA certificate yet
        CaregiverDocument.objects.create(caregiver=self.newbie.caregiver_profile, doc_type='cna')
        r = self.client.patch(url, {'action': 'verify'}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.data['is_verified'])
        r = self.client.patch(f'/api/admin/users/{self.family.id}/', {'action': 'verify'}, format='json')
        self.assertEqual(r.status_code, 400)
        r = self.client.patch(f'/api/admin/users/{self.family.id}/', {'action': 'suspend', 'reason': 'Test'}, format='json')
        self.assertFalse(r.data['is_active'])
        self.assertEqual(self.client.patch(f'/api/admin/users/{self.admin.id}/', {'action': 'suspend'}, format='json').status_code, 400)

    def test_user_and_booking_filters(self):
        r = self.client.get('/api/admin/users/?role=caregiver')
        self.assertEqual(r.data['count'], 2)
        r = self.client.get('/api/admin/users/?search=family')
        self.assertEqual(r.data['results'][0]['bookings'], 3)
        r = self.client.get('/api/admin/bookings/?status=completed')
        self.assertEqual(r.data['count'], 2)

    def test_payout_flow(self):
        due = self.client.get('/api/admin/payouts/due/').data
        self.assertEqual(len(due), 1)
        self.assertEqual(due[0]['amount'], '3500.00')
        bad = self.client.post('/api/admin/payouts/', {'caregiver_id': str(self.cp.id), 'mpesa_reference': 'x'}, format='json')
        self.assertEqual(bad.status_code, 400)
        r = self.client.post('/api/admin/payouts/', {'caregiver_id': str(self.cp.id), 'mpesa_reference': 'sjk4xy7z2p'}, format='json')
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data['amount'], '3500.00')
        self.assertEqual(r.data['mpesa_reference'], 'SJK4XY7Z2P')
        self.assertEqual(r.data['visits'], 2)
        self.assertEqual(self.client.get('/api/admin/payouts/due/').data, [])
        again = self.client.post('/api/admin/payouts/', {'caregiver_id': str(self.cp.id), 'mpesa_reference': 'ABC1234567'}, format='json')
        self.assertEqual(again.status_code, 400)
        self.assertEqual(Payout.objects.count(), 1)
        r = self.client.get('/api/admin/overview/')
        self.assertEqual(r.data['money']['owed_to_caregivers'], '0.00')
