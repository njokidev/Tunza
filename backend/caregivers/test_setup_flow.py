"""
New caregivers: documents -> verification wait -> profile -> work areas -> availability.
/api/auth/me/ tells the apps which screen is next (caregiver_setup.next).
"""
from django.utils import timezone
from rest_framework.test import APITestCase

from accounts.models import User
from caregivers.models import Availability, CaregiverProfile, Specialization


class CaregiverSetupTests(APITestCase):
    def setUp(self):
        self.u = User.objects.create_user(email='njeri@t.ke', password='pass12345', full_name='Njeri Test',
                                          role='caregiver', phone='254722000111', phone_verified=True)
        self.cp, _ = CaregiverProfile.objects.get_or_create(user=self.u)
        self.spec, _ = Specialization.objects.get_or_create(name='Elderly Care')
        self.client.force_authenticate(self.u)

    def setup(self):
        # A fresh user each time, like a real request (no cached caregiver_profile).
        self.client.force_authenticate(User.objects.get(pk=self.u.pk))
        return self.client.get('/api/auth/me/').data['caregiver_setup']

    def nxt(self):
        return self.setup()['next']

    def approve(self):
        self.cp.verification_status = 'approved'
        self.cp.save()
        self.u.is_verified = True
        self.u.save()

    def good_profile(self, **over):
        data = {'bio': 'Five years caring for elderly clients with dementia in Nakuru and Nairobi.',
                'years_exp': 5, 'hourly_rate': 600, 'specialization_ids': [self.spec.id],
                'languages': ['English', 'Kiswahili'], 'gender': 'female'}
        data.update(over)
        return self.client.post('/api/caregivers/me/setup-profile/', data, format='json')

    def test_steps_in_order(self):
        self.assertEqual(self.nxt(), 'documents')
        self.cp.verification_status = 'pending'
        self.cp.verification_submitted_at = timezone.now()
        self.cp.save()
        s = self.setup()
        self.assertEqual(s['next'], 'verification')
        self.assertIsNotNone(s['verification_expected_by'])
        self.approve()
        self.assertEqual(self.nxt(), 'profile')
        self.assertEqual(self.good_profile().status_code, 200)
        self.assertEqual(self.nxt(), 'areas')
        self.cp.refresh_from_db()
        self.assertEqual(self.cp.experience, 'senior')
        self.cp.work_areas = ['Kericho Town']
        self.cp.save()
        self.assertEqual(self.nxt(), 'availability')
        Availability.objects.create(caregiver=self.cp, day=0, start_time='08:00', end_time='17:00')
        self.assertIsNone(self.nxt())

    def test_rejected_goes_back_to_documents(self):
        self.cp.verification_status = 'rejected'
        self.cp.verification_note = 'ID photo is blurry'
        self.cp.save()
        s = self.setup()
        self.assertEqual(s['next'], 'documents')
        self.assertEqual(s['verification_note'], 'ID photo is blurry')

    def test_profile_step_needs_approval(self):
        self.cp.verification_status = 'pending'
        self.cp.save()
        self.assertEqual(self.good_profile().status_code, 403)

    def test_profile_step_validates(self):
        self.approve()
        r = self.good_profile(bio='Hi', hourly_rate=50, specialization_ids=[], languages=[])
        self.assertEqual(r.status_code, 400)
        for k in ('bio', 'hourly_rate', 'specialization_ids', 'languages'):
            self.assertIn(k, r.data)
        self.assertEqual(self.nxt(), 'profile')

    def test_unverified_later_keeps_app_access(self):
        self.approve()
        self.assertEqual(self.good_profile().status_code, 200)
        self.cp.refresh_from_db()
        self.cp.work_areas = ['Nakuru Town']
        self.cp.save()
        Availability.objects.create(caregiver=self.cp, day=0, start_time='08:00', end_time='17:00')
        self.cp.verification_status = 'pending'   # admin "unverify"
        self.cp.save()
        self.assertIsNone(self.nxt())

    def test_families_have_no_caregiver_setup(self):
        fam = User.objects.create_user(email='fam@t.ke', password='pass12345', full_name='Fam Test',
                                       role='patient', phone='254722000222', phone_verified=True)
        self.client.force_authenticate(fam)
        self.assertIsNone(self.client.get('/api/auth/me/').data['caregiver_setup'])
