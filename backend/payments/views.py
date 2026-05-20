import json
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from bookings.models import Booking
from accounts.models import Notification
from .models import Payment
from .mpesa import stk_push


class InitiatePaymentView(APIView):
    """Patient initiates M-Pesa STK push for a booking."""

    def post(self, request):
        booking_id = request.data.get('booking_id')
        phone      = request.data.get('phone')  # 2547XXXXXXXX

        if not booking_id or not phone:
            return Response({'detail': 'booking_id and phone are required.'}, status=400)

        try:
            booking = Booking.objects.get(id=booking_id, patient=request.user)
        except Booking.DoesNotExist:
            return Response({'detail': 'Booking not found.'}, status=404)

        if booking.is_paid:
            return Response({'detail': 'Booking already paid.'}, status=400)

        # create a pending payment record first
        payment, _ = Payment.objects.get_or_create(
            booking=booking,
            defaults={'user': request.user, 'phone': phone, 'amount': booking.total_amount}
        )

        try:
            response = stk_push(
                phone=phone,
                amount=int(booking.total_amount),
                booking_id=str(booking.id),
            )
        except Exception as e:
            return Response({'detail': f'M-Pesa error: {str(e)}'}, status=502)

        if response.get('ResponseCode') == '0':
            payment.checkout_request_id  = response.get('CheckoutRequestID', '')
            payment.merchant_request_id  = response.get('MerchantRequestID', '')
            payment.save()
            return Response({
                'detail': 'STK push sent. Enter your M-Pesa PIN on your phone.',
                'checkout_request_id': payment.checkout_request_id,
            })
        else:
            return Response({'detail': response.get('errorMessage', 'STK push failed.')}, status=502)


class MpesaCallbackView(APIView):
    """Safaricom posts the result here. No auth needed."""
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data
        try:
            result = data['Body']['stkCallback']
            checkout_id  = result['CheckoutRequestID']
            result_code  = result['ResultCode']
            result_desc  = result['ResultDesc']

            payment = Payment.objects.get(checkout_request_id=checkout_id)

            if result_code == 0:
                # success — extract receipt
                items = {i['Name']: i['Value'] for i in result['CallbackMetadata']['Item']}
                payment.mpesa_receipt = items.get('MpesaReceiptNumber', '')
                payment.status        = Payment.Status.SUCCESS
                payment.result_desc   = result_desc
                payment.save()
                # mark booking as paid
                booking = payment.booking
                booking.is_paid = True
                booking.save(update_fields=['is_paid'])
                # notify patient
                Notification.objects.create(
                    user=booking.patient,
                    title='Payment Successful',
                    body=f'KES {payment.amount} paid. Receipt: {payment.mpesa_receipt}',
                    type='payment',
                )
            else:
                payment.status      = Payment.Status.FAILED
                payment.result_desc = result_desc
                payment.save()

        except Exception:
            pass  # never return 500 to Safaricom

        return Response({'ResultCode': 0, 'ResultDesc': 'Accepted'})


class PaymentStatusView(APIView):
    def get(self, request, booking_id):
        try:
            payment = Payment.objects.get(booking__id=booking_id, user=request.user)
            return Response({
                'status':        payment.status,
                'mpesa_receipt': payment.mpesa_receipt,
                'amount':        payment.amount,
            })
        except Payment.DoesNotExist:
            return Response({'detail': 'No payment found.'}, status=404)
