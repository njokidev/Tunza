from rest_framework import serializers, generics, status
from rest_framework.response import Response
from accounts.serializers import PublicUserSerializer
from .models import FamilyReview, Review


class ReviewSerializer(serializers.ModelSerializer):
    patient = PublicUserSerializer(read_only=True)

    class Meta:
        model  = Review
        fields = ['id', 'patient', 'caregiver', 'booking', 'score', 'comment', 'created_at']
        read_only_fields = ['id', 'patient', 'created_at']

    def validate_score(self, v):
        if not (1 <= v <= 5):
            raise serializers.ValidationError('Score must be between 1 and 5.')
        return v

    def validate(self, data):
        from bookings.models import Booking
        booking = data.get('booking')
        if booking.status != 'completed':
            raise serializers.ValidationError('Can only review a completed booking.')
        if booking.patient != self.context['request'].user:
            raise serializers.ValidationError('You can only review your own bookings.')
        return data

    def create(self, validated_data):
        return Review.objects.create(patient=self.context['request'].user, **validated_data)


class FamilyReviewSerializer(serializers.ModelSerializer):
    patient = PublicUserSerializer(read_only=True)

    class Meta:
        model  = FamilyReview
        fields = ['id', 'patient', 'booking', 'score', 'comment', 'created_at']
        read_only_fields = ['id', 'patient', 'created_at']

    def validate_score(self, v):
        if not (1 <= v <= 5):
            raise serializers.ValidationError('Score must be between 1 and 5.')
        return v

    def validate(self, data):
        booking = data.get('booking')
        user = self.context['request'].user
        if booking.caregiver.user_id != user.id:
            raise serializers.ValidationError('You can only rate families you cared for.')
        if booking.status != 'completed':
            raise serializers.ValidationError('You can rate the family once the visit is completed.')
        if FamilyReview.objects.filter(booking=booking).exists():
            raise serializers.ValidationError('You already rated this visit.')
        return data

    def create(self, validated_data):
        b = validated_data['booking']
        return FamilyReview.objects.create(caregiver=b.caregiver, patient=b.patient, **validated_data)
