from rest_framework import generics
from .models import Review
from .serializers import ReviewSerializer


class ReviewListCreateView(generics.ListCreateAPIView):
    serializer_class = ReviewSerializer

    def get_queryset(self):
        cg_id = self.request.query_params.get('caregiver')
        if cg_id:
            return Review.objects.filter(caregiver__id=cg_id).select_related('patient')
        return Review.objects.filter(patient=self.request.user).select_related('patient')
