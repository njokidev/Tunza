"""
Visit PINs: the family gives the caregiver a start PIN to begin the visit and an
end PIN to finish it (which releases pay).

Run with:  python manage.py test bookings
"""
from bookings.models import Booking
from bookings.test_caregiver_features import Base, make_user
from payments.models import Payment


class VisitPinTests(Base):
    def status(self, b, new, **extra):
        return self.client.patch(f'/api/bookings/{b.id}/status/', {'status': new, **extra}, format='json')

    def test_accepting_issues_two_different_pins(self):
        b = self.booking(status='pending', start_pin='', end_pin='')
        self.as_(self.carer)
        self.assertEqual(self.status(b, 'accepted').status_code, 200)
        b.refresh_from_db()
        self.assertRegex(b.start_pin, r'^\d{4}$')
        self.assertRegex(b.end_pin, r'^\d{4}$')
        self.assertNotEqual(b.start_pin, b.end_pin)
        self.assertIn(b.start_pin, self.fam.notifications.latest('created_at').body)

    def test_family_sees_pin_caregiver_does_not(self):
        b = self.booking(status='accepted')
        self.as_(self.fam)
        pin = self.client.get(f'/api/bookings/{b.id}/').data['visit_pin']
        self.assertEqual(pin, {'needed': 'start', 'locked': False, 'pin': '1234'})
        self.as_(self.carer)
        pin = self.client.get(f'/api/bookings/{b.id}/').data['visit_pin']
        self.assertEqual(pin['needed'], 'start')
        self.assertNotIn('pin', pin)

    def test_end_pin_shown_only_after_start(self):
        b = self.booking(status='accepted')
        self.as_(self.fam)
        self.assertNotEqual(self.client.get(f'/api/bookings/{b.id}/').data['visit_pin']['pin'], '5678')
        b.status = 'ongoing'
        b.save()
        self.assertEqual(self.client.get(f'/api/bookings/{b.id}/').data['visit_pin']['pin'], '5678')

    def test_start_needs_the_start_pin(self):
        b = self.booking(status='accepted')
        self.as_(self.carer)
        r = self.status(b, 'ongoing')
        self.assertEqual(r.data['code'], 'pin_required')
        r = self.status(b, 'ongoing', pin='5678')   # the end PIN can't start a visit
        self.assertEqual(r.data['code'], 'pin_wrong')
        self.assertEqual(self.status(b, 'ongoing', pin='1234').status_code, 200)
        b.refresh_from_db()
        self.assertEqual(b.status, 'ongoing')
        self.assertEqual(b.pin_attempts, 0)

    def test_end_pin_completes_and_releases_pay(self):
        b = self.booking(status='ongoing')
        self.as_(self.carer)
        self.assertEqual(self.status(b, 'completed', pin='1234').status_code, 400)
        self.assertFalse(Payment.objects.filter(booking=b).exists())
        r = self.status(b, 'completed', pin='5678')
        self.assertEqual(r.status_code, 200)
        b.refresh_from_db()
        self.assertTrue(b.is_paid)
        self.assertTrue(Payment.objects.filter(booking=b, status='success').exists())

    def test_locks_after_five_wrong_tries(self):
        b = self.booking(status='accepted')
        self.as_(self.carer)
        for _ in range(4):
            self.assertEqual(self.status(b, 'ongoing', pin='0000').data['code'], 'pin_wrong')
        r = self.status(b, 'ongoing', pin='0000')
        self.assertEqual(r.status_code, 423)
        r = self.status(b, 'ongoing', pin='1234')    # even the right PIN waits for support now
        self.assertEqual(r.status_code, 423)

    def test_admin_can_override(self):
        b = self.booking(status='accepted', pin_attempts=5)
        admin = make_user('ops@t.ke', 'admin')
        self.as_(admin)
        self.assertEqual(self.status(b, 'ongoing').status_code, 200)
