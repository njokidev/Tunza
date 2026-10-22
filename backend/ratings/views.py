from django.db.models import Avg, Count
from rest_framework import generics
from accounts.permissions import IsCaregiver
from .models import FamilyReview, Review
from .serializers import FamilyReviewSerializer, ReviewSerializer


class ReviewListCreateView(generics.ListCreateAPIView):
    serializer_class = ReviewSerializer

    def get_queryset(self):
        cg_id = self.request.query_params.get('caregiver')
        if cg_id:
            return Review.objects.filter(caregiver__id=cg_id).select_related('patient')
        return Review.objects.filter(patient=self.request.user).select_related('patient')


class FamilyReviewCreateView(generics.ListCreateAPIView):
    """Caregivers rate families. GET lists the ratings this caregiver has given."""
    serializer_class = FamilyReviewSerializer
    permission_classes = [IsCaregiver]

    def get_queryset(self):
        return FamilyReview.objects.filter(caregiver__user=self.request.user).select_related('patient')


def family_rating(patient):
    """{avg, count} of the ratings caregivers have given this family."""
    agg = FamilyReview.objects.filter(patient=patient).aggregate(avg=Avg('score'), n=Count('id'))
    return {'avg': round(agg['avg'], 1) if agg['avg'] else None, 'count': agg['n']}
