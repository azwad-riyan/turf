"""Turf serializers."""
from rest_framework import serializers
from .models import Turf, TurfPhoto, OperatingSchedule, SlotOverride


class TurfPhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = TurfPhoto
        fields = ["id", "image", "is_primary", "order"]


class OperatingScheduleSerializer(serializers.ModelSerializer):
    day_name = serializers.CharField(source="get_day_of_week_display", read_only=True)

    class Meta:
        model = OperatingSchedule
        fields = ["id", "day_of_week", "day_name", "open_time", "close_time", "slot_duration_min", "is_closed"]


class SlotOverrideSerializer(serializers.ModelSerializer):
    class Meta:
        model = SlotOverride
        fields = ["id", "date", "start_time", "end_time", "status", "price", "reason"]


class TurfListSerializer(serializers.ModelSerializer):
    """Compact serializer for listing turfs (search results, map view)."""
    primary_photo = serializers.SerializerMethodField()
    owner_name = serializers.CharField(source="owner.business_name", read_only=True)

    class Meta:
        model = Turf
        fields = [
            "id", "name", "address", "area", "lat", "lng",
            "sport_types", "amenities", "base_price", "is_active",
            "average_rating", "total_reviews", "owner_name", "primary_photo",
        ]

    def get_primary_photo(self, obj):
        photo = obj.photos.filter(is_primary=True).first() or obj.photos.first()
        if photo:
            request = self.context.get("request")
            return request.build_absolute_uri(photo.image.url) if request else photo.image.url
        return None


class TurfDetailSerializer(serializers.ModelSerializer):
    """Full serializer for turf detail page."""
    photos = TurfPhotoSerializer(many=True, read_only=True)
    schedules = OperatingScheduleSerializer(many=True, read_only=True)
    owner_name = serializers.CharField(source="owner.business_name", read_only=True)
    owner_phone = serializers.CharField(source="contact_phone", read_only=True)

    class Meta:
        model = Turf
        fields = [
            "id", "name", "description", "address", "area", "lat", "lng",
            "sport_types", "amenities", "base_price", "contact_phone",
            "is_active", "cancellation_hours", "average_rating", "total_reviews",
            "owner_name", "owner_phone", "photos", "schedules", "created_at",
        ]


class TurfCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Turf
        fields = [
            "name", "description", "address", "area", "lat", "lng",
            "sport_types", "amenities", "base_price", "contact_phone",
            "is_active", "cancellation_hours",
        ]
