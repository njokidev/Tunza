"""
Onboarding: phone format + uniqueness, OTP verification, phone login, password
reset by OTP, rate limits, terms consent, home location and care recipients.

Run with:  python manage.py test accounts
"""
from datetime import timedelta
from unittest import mock

from django.core.cache import cache
from django.test import override_settings
from django.utils import timezone
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.test import APITestCase

from accounts.models import CareRecipient, PhoneOTP, User
from accounts.phone import normalize_ke_phone

REG = {'email': 'wanjiru@t.ke', 'full_name': 'Wanjiru Kamau', 'phone': '0712 345 678', 'role': 'patient',
       'password': 'Tunza!2026x', 'password2': 'Tunza!2026x', 'accept_terms': True}


class PhoneFormatTests(APITestCase):
    def test_normalize(self):
        for raw in ['0712345678', '+254 712 345 678', '254712345678', '712345678', '0712-345-678']:
            self.assertEqual(normalize_ke_phone(raw), '254712345678', raw)
        self.assertEqual(normalize_ke_phone('0110123456'), '254110123456')
        for bad in ['0201234567', '12345', '25471234567', '+1 415 555 0100', '']:
            self.assertIsNone(normalize_ke_phone(bad), bad)


class RegisterTests(APITestCase):
    def setUp(self):
        cache.clear()

    def test_register_stores_normalised_phone_and_consent(self):
        r = self.client.post('/api/auth/register/', REG, format='json')
        self.assertEqual(r.status_code, 201, r.data)
        u = User.objects.get(email='wanjiru@t.ke')
        self.assertEqual(u.phone, '254712345678')
        self.assertIsNotNone(u.terms_accepted_at)
        self.assertEqual(u.terms_version, '2026-10')
        self.assertFalse(u.phone_verified)

    def test_terms_required(self):
        r = self.client.post('/api/auth/register/', {**REG, 'accept_terms': False}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('accept_terms', r.data)

    def test_phone_unique_and_valid(self):
        self.client.post('/api/auth/register/', REG, format='json')
        r = self.client.post('/api/auth/register/', {**REG, 'email': 'other@t.ke', 'phone': '+254712345678'}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('already used', str(r.data['phone']))
        r = self.client.post('/api/auth/register/', {**REG, 'email': 'x@t.ke', 'phone': '020 123 4567'}, format='json')
        self.assertIn('Kenyan mobile', str(r.data['phone']))

    def test_login_with_phone_or_email(self):
        self.client.post('/api/auth/register/', REG, format='json')
        for ident in ['0712345678', '+254 712 345 678', 'WANJIRU@t.ke']:
            r = self.client.post('/api/auth/login/', {'email': ident, 'password': REG['password']}, format='json')
            self.assertEqual(r.status_code, 200, (ident, r.data))
            self.assertIn('access', r.data)
        r = self.client.post('/api/auth/login/', {'identifier': '0712345678', 'password': REG['password']}, format='json')
        self.assertEqual(r.status_code, 200)
        r = self.client.post('/api/auth/login/', {'email': '0799999999', 'password': REG['password']}, format='json')
        self.assertEqual(r.status_code, 401)

    def test_login_rate_limited(self):
        with mock.patch.dict(ScopedRateThrottle.THROTTLE_RATES, {'login': '3/min'}):
            codes = [self.client.post('/api/auth/login/', {'email': 'a@t.ke', 'password': 'x'}, format='json').status_code
                     for _ in range(4)]
        self.assertEqual(codes[-1], 429)


@override_settings(DEBUG=True, AT_API_KEY='')  # codes come back in the response for testing
class OTPTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(email='a@t.ke', password='Tunza!2026x', full_name='A B',
                                             phone='254712345678', role='patient')
        self.client.force_authenticate(self.user)

    def send(self):
        return self.client.post('/api/auth/phone/send-code/')

    def test_verify_flow(self):
        r = self.send()
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(r.data['phone'], '+254 7•• ••• 678')
        code = r.data['dev_code']
        self.assertEqual(len(code), 6)
        r = self.client.post('/api/auth/phone/verify/', {'code': '000000' if code != '000000' else '111111'})
        self.assertEqual(r.status_code, 400)
        self.assertIn('2 tries left', r.data['detail'])
        r = self.client.post('/api/auth/phone/verify/', {'code': code})
        self.assertEqual(r.status_code, 200, r.data)
        self.assertTrue(r.data['phone_verified'])

    def test_three_wrong_tries_locks_code(self):
        code = self.send().data['dev_code']
        wrong = '000000' if code != '000000' else '111111'
        for _ in range(3):
            r = self.client.post('/api/auth/phone/verify/', {'code': wrong})
        self.assertEqual(r.data['code'], 'locked')
        r = self.client.post('/api/auth/phone/verify/', {'code': code})
        self.assertEqual(r.data['code'], 'no_code')

    def test_code_expires_after_5_minutes(self):
        code = self.send().data['dev_code']
        PhoneOTP.objects.update(expires_at=timezone.now() - timedelta(seconds=1))
        r = self.client.post('/api/auth/phone/verify/', {'code': code})
        self.assertEqual(r.data['code'], 'expired')

    def test_resend_cooldown(self):
        self.send()
        r = self.send()
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.data['code'], 'too_soon')
        PhoneOTP.objects.update(created_at=timezone.now() - timedelta(minutes=2))
        self.assertEqual(self.send().status_code, 200)

    def test_unverified_phone_blocks_posting_a_request(self):
        r = self.client.post('/api/care-requests/', {
            'care_recipient': 'elderly', 'care_types': ['Elderly Care'],
            'start_date': (timezone.localdate() + timedelta(days=1)).isoformat(),
            'address': 'Hse 1, Karen', 'location_name': 'Karen', 'discovery_path': 'open_request'}, format='json')
        self.assertEqual(r.status_code, 403)
        self.assertEqual(r.data['code'], 'phone_unverified')

    def test_changing_phone_needs_new_verification(self):
        self.user.phone_verified = True
        self.user.save()
        r = self.client.patch('/api/auth/me/', {'phone': '0722000111'}, format='json')
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(r.data['phone'], '254722000111')
        self.assertFalse(r.data['phone_verified'])

    @override_settings(AT_API_KEY='k', AT_USERNAME='sandbox')
    def test_africas_talking_called(self):
        with mock.patch('accounts.sms.requests.post') as post:
            post.return_value.json.return_value = {'SMSMessageData': {'Recipients': [{'statusCode': 101}]}}
            post.return_value.raise_for_status.return_value = None
            r = self.send()
        self.assertEqual(r.status_code, 200, r.data)
        self.assertNotIn('dev_code', r.data)
        url, = post.call_args.args
        self.assertEqual(url, 'https://api.sandbox.africastalking.com/version1/messaging')
        self.assertEqual(post.call_args.kwargs['data']['to'], '+254712345678')


@override_settings(DEBUG=True, AT_API_KEY='')
class PasswordResetTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(email='a@t.ke', password='Old!pass2026', full_name='A B',
                                             phone='254712345678', role='patient')

    def test_reset_by_phone(self):
        r = self.client.post('/api/auth/password/reset/', {'identifier': '0712 345 678'})
        self.assertEqual(r.status_code, 200)
        code = r.data['dev_code']
        r = self.client.post('/api/auth/password/reset/confirm/',
                             {'identifier': '0712345678', 'code': code, 'new_password': 'short'})
        self.assertEqual(r.status_code, 400)
        self.assertIn('new_password', r.data)
        r = self.client.post('/api/auth/password/reset/confirm/',
                             {'identifier': '0712345678', 'code': code, 'new_password': 'New!pass2026'})
        self.assertEqual(r.status_code, 200, r.data)
        r = self.client.post('/api/auth/login/', {'email': '0712345678', 'password': 'New!pass2026'}, format='json')
        self.assertEqual(r.status_code, 200)

    def test_unknown_account_gets_same_answer(self):
        r = self.client.post('/api/auth/password/reset/', {'identifier': '0799000000'})
        self.assertEqual(r.status_code, 200)
        self.assertNotIn('dev_code', r.data)


class FamilyOnboardingTests(APITestCase):
    def setUp(self):
        self.fam = User.objects.create_user(email='f@t.ke', password='x', full_name='Wanjiru Kamau',
                                            phone='254712345678', role='patient', phone_verified=True)
        self.client.force_authenticate(self.fam)

    def test_home_location_recipients_and_completion(self):
        me = self.client.get('/api/auth/me/').data
        self.assertTrue(me['needs_onboarding'])
        r = self.client.patch('/api/auth/me/', {'home_area': 'Kileleshwa', 'home_address': 'Hse 12, Othaya Rd',
                                                'home_latitude': -1.28, 'home_longitude': 36.78}, format='json')
        self.assertEqual(r.status_code, 200, r.data)
        r = self.client.post('/api/auth/recipients/', {'is_self': False, 'name': 'Mama Njeri', 'relationship': 'Mother',
                                                       'age_group': 'elderly', 'care_recipient': 'dementia'}, format='json')
        self.assertEqual(r.status_code, 201, r.data)
        rid = r.data['id']
        r = self.client.post('/api/auth/recipients/', {'is_self': True, 'age_group': 'adult'}, format='json')
        self.assertEqual(r.data['name'], 'Wanjiru Kamau')
        self.assertEqual(len(self.client.get('/api/auth/recipients/').data), 2)
        r = self.client.post('/api/auth/onboarding/complete/')
        self.assertFalse(r.data['needs_onboarding'])

        # a care request can point at the saved recipient…
        r = self.client.post('/api/care-requests/', {
            'recipient': rid, 'care_recipient': 'dementia', 'care_types': ['Dementia Care'],
            'start_date': (timezone.localdate() + timedelta(days=1)).isoformat(),
            'address': 'Hse 12, Kileleshwa', 'location_name': 'Kileleshwa', 'discovery_path': 'open_request'}, format='json')
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(str(r.data['recipient']), rid)

        # …but not at someone else's
        other = User.objects.create_user(email='o@t.ke', password='x', full_name='O', phone='254799000001', role='patient')
        theirs = CareRecipient.objects.create(owner=other, name='X', age_group='child')
        r = self.client.post('/api/care-requests/', {
            'recipient': str(theirs.id), 'care_recipient': 'child', 'care_types': ['Babysitting'],
            'start_date': (timezone.localdate() + timedelta(days=1)).isoformat(),
            'address': 'Hse 12, Kileleshwa', 'location_name': 'Kileleshwa', 'discovery_path': 'open_request'}, format='json')
        self.assertEqual(r.status_code, 400)

    def test_caregivers_never_need_family_onboarding(self):
        cg = User.objects.create_user(email='c@t.ke', password='x', full_name='C', phone='254799000002', role='caregiver')
        self.client.force_authenticate(cg)
        self.assertFalse(self.client.get('/api/auth/me/').data['needs_onboarding'])
        self.assertEqual(self.client.get('/api/auth/recipients/').status_code, 403)
