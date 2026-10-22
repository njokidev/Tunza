"""
Tests for caregiver verification, ID checks, work areas, weekly availability,
nurse-only care types and expired / taken jobs.

Run with:  python manage.py test caregivers
"""
import shutil
import tempfile
from datetime import timedelta
from decimal import Decimal

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from accounts.models import Notification, User
from care_requests.models import CareApplication, CareRequest
from caregivers.models import CaregiverProfile, Specialization

MEDIA = tempfile.mkdtemp()


_phones = iter(range(254700000001, 254799999999))


def make_user(email, role, verified=False):
    # every account needs its own phone number now (unique, 2547XXXXXXXX)
    return User.objects.create_user(email=email, password='pass12345', full_name=email.split('@')[0],
                                    role=role, is_verified=verified, phone=str(next(_phones)), phone_verified=True)


def pdf(name='doc.pdf'):
    return SimpleUploadedFile(name, b'%PDF-1.4 test', content_type='application/pdf')


@override_settings(MEDIA_ROOT=MEDIA, CLOUDINARY_URL='', DEBUG=True)
class VerificationTests(APITestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(MEDIA, ignore_errors=True)

    def setUp(self):
        self.admin = make_user('admin@t.ke', 'admin')
        self.carer = make_user('carer@t.ke', 'caregiver')
        self.client.force_authenticate(self.carer)

    def submit(self, **extra):
        data = {'id_number': '12345678', 'id_front': pdf('front.pdf'), 'id_back': pdf('back.pdf'),
                'good_conduct': pdf('gc.pdf')}
        data.update(extra)
        return self.client.post('/api/caregivers/verification/', data, format='multipart')

    def test_submit_moves_to_pending_and_notifies_admin(self):
        r = self.submit(nursing=pdf('nurse.pdf'))
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data['verification_status'], 'pending')
        self.assertEqual(len(r.data['documents']), 4)
        self.assertEqual(r.data['id_number_masked'], '•••••678')
        self.assertTrue(Notification.objects.filter(user=self.admin, title='New caregiver application').exists())
        # can't resubmit while pending
        self.assertEqual(self.submit().status_code, 400)

    def test_required_documents(self):
        r = self.client.post('/api/caregivers/verification/', {'id_number': '12345678', 'id_front': pdf()},
                             format='multipart')
        self.assertEqual(r.status_code, 400)
        self.assertIn('id_back', r.data)
        self.assertIn('good_conduct', r.data)

    def test_id_number_rules(self):
        for bad in ['123456', '123456789', '12A45678', '']:
            r = self.submit(id_number=bad)
            self.assertEqual(r.status_code, 400, bad)
            self.assertIn('id_number', r.data)
        self.assertEqual(self.submit(id_number='1234567').status_code, 201)  # 7 digits is fine

    def test_duplicate_id_number_rejected(self):
        other = make_user('other@t.ke', 'caregiver')
        CaregiverProfile.objects.create(user=other, id_number='12345678')
        r = self.submit()
        self.assertEqual(r.status_code, 400)
        self.assertIn('already registered', str(r.data['id_number']))

    def test_bad_file_type(self):
        r = self.submit(good_conduct=SimpleUploadedFile('x.exe', b'MZ', content_type='application/octet-stream'))
        self.assertEqual(r.status_code, 400)
        self.assertIn('good_conduct', r.data)

    def test_admin_reject_then_resubmit_then_approve(self):
        self.submit()
        self.client.force_authenticate(self.admin)
        url = f'/api/admin/users/{self.carer.id}/'
        self.assertEqual(self.client.patch(url, {'action': 'reject'}).status_code, 400)  # reason required
        self.client.patch(url, {'action': 'reject', 'reason': 'ID photo is blurry.'})
        p = CaregiverProfile.objects.get(user=self.carer)
        self.assertEqual(p.verification_status, 'rejected')
        self.assertEqual(p.verification_note, 'ID photo is blurry.')

        self.client.force_authenticate(self.carer)
        r = self.submit()
        self.assertEqual(r.status_code, 201)
        self.assertEqual(p.documents.count(), 3)  # old documents replaced

        self.client.force_authenticate(self.admin)
        r = self.client.get('/api/admin/caregivers/?status=pending')
        self.assertEqual(len(r.data['results'][0]['documents']), 3)
        self.assertTrue(r.data['results'][0]['documents'][0]['url'])
        self.client.patch(url, {'action': 'verify'})
        self.carer.refresh_from_db(); p.refresh_from_db()
        self.assertTrue(self.carer.is_verified)
        self.assertEqual(p.verification_status, 'approved')

    @override_settings(DEBUG=False)
    def test_no_uploads_to_local_disk_in_production(self):
        self.assertEqual(self.submit().status_code, 503)


