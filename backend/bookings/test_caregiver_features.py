"""
Caregiver features: 30-minute auto-decline, contact details after payment,
GPS check-in/out, wallet, payout number, languages/gender, family ratings,
shift pricing.

Run with:  python manage.py test bookings
"""
from datetime import timedelta
from decimal import Decimal

from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from accounts.models import Notification, User
from bookings.models import Booking
from care_requests.models import CareApplication, CareRequest
from caregivers.models import CaregiverProfile
from payments.models import Payout

_phones = iter(range(254711000001, 254711999999))


def make_user(email, role, verified=False):
    return User.objects.create_user(email=email, password='pass12345', full_name=email.split('@')[0].title() + ' Test',
                                    role=role, is_verified=verified, phone=str(next(_phones)), phone_verified=True)


class Base(APITestCase):
    def setUp(self):
        self.fam = make_user('wanjiru@t.ke', 'patient')
        self.carer = make_user('achieng@t.ke', 'caregiver', verified=True)
        self.cp = CaregiverProfile.objects.create(user=self.carer, hourly_rate=Decimal('500'))

    def booking(self, **kw):
        start = kw.pop('start', timezone.now() + timedelta(days=1))
        hours = kw.pop('hours', 4)
        kw.setdefault('start_pin', '1234')
        kw.setdefault('end_pin', '5678')
        b = Booking.objects.create(patient=self.fam, caregiver=self.cp, care_type=kw.pop('care_type', 'daycare'),
                                   start_date=start, end_date=start + timedelta(hours=hours),
                                   address='Hse 12, Othaya Rd, Kileleshwa', latitude=-1.2806, longitude=36.7836, **kw)
        return b

    def as_(self, u):
        self.client.force_authenticate(u)


