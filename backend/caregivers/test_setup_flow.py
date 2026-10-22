"""
New caregivers: documents -> profile -> work areas -> availability (the background check runs alongside).
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
        # The background check doesn't block: profile setup comes straight after documents.
        s = self.setup()
        self.assertEqual(s['next'], 'profile')
        self.assertFalse(s['verified'])
        self.assertIsNotNone(s['verification_expected_by'])
        self.assertEqual(self.good_profile().status_code, 200)
        self.assertEqual(self.nxt(), 'areas')
        self.cp.refresh_from_db()
        self.assertEqual(self.cp.experience, 'senior')
        self.cp.work_areas = ['Kericho Town']
        self.cp.save()
        self.assertEqual(self.nxt(), 'availability')
        Availability.objects.create(caregiver=self.cp, day=0, start_time='08:00', end_time='17:00')
        self.assertIsNone(self.nxt())   # app opens, still unverified
        self.approve()
        self.assertTrue(self.setup()['verified'])

    def test_rejected_goes_back_to_documents(self):
        self.cp.verification_status = 'rejected'
        self.cp.verification_note = 'ID photo is blurry'
        self.cp.save()
        s = self.setup()
        self.assertEqual(s['next'], 'documents')
        self.assertEqual(s['verification_note'], 'ID photo is blurry')

    def test_profile_step_needs_documents(self):
        self.assertEqual(self.good_profile().status_code, 403)
        self.cp.verification_status = 'pending'
        self.cp.save()
        self.assertEqual(self.good_profile().status_code, 200)

    def test_profile_step_validates(self):
        self.approve()
        r = self.good_profile(bio='Hi', hourly_rate=50, specialization_ids=[], languages=[])
        self.assertEqual(r.status_code, 400)
        for k in ('bio', 'hourly_rate', 'specialization_ids', 'languages'):
            self.assertIn(k, r.data)
        self.assertEqual(self.nxt(), 'profile')

    def test_unverified_caregiver_hidden_from_families(self):
        self.cp.verification_status = 'pending'
        self.cp.save()
        fam = User.objects.create_user(email='fam2@t.ke', password='pass12345', full_name='Fam Two',
                                       role='patient', phone='254722000333', phone_verified=True)
        self.client.force_authenticate(fam)
        ids = [c['id'] for c in self.client.get('/api/caregivers/?verified=false').data.get('results', [])]
        self.assertNotIn(str(self.cp.id), ids)
        self.assertEqual(self.client.get(f'/api/caregivers/{self.cp.id}/').status_code, 404)
        self.client.force_authenticate(self.u)
        self.assertEqual(self.client.get(f'/api/caregivers/{self.cp.id}/').status_code, 200)

    def test_rejected_after_setup_goes_back_to_documents(self):
        self.approve()
        self.good_profile()
        self.cp.refresh_from_db()
        self.cp.verification_status = 'rejected'
        self.cp.save()
        self.u.is_verified = False
        self.u.save()
        self.assertEqual(self.nxt(), 'documents')

    def test_setup_without_documents_still_needs_documents(self):
        # e.g. an old account that set hours before document upload existed
        self.cp.profile_completed_at = timezone.now()
        self.cp.work_areas = ['Kilimani']
        self.cp.save()
        Availability.objects.create(caregiver=self.cp, day=0, start_time='08:00', end_time='17:00')
        self.assertEqual(self.nxt(), 'documents')

    def test_families_have_no_caregiver_setup(self):
        fam = User.objects.create_user(email='fam@t.ke', password='pass12345', full_name='Fam Test',
                                       role='patient', phone='254722000222', phone_verified=True)
        self.client.force_authenticate(fam)
        self.assertIsNone(self.client.get('/api/auth/me/').data['caregiver_setup'])
