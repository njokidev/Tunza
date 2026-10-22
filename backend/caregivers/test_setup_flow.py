"""
New caregivers: documents -> work areas -> availability, in that order.
/api/auth/me/ tells the apps which screen is next (caregiver_setup.next).
"""
from rest_framework.test import APITestCase

from accounts.models import User
from caregivers.models import Availability, CaregiverProfile


class CaregiverSetupTests(APITestCase):
    def setUp(self):
        self.u = User.objects.create_user(email='njeri@t.ke', password='pass12345', full_name='Njeri Test',
                                          role='caregiver', phone='254722000111', phone_verified=True)
        self.cp, _ = CaregiverProfile.objects.get_or_create(user=self.u)
        self.client.force_authenticate(self.u)

    def nxt(self):
        return self.client.get('/api/auth/me/').data['caregiver_setup']['next']

    def test_steps_in_order(self):
        self.assertEqual(self.nxt(), 'documents')
        self.cp.verification_status = 'pending'
        self.cp.save()
        self.assertEqual(self.nxt(), 'areas')
        self.cp.work_areas = ['Kericho Town']
        self.cp.save()
        self.assertEqual(self.nxt(), 'availability')
        Availability.objects.create(caregiver=self.cp, day=0, start_time='08:00', end_time='17:00')
        self.assertIsNone(self.nxt())

    def test_families_have_no_caregiver_setup(self):
        fam = User.objects.create_user(email='fam@t.ke', password='pass12345', full_name='Fam Test',
                                       role='patient', phone='254722000222', phone_verified=True)
        self.client.force_authenticate(fam)
        self.assertIsNone(self.client.get('/api/auth/me/').data['caregiver_setup'])
