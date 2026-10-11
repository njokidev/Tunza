from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Payment

class PaymentStatusView(APIView):
    def get(self, request, booking_id):
        try:
            payment = Payment.objects.get(booking__id=booking_id, user=request.user)
            return Response({
                'status': payment.status,
                'amount': payment.amount,
            })
        except Payment.DoesNotExist:
            return Response({'detail': 'No payment found.'}, status=404)
