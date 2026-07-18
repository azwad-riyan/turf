"""
Bookings admin — the heart of platform operations.
Shows all bookings, status management, audit logs, and offline booking creation.
"""
from django.contrib import admin
from django.utils import timezone
from .models import Booking, BookingAuditLog


class BookingAuditLogInline(admin.TabularInline):
    """Shows audit trail of status changes inline in booking detail."""
    model = BookingAuditLog
    extra = 0
    readonly_fields = ("changed_by", "previous_status", "new_status", "reason", "created_at")
    can_delete = False
    ordering = ("-created_at",)


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = (
        "id", "turf", "date", "start_time", "end_time",
        "player_name", "player_phone",
        "source_badge", "status", "payment_method", "payment_status",
        "amount_display", "created_at",
    )
    list_filter = ("status", "source", "payment_method", "payment_status", "date")
    search_fields = ("player_name", "player_phone", "turf__name")
    ordering = ("-created_at",)
    date_hierarchy = "date"
    readonly_fields = (
        "created_at", "updated_at", "cancelled_at",
        "created_by_player", "created_by_owner",
        "platform_fee",
    )
    inlines = [BookingAuditLogInline]

    fieldsets = (
        ("Slot", {
            "fields": ("turf", "date", "start_time", "end_time"),
        }),
        ("Player", {
            "fields": ("player", "player_name", "player_phone", "player_count"),
        }),
        ("Status & Payment", {
            "fields": ("source", "status", "payment_method", "payment_status", "amount", "platform_fee", "amount_paid"),
        }),
        ("Notes & Cancellation", {
            "fields": ("notes", "cancelled_at", "cancellation_reason"),
            "classes": ("collapse",),
        }),
        ("Metadata", {
            "fields": ("created_by_player", "created_by_owner", "created_at", "updated_at"),
            "classes": ("collapse",),
        }),
    )

    actions = ["mark_completed", "mark_no_show", "cancel_bookings"]

    @admin.action(description="✅ Mark selected bookings as Completed")
    def mark_completed(self, request, queryset):
        updated = queryset.filter(status=Booking.CONFIRMED).update(status=Booking.COMPLETED)
        self.message_user(request, f"{updated} booking(s) marked as completed.")

    @admin.action(description="⚠️ Mark selected bookings as No-Show")
    def mark_no_show(self, request, queryset):
        updated = queryset.filter(status=Booking.CONFIRMED).update(status=Booking.NO_SHOW)
        self.message_user(request, f"{updated} booking(s) marked as no-show.")

    @admin.action(description="❌ Cancel selected bookings")
    def cancel_bookings(self, request, queryset):
        updated = queryset.exclude(status__in=[Booking.CANCELLED, Booking.COMPLETED]).update(
            status=Booking.CANCELLED,
            cancelled_at=timezone.now(),
            cancellation_reason="Cancelled by admin",
        )
        self.message_user(request, f"{updated} booking(s) cancelled.")

    @admin.display(description="Source")
    def source_badge(self, obj):
        icon = "🌐" if obj.source == Booking.ONLINE else "📞"
        return f"{icon} {obj.get_source_display()}"

    @admin.display(description="Amount")
    def amount_display(self, obj):
        return f"৳{obj.amount:,}"


@admin.register(BookingAuditLog)
class BookingAuditLogAdmin(admin.ModelAdmin):
    """Read-only audit trail of all booking status changes."""
    list_display = ("booking", "changed_by", "previous_status", "new_status", "reason", "created_at")
    list_filter = ("new_status",)
    search_fields = ("booking__id", "booking__player_phone")
    readonly_fields = ("booking", "changed_by", "previous_status", "new_status", "reason", "created_at")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
