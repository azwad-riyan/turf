from django.urls import path
from .views import TurfReviewListView, CreateReviewView

urlpatterns = [
    path("", CreateReviewView.as_view(), name="review-create"),
    path("turf/<int:turf_id>/", TurfReviewListView.as_view(), name="turf-reviews"),
]
