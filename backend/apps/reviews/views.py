"""Review views."""
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Review


class ReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = ["id", "turf_id", "rating", "comment", "player_name", "created_at"]
        read_only_fields = ["id", "player_name", "created_at"]


class TurfReviewListView(APIView):
    """GET /api/v1/reviews/turf/{turf_id}/"""
    permission_classes = [AllowAny]

    def get(self, request, turf_id):
        reviews = Review.objects.filter(turf_id=turf_id, is_flagged=False).order_by("-created_at")[:50]
        return Response(ReviewSerializer(reviews, many=True).data)


class CreateReviewView(APIView):
    """POST /api/v1/reviews/ — Submit a review after completing a booking."""
    permission_classes = [AllowAny]

    def post(self, request):
        from apps.bookings.models import Booking
        from apps.turfs.models import Turf

        booking_id = request.data.get("booking_id")
        rating = request.data.get("rating")
        comment = request.data.get("comment", "")
        player_phone = request.data.get("player_phone", "")

        try:
            booking = Booking.objects.get(id=booking_id)
        except Booking.DoesNotExist:
            return Response({"error": "Booking not found."}, status=404)

        # Verify the reviewer matches the booking
        if request.user.is_authenticated:
            if booking.player != request.user:
                return Response({"error": "Not authorized."}, status=403)
        elif booking.player_phone != player_phone:
            return Response({"error": "Phone number doesn't match booking."}, status=403)

        if Review.objects.filter(booking=booking).exists():
            return Response({"error": "Review already submitted for this booking."}, status=409)

        review = Review.objects.create(
            turf=booking.turf,
            booking=booking,
            player=request.user if request.user.is_authenticated else None,
            player_name=booking.player_name,
            rating=rating,
            comment=comment,
        )
        return Response(ReviewSerializer(review).data, status=201)
