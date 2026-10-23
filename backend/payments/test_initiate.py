"""
Starting an M-Pesa payment for an accepted booking: POST /api/payments/initiate/.
Safaricom is never called; mpesa.stk_push is patched.

Run with:  python manage.py test payments
"""
from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

import requests
from django.test import override_settings
from django.utils import timezone

from bookings.test_caregiver_features import Base, make_user
from payments.models import Payment

MPESA = dict(MPESA_CONSUMER_KEY='k', MPESA_CONSUMER_SECRET='s', MPESA_SHORTCODE='174379',
             MPESA_PASSKEY='p', MPESA_CALLBACK_URL='https://api.example.com/api/payments/callback/')
OK = {'MerchantRequestID': 'm-1', 'CheckoutRequestID': 'ws_CO_1', 'ResponseCode': '0',
      'ResponseDescription': 'Success. Request accepted for processing'}
URL = '/api/payments/initiate/'


@override_settings(**MPESA)
class InitiatePaymentTests(Base):
    def setUp(self):
        super().setUp()
        self.b = self.booking(status='accepted', total_amount=Decimal('2000.40'))
        self.as_(self.fam)

    def pay(self, **data):
        return self.client.post(URL, {'booking_id': str(self.b.id), **data}, format='json')

    @patch('payments.mpesa.stk_push', return_value=OK)
    def test_sends_stk_push_to_family_phone(self, push):
        r = self.pay()
        self.assertEqual(r.status_code, 202, r.data)
        push.assert_called_once_with(self.fam.phone, 2001, self.b.id)   # rounded up to whole KES
        p = Payment.objects.get(booking=self.b)
        self.assertEqual((p.status, p.amount, p.checkout_request_id), ('pending', Decimal('2001'), 'ws_CO_1'))
        self.assertEqual(r.data['status'], 'pending')
        self.assertNotIn(self.fam.phone, r.data['phone'])   # masked

    @patch('payments.mpesa.stk_push', return_value=OK)
    def test_another_number_is_normalised(self, push):
        self.assertEqual(self.pay(phone='0722 000 111').status_code, 202)
        self.assertEqual(push.call_args.args[0], '254722000111')

    @patch('payments.mpesa.stk_push', return_value=OK)
    def test_double_tap_sends_one_prompt(self, push):
        self.pay()
        r = self.pay()
        self.assertEqual(r.status_code, 202)
        self.assertEqual(push.call_count, 1)
        self.assertEqual(Payment.objects.filter(booking=self.b).count(), 1)

    @patch('payments.mpesa.stk_push', return_value=OK)
    def test_can_retry_after_the_window_or_a_failure(self, push):
        self.pay()
        Payment.objects.filter(booking=self.b).update(updated_at=timezone.now() - timedelta(minutes=3))
        self.assertEqual(self.pay().status_code, 202)
        Payment.objects.filter(booking=self.b).update(status='failed')
        self.assertEqual(self.pay().status_code, 202)
        self.assertEqual(push.call_count, 3)

    @patch('payments.mpesa.stk_push')
    def test_only_accepted_unpaid_bookings_of_your_own(self, push):
        self.b.status = 'pending'; self.b.save()
        self.assertEqual(self.pay().data['code'], 'not_payable')
        self.b.status = 'accepted'; self.b.is_paid = True; self.b.save()
        self.assertEqual(self.pay().status_code, 409)
        self.b.is_paid = False; self.b.save()
        self.as_(make_user('other@t.ke', 'patient'))
        self.assertEqual(self.pay().status_code, 404)
        self.assertEqual(self.client.post(URL, {'booking_id': 'nope'}, format='json').status_code, 404)
        self.assertEqual(self.client.post(URL, {}, format='json').data['code'], 'booking_required')
        push.assert_not_called()

    @patch('payments.mpesa.stk_push')
    def test_bad_phone_rejected(self, push):
        self.assertEqual(self.pay(phone='12345').data['code'], 'invalid_phone')
        push.assert_not_called()

    @patch('payments.mpesa.stk_push', side_effect=requests.ConnectionError('down'))
    def test_mpesa_unreachable(self, push):
        r = self.pay()
        self.assertEqual((r.status_code, r.data['code']), (502, 'mpesa_unreachable'))
        self.assertEqual(Payment.objects.get(booking=self.b).status, 'failed')

    @patch('payments.mpesa.stk_push', return_value={'errorCode': '400.002.02', 'errorMessage': 'Bad Request - Invalid PhoneNumber'})
    def test_mpesa_rejects(self, push):
        r = self.pay()
        self.assertEqual((r.status_code, r.data['code']), (502, 'mpesa_rejected'))
        self.assertIn('Invalid PhoneNumber', r.data['detail'])
        self.assertEqual(Payment.objects.get(booking=self.b).status, 'failed')

    @override_settings(MPESA_PASSKEY='')
    @patch('payments.mpesa.stk_push')
    def test_unconfigured_mpesa_says_so(self, push):
        r = self.pay()
        self.assertEqual((r.status_code, r.data['code']), (503, 'payments_unavailable'))
        push.assert_not_called()