class ProfileTests(APITestCase):
    def setUp(self):
        self.carer = make_user('carer@t.ke', 'caregiver', verified=True)
        self.profile = CaregiverProfile.objects.create(user=self.carer)
        self.client.force_authenticate(self.carer)

    def test_work_areas_deduplicated(self):
        r = self.client.patch('/api/caregivers/me/', {'work_areas': ['Karen', 'karen ', 'Westlands', '']},
                              format='json')
        self.assertEqual(r.status_code, 200, r.data)
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.work_areas, ['Karen', 'Westlands'])

    def test_medication_specialty_needs_nurse_verification(self):
        med = Specialization.objects.get(name='Medication Administration')
        r = self.client.patch('/api/caregivers/me/', {'specialization_ids': [med.id]}, format='json')
        self.assertEqual(r.status_code, 400)
        self.profile.nurse_verified = True
        self.profile.save()
        r = self.client.patch('/api/caregivers/me/', {'specialization_ids': [med.id]}, format='json')
        self.assertEqual(r.status_code, 200)

    def test_replace_week_availability(self):
        slots = [{'day': 0, 'start_time': '08:00', 'end_time': '17:00'},
                 {'day': 5, 'start_time': '20:00', 'end_time': '06:00'}]  # overnight is allowed
        r = self.client.put('/api/caregivers/availability/', {'slots': slots}, format='json')
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(len(r.data), 2)
        r = self.client.put('/api/caregivers/availability/', {'slots': slots[:1]}, format='json')
        self.assertEqual(len(r.data), 1)
        dup = [slots[0], slots[0]]
        self.assertEqual(self.client.put('/api/caregivers/availability/', {'slots': dup}, format='json').status_code, 400)


