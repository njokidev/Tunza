from django.contrib import admin
from .models import FamilyReview, Review

@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ['patient', 'caregiver', 'score', 'created_at']
    list_filter  = ['score']


@admin.register(FamilyReview)
class FamilyReviewAdmin(admin.ModelAdmin):
    list_display = ['patient', 'caregiver', 'score', 'created_at']
    list_filter  = ['score']
