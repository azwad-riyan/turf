from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, OTPCode, Owner


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ("phone", "name", "role", "is_active", "is_staff", "created_at")
    list_filter = ("role", "is_active", "is_staff")
    search_fields = ("phone", "name")
    ordering = ("-created_at",)
    fieldsets = (
        (None, {"fields": ("phone", "password")}),
        ("Personal info", {"fields": ("name",)}),
        ("Permissions", {"fields": ("role", "is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Dates", {"fields": ("last_login",)}),
    )
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("phone", "name", "role", "password1", "password2"),
        }),
    )


@admin.register(OTPCode)
class OTPCodeAdmin(admin.ModelAdmin):
    list_display = ("phone", "code", "is_used", "created_at", "expires_at")
    list_filter = ("is_used",)
    search_fields = ("phone",)


@admin.register(Owner)
class OwnerAdmin(admin.ModelAdmin):
    list_display = ("business_name", "user", "verification_status", "created_at")
    list_filter = ("verification_status",)
    search_fields = ("business_name", "user__phone")
    actions = ["approve_owners"]

    @admin.action(description="Approve selected owners")
    def approve_owners(self, request, queryset):
        from django.utils import timezone
        queryset.update(verification_status=Owner.VERIFIED, verified_at=timezone.now())