class AutoDeclineTests(Base):
    def test_unanswered_request_declined_after_30_minutes(self):
        b = self.booking()
        Booking.objects.filter(pk=b.pk).update(created_at=timezone.now() - timedelta(minutes=31))
        fresh = self.booking()
        self.as_(self.carer)
        self.client.get('/api/bookings/')
        b.refresh_from_db(); fresh.refresh_from_db()
        self.assertEqual(b.status, 'rejected')
        self.assertEqual(b.decline_reason, 'No reply within 30 minutes')
        self.assertEqual(fresh.status, 'pending')
        self.assertTrue(Notification.objects.filter(user=self.fam, title='Caregiver did not respond').exists())
        r = self.client.patch(f'/api/bookings/{b.id}/status/', {'status': 'accepted'}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('declined automatically', r.data['detail'])

    def test_declined_booking_reopens_the_care_request(self):
        cr = CareRequest.objects.create(patient=self.fam, care_recipient='elderly', care_types=['Elderly Care'],
                                        start_date=timezone.localdate() + timedelta(days=2), address='Hse 1, Karen',
                                        location_name='Karen', is_public=True, discovery_path='open_request')
        app = CareApplication.objects.create(care_request=cr, caregiver=self.cp)
        self.as_(self.fam)
        r = self.client.post(f'/api/care-requests/{cr.id}/applications/{app.id}/accept/')
        self.assertEqual(r.status_code, 201, r.data)
        b = Booking.objects.get(care_request=cr)
        Booking.objects.filter(pk=b.pk).update(created_at=timezone.now() - timedelta(minutes=45))
        self.client.get('/api/bookings/')
        cr.refresh_from_db()
        self.assertEqual(cr.status, 'open')
        self.assertEqual(cr.job_state, 'open')


class ContactTests(Base):
    def test_address_and_phone_hidden_until_accepted(self):
        b = self.booking()
        self.as_(self.carer)
        r = self.client.get(f'/api/bookings/{b.id}/')
        self.assertEqual(r.data['address'], 'Kileleshwa')
        self.assertIsNone(r.data['latitude'])
        self.assertFalse(r.data['contact']['unlocked'])
        self.assertNotIn('patient_phone', r.data['contact'])
        self.assertNotIn('phone', r.data['patient'])
        r = self.client.patch(f'/api/bookings/{b.id}/status/', {'status': 'accepted'}, format='json')
        self.assertEqual(r.data['address'], 'Hse 12, Othaya Rd, Kileleshwa')
        self.assertTrue(r.data['contact']['unlocked'])
        self.assertEqual(r.data['contact']['patient_phone'], self.fam.phone)

    @override_settings(MPESA_COLLECTION_LIVE=True)
    def test_with_mpesa_live_only_payment_unlocks(self):
        b = self.booking(status='accepted')
        self.as_(self.carer)
        r = self.client.get(f'/api/bookings/{b.id}/')
        self.assertFalse(r.data['contact']['unlocked'])
        self.assertEqual(r.data['contact']['unlocks_when'], 'paid')
        Booking.objects.filter(pk=b.pk).update(is_paid=True)
        self.assertTrue(self.client.get(f'/api/bookings/{b.id}/').data['contact']['unlocked'])

    def test_open_jobs_never_show_the_street_or_phone(self):
        CareRequest.objects.create(patient=self.fam, care_recipient='elderly', care_types=['Elderly Care'],
                                   start_date=timezone.localdate() + timedelta(days=2), address='Hse 1, Karen Rd, Karen',
                                   location_name='Karen', latitude=-1.319712, longitude=36.707634,
                                   is_public=True, discovery_path='open_request')
        self.as_(self.carer)
        job = self.client.get('/api/care-requests/open/').data['results'][0]
        self.assertNotIn('address', job)
        self.assertNotIn('phone', job['patient'])
        self.assertEqual(job['latitude'], -1.32)

    def test_caregiver_profile_hides_contact_details(self):
        self.as_(self.fam)
        r = self.client.get(f'/api/caregivers/{self.cp.id}/')
        self.assertNotIn('phone', r.data['user'])
        self.assertNotIn('email', r.data['user'])
        self.assertNotIn('payout_phone', r.data)


class GPSTests(Base):
    def test_check_in_and_out_record_distance(self):
        b = self.booking(status='accepted')
        self.as_(self.carer)
        r = self.client.patch(f'/api/bookings/{b.id}/status/',
                              {'status': 'ongoing', 'pin': '1234', 'latitude': -1.2808, 'longitude': 36.7838}, format='json')
        self.assertEqual(r.status_code, 200, r.data)
        self.assertLess(r.data['check_in_distance_m'], 50)
        self.assertFalse(r.data['check_in_flagged'])
        r = self.client.patch(f'/api/bookings/{b.id}/status/',
                              {'status': 'completed', 'pin': '5678', 'latitude': -1.30, 'longitude': 36.80}, format='json')
        self.assertGreater(r.data['check_out_distance_m'], 500)
        self.assertTrue(r.data['check_in_flagged'])
        self.assertIsNotNone(r.data['completed_at'])

    def test_no_location_still_starts_the_visit(self):
        b = self.booking(status='accepted')
        self.as_(self.carer)
        r = self.client.patch(f'/api/bookings/{b.id}/status/', {'status': 'ongoing', 'pin': '1234'}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertIsNotNone(r.data['check_in_at'])
        self.assertIsNone(r.data['check_in_distance_m'])


class WalletTests(Base):
    def test_wallet_buckets(self):
        now = timezone.now()
        old = self.booking(start=now - timedelta(days=3), status='completed', is_paid=True, total_amount=Decimal('2000'),
                           completed_at=now - timedelta(days=3))
        self.booking(start=now - timedelta(hours=5), status='completed', is_paid=True, total_amount=Decimal('1000'),
                     completed_at=now - timedelta(hours=1))
        self.booking(status='accepted', total_amount=Decimal('800'))
        paid = self.booking(start=now - timedelta(days=10), status='completed', is_paid=True, total_amount=Decimal('400'),
                            completed_at=now - timedelta(days=10))
        p = Payout.objects.create(caregiver=self.cp, gross_amount=400, commission=50, amount=350,
                                  phone=self.carer.phone, mpesa_reference='ABC1234567')
        p.bookings.add(paid)
        self.as_(self.carer)
        w = self.client.get('/api/payments/wallet/').data
        self.assertEqual(w['available'], '1750.00')   # 2000 less 12.5%
        self.assertEqual(w['on_hold'], '875.00')      # ended an hour ago
        self.assertEqual(w['upcoming'], '700.00')
        self.assertEqual(w['paid_out'], '350.00')
        self.assertEqual(len(w['payouts']), 1)
        self.assertEqual(w['available_visits'][0]['booking_id'], str(old.id))

    def test_payout_number(self):
        self.as_(self.carer)
        r = self.client.patch('/api/caregivers/me/', {'payout_phone': '0733 111 222'}, format='json')
        self.assertEqual(r.status_code, 200, r.data)
        me = self.client.get('/api/caregivers/me/').data
        self.assertEqual(me['payout_phone'], '254733111222')
        self.assertEqual(me['payout_number'], '254733111222')
        self.assertEqual(self.client.get('/api/payments/wallet/').data['payout_number'], '254733111222')
        r = self.client.patch('/api/caregivers/me/', {'payout_phone': '12345'}, format='json')
        self.assertEqual(r.status_code, 400)


class ProfileExtrasTests(Base):
    def test_languages_gender_and_filters(self):
        self.as_(self.carer)
        r = self.client.patch('/api/caregivers/me/', {'languages': ['English', 'Kiswahili', 'english', 'Luo'],
                                                      'gender': 'female'}, format='json')
        self.assertEqual(r.status_code, 200, r.data)
        self.cp.refresh_from_db()
        self.assertEqual(self.cp.languages, ['English', 'Kiswahili', 'Luo'])
        self.as_(self.fam)
        ids = lambda q: [c['id'] for c in self.client.get('/api/caregivers/' + q).data['results']]
        self.assertEqual(ids('?language=luo'), [str(self.cp.id)])
        self.assertEqual(ids('?language=Somali'), [])
        self.assertEqual(ids('?gender=female'), [str(self.cp.id)])
        self.assertEqual(ids('?gender=male'), [])

    def test_smart_match_respects_preferred_gender(self):
        male = make_user('otieno@t.ke', 'caregiver', verified=True)
        CaregiverProfile.objects.create(user=male, gender='male', hourly_rate=500)
        self.cp.gender = 'female'
        self.cp.save()
        self.as_(self.fam)
        r = self.client.post('/api/care-requests/', {
            'care_recipient': 'elderly', 'care_types': ['Elderly Care'], 'preferred_gender': 'female',
            'start_date': (timezone.localdate() + timedelta(days=1)).isoformat(),
            'address': 'Hse 1, Karen', 'location_name': 'Karen', 'discovery_path': 'smart_match'}, format='json')
        matches = self.client.get(f"/api/care-requests/{r.data['id']}/matches/").data['results']
        self.assertEqual([m['caregiver']['id'] for m in matches], [str(self.cp.id)])


class FamilyRatingTests(Base):
    def test_caregiver_rates_family_once(self):
        b = self.booking(status='completed')
        pending = self.booking(status='accepted')
        self.as_(self.carer)
        self.assertEqual(self.client.post('/api/ratings/family/', {'booking': str(pending.id), 'score': 5}).status_code, 400)
        r = self.client.post('/api/ratings/family/', {'booking': str(b.id), 'score': 4, 'comment': 'Kind family'})
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(self.client.post('/api/ratings/family/', {'booking': str(b.id), 'score': 5}).status_code, 400)
        r = self.client.get(f'/api/bookings/{pending.id}/')
        self.assertEqual(r.data['family_rating'], {'avg': 4.0, 'count': 1})
        # families don't see their own rating on bookings
        self.as_(self.fam)
        self.assertIsNone(self.client.get(f'/api/bookings/{pending.id}/').data['family_rating'])
        self.assertEqual(self.client.post('/api/ratings/family/', {'booking': str(b.id), 'score': 5}).status_code, 403)


class ShiftPricingTests(Base):
    def test_shift_rates_used_for_shifts(self):
        self.cp.day_shift_rate = Decimal('3500')
        self.cp.night_shift_rate = Decimal('3000')
        self.cp.save()
        day = self.booking(hours=12)
        self.assertEqual(day.calculate_amount(), Decimal('3500.00'))
        night = self.booking(hours=12, care_type='overnight')
        self.assertEqual(night.calculate_amount(), Decimal('3000.00'))
        short = self.booking(hours=4)
        self.assertEqual(short.calculate_amount(), Decimal('2000.00'))   # hourly

    def test_shift_rates_on_profile(self):
        self.as_(self.carer)
        r = self.client.patch('/api/caregivers/me/', {'day_shift_rate': '3500', 'night_shift_rate': 0}, format='json')
        self.assertEqual(r.status_code, 200, r.data)
        self.cp.refresh_from_db()
        self.assertEqual(self.cp.day_shift_rate, Decimal('3500'))
        self.assertIsNone(self.cp.night_shift_rate)
