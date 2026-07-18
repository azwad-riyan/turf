"""Booking serializers."""
from rest_framework import serializers
from .models import Booking, BookingAuditLog


class BookingCreateSerializer(serializers.Serializer):
    """Used by players to create online bookings."""
    turf_id = serializers.IntegerField()
    date = serializers.DateField()
    start_times = serializers.ListField(child=serializers.TimeField(), allow_empty=False)
    player_name = serializers.CharField(max_length=100)
    player_phone = serializers.CharField(max_length=20)
    player_count = serializers.IntegerField(min_value=1, max_value=22, default=1)
    payment_method = serializers.ChoiceField(
        choices=[Booking.CASH], default=Booking.CASH
    )  # Phase 1: only cash
    notes = serializers.CharField(required=False, allow_blank=True, default="")
    session_id = serializers.CharField(required=False, allow_blank=True, default="locked")


class OfflineBookingSerializer(serializers.Serializer):
    """Used by owners to mark manual/phone bookings."""
    date = serializers.DateField()
    start_times = serializers.ListField(child=serializers.TimeField(), allow_empty=False)
    player_name = serializers.CharField(max_length=100)
    player_phone = serializers.CharField(max_length=20)
    player_count = serializers.IntegerField(min_value=1, max_value=22, default=1)
    notes = serializers.CharField(required=False, allow_blank=True, default="")


class BookingSerializer(serializers.ModelSerializer):
    turf_name = serializers.CharField(source="turf.name", read_only=True)
    turf_address = serializers.CharField(source="turf.address", read_only=True)
    slot_label = serializers.CharField(read_only=True)
    audit_logs = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = [
            "id", "turf_id", "turf_name", "turf_address",
            "player_name", "player_phone", "player_count",
            "date", "start_time", "end_time", "slot_label",
            "source", "status", "payment_method", "payment_status",
            "amount", "platform_fee", "amount_paid",
            "notes", "created_at", "cancelled_at", "cancellation_reason",
            "audit_logs",
        ]

    def get_audit_logs(self, obj):
        if self.context.get("include_audit"):
            return BookingAuditLogSerializer(obj.audit_logs.all(), many=True).data
        return []


class BookingAuditLogSerializer(serializers.ModelSerializer):
    changed_by_name = serializers.CharField(source="changed_by.name", read_only=True)

    class Meta:
        model = BookingAuditLog
        fields = ["id", "changed_by_name", "previous_status", "new_status", "reason", "created_at"]


class CancelBookingSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True, default="")