class OpenJobTests(APITestCase):
    def setUp(self):
        self.family = make_user('family@t.ke', 'patient')
        self.carer = make_user('carer@t.ke', 'caregiver', verified=True)
        self.carer2 = make_user('carer2@t.ke', 'caregiver', verified=True)
        self.cp = CaregiverProfile.objects.create(user=self.carer, hourly_rate=Decimal('500'))
        self.cp2 = CaregiverProfile.objects.create(user=self.carer2, hourly_rate=Decimal('500'))

    def job(self, days=1, care_types=None, **kw):
        return CareRequest.objects.create(
            patient=self.family, care_recipient='elderly', care_types=care_types or ['Elderly Care'],
            start_date=timezone.localdate() + timedelta(days=days), address='Hse 1, Karen',
            location_name='Karen', is_public=True, discovery_path='open_request', **kw)

    def states(self):
        self.client.force_authenticate(self.carer)
        r = self.client.get('/api/care-requests/open/')
        return {str(x['id']): x for x in r.data['results']}

    def test_job_states(self):
        live = self.job()
        expired = self.job(days=-1)
        old = self.job(days=-10)
        taken = self.job(status=CareRequest.Status.BOOKED)
        rows = self.states()
        self.assertEqual(rows[str(live.id)]['job_state'], 'open')
        self.assertTrue(rows[str(live.id)]['can_apply'])
        self.assertEqual(rows[str(expired.id)]['job_state'], 'expired')
        self.assertFalse(rows[str(expired.id)]['can_apply'])
        self.assertEqual(rows[str(taken.id)]['job_state'], 'taken')
        self.assertNotIn(str(old.id), rows)  # long-expired jobs drop off the list

        r = self.client.get('/api/care-requests/open/?state=open')
        self.assertEqual([x['id'] for x in r.data['results']], [str(live.id)])

    def test_cannot_apply_to_expired_or_taken(self):
        self.client.force_authenticate(self.carer)
        r = self.client.post(f'/api/care-requests/{self.job(days=-1).id}/apply/', {})
        self.assertEqual(r.status_code, 409)
        self.assertEqual(r.data['job_state'], 'expired')
        r = self.client.post(f'/api/care-requests/{self.job(status=CareRequest.Status.BOOKED).id}/apply/', {})
        self.assertEqual(r.status_code, 409)
        self.assertIn('taken', r.data['detail'])

    def test_accepting_one_closes_the_others(self):
        cr = self.job()
        a1 = CareApplication.objects.create(care_request=cr, caregiver=self.cp)
        a2 = CareApplication.objects.create(care_request=cr, caregiver=self.cp2)
        self.client.force_authenticate(self.family)
        r = self.client.post(f'/api/care-requests/{cr.id}/applications/{a1.id}/accept/')
        self.assertEqual(r.status_code, 201, r.data)
        a2.refresh_from_db()
        self.assertEqual(a2.status, 'rejected')
        self.assertTrue(Notification.objects.filter(user=self.carer2, title='Job filled').exists())
        # second acceptance fails
        r = self.client.post(f'/api/care-requests/{cr.id}/applications/{a2.id}/accept/')
        self.assertEqual(r.status_code, 400)
        rows = self.states()
        self.assertEqual(rows[str(cr.id)]['job_state'], 'taken')
        self.assertTrue(rows[str(cr.id)]['has_applied'])

    def test_medication_jobs_are_nurse_only(self):
        cr = self.job(care_types=['Medication Administration'])
        rows = self.states()
        self.assertTrue(rows[str(cr.id)]['requires_nurse'])
        self.assertFalse(rows[str(cr.id)]['can_apply'])
        r = self.client.post(f'/api/care-requests/{cr.id}/apply/', {})
        self.assertEqual(r.status_code, 403)
        self.cp.nurse_verified = True
        self.cp.save()
        self.assertEqual(self.client.post(f'/api/care-requests/{cr.id}/apply/', {}).status_code, 201)

    def test_smart_match_only_verified_nurses_for_medication(self):
        self.cp2.nurse_verified = True
        self.cp2.save()
        self.client.force_authenticate(self.family)
        r = self.client.post('/api/care-requests/', {
            'care_recipient': 'elderly', 'care_types': ['Medication Administration'],
            'start_date': (timezone.localdate() + timedelta(days=1)).isoformat(),
            'address': 'Hse 1, Karen', 'location_name': 'Karen', 'discovery_path': 'smart_match',
        }, format='json')
        self.assertEqual(r.status_code, 201, r.data)
        r = self.client.get(f"/api/care-requests/{r.data['id']}/matches/")
        ids = {m['caregiver']['id'] for m in r.data['results']}
        self.assertEqual(ids, {str(self.cp2.id)})

    def test_child_recipient_and_past_start_date(self):
        self.client.force_authenticate(self.family)
        base = {'care_recipient': 'child', 'care_types': ['Babysitting'], 'address': 'Hse 1, Karen',
                'location_name': 'Karen', 'discovery_path': 'open_request'}
        r = self.client.post('/api/care-requests/', {**base, 'start_date': timezone.localdate().isoformat()}, format='json')
        self.assertEqual(r.status_code, 201, r.data)
        r = self.client.post('/api/care-requests/', {**base, 'start_date': (timezone.localdate() - timedelta(days=1)).isoformat()}, format='json')
        self.assertEqual(r.status_code, 400)
