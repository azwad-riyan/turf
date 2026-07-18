"""
Turf admin — manages turfs, operating schedules, slot overrides, and photos.
This is what the Platform Admin uses to onboard and manage turf listings.
"""
from django.contrib import admin
from django.utils.html import format_html
from .models import Turf, TurfPhoto, OperatingSchedule, SlotOverride


class TurfPhotoInline(admin.TabularInline):
    """Inline photo management inside the Turf edit page."""
    model = TurfPhoto
    extra = 1
    fields = ("image", "is_primary", "order")
    ordering = ("order",)


class OperatingScheduleInline(admin.TabularInline):
    """Set operating hours directly on the Turf page (Mon–Sun)."""
    model = OperatingSchedule
    extra = 0
    fields = ("day_of_week", "open_time", "close_time", "slot_duration_min", "is_closed")
    ordering = ("day_of_week",)


@admin.register(Turf)
class TurfAdmin(admin.ModelAdmin):
    list_display = (
        "name", "owner", "area", "sport_types_display",
        "base_price_display", "average_rating", "is_active", "created_at",
    )
    list_filter = ("is_active", "area")
    search_fields = ("name", "address", "area", "owner__business_name", "owner__user__phone")
    ordering = ("-created_at",)
    readonly_fields = ("average_rating", "total_reviews", "created_at", "updated_at")
    list_editable = ("is_active",)
    inlines = [OperatingScheduleInline, TurfPhotoInline]

    fieldsets = (
        ("Basic Info", {
            "fields": ("owner", "name", "description", "area", "address", "contact_phone", "is_active"),
        }),
        ("Location", {
            "fields": ("lat", "lng"),
            "classes": ("collapse",),
        }),
        ("Sports & Amenities", {
            "fields": ("sport_types", "amenities"),
        }),
        ("Pricing & Policy", {
            "description": "Set the base slot price (in BDT) and cancellation window.",
            "fields": ("base_price", "cancellation_hours"),
        }),
        ("Stats (auto-calculated)", {
            "fields": ("average_rating", "total_reviews", "created_at", "updated_at"),
            "classes": ("collapse",),
        }),
    )

    actions = ["activate_turfs", "deactivate_turfs"]

    @admin.action(description="✅ Activate selected turfs (make publicly visible)")
    def activate_turfs(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(request, f"{updated} turf(s) activated.")

    @admin.action(description="🚫 Deactivate selected turfs (hide from players)")
    def deactivate_turfs(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(request, f"{updated} turf(s) deactivated.")

    @admin.display(description="Sports")
    def sport_types_display(self, obj):
        return ", ".join(obj.sport_types) if obj.sport_types else "—"

    @admin.display(description="Price/Slot")
    def base_price_display(self, obj):
        return f"৳{obj.base_price:,}"


@admin.register(OperatingSchedule)
class OperatingScheduleAdmin(admin.ModelAdmin):
    """Manage turf operating hours by day of week."""
    list_display = ("turf", "get_day_of_week_display", "open_time", "close_time", "slot_duration_min", "is_closed")
    list_filter = ("day_of_week", "is_closed")
    search_fields = ("turf__name",)
    ordering = ("turf", "day_of_week")


@admin.register(SlotOverride)
class SlotOverrideAdmin(admin.ModelAdmin):
    """Block slots or set special prices for specific dates."""
    list_display = ("turf", "date", "start_time", "end_time", "status", "price", "reason")
    list_filter = ("status", "date")
    search_fields = ("turf__name", "reason")
    ordering = ("-date", "start_time")
    date_hierarchy = "date"
