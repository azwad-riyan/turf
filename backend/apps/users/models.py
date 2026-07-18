"""
User & Auth models.

- User: custom user model with phone-first auth for players
- OTPCode: short-lived OTP for player phone login
- Owner: extended profile for turf owner accounts
"""
import random
import string
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.utils import timezone
from django.conf import settings


class UserManager(BaseUserManager):
    def create_user(self, phone, name="", password=None, **extra_fields):
        if not phone:
            raise ValueError("Phone number is required.")
        user = self.model(phone=phone, name=name, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, phone, name="Admin", password=None, **extra_fields):
        extra_fields.setdefault("role", User.ADMIN)
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        return self.create_user(phone, name, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    PLAYER = "player"
    OWNER = "owner"
    ADMIN = "admin"
    ROLE_CHOICES = [
        (PLAYER, "Player"),
        (OWNER, "Owner"),
        (ADMIN, "Admin"),
    ]

    phone = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=100, blank=True)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default=PLAYER)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = "phone"
    REQUIRED_FIELDS = ["name"]

    objects = UserManager()

    class Meta:
        db_table = "users"
        verbose_name = "User"
        verbose_name_plural = "Users"

    def __str__(self):
        return f"{self.name} ({self.phone}) [{self.role}]"

    @property
    def is_player(self):
        return self.role == self.PLAYER

    @property
    def is_owner(self):
        return self.role == self.OWNER

    @property
    def is_platform_admin(self):
        return self.role == self.ADMIN


class OTPCode(models.Model):
    """Short-lived 6-digit OTP for phone-based player login."""
    phone = models.CharField(max_length=20, db_index=True)
    code = models.CharField(max_length=6)
    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    class Meta:
        db_table = "otp_codes"

    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timezone.timedelta(
                seconds=settings.OTP_EXPIRY_SECONDS
            )
        super().save(*args, **kwargs)

    @classmethod
    def generate(cls, phone: str) -> "OTPCode":
        """Invalidate any existing OTPs for this phone and create a new one."""
        cls.objects.filter(phone=phone, is_used=False).update(is_used=True)
        code = "".join(random.choices(string.digits, k=6))
        return cls.objects.create(
            phone=phone,
            code=code,
            expires_at=timezone.now() + timezone.timedelta(
                seconds=settings.OTP_EXPIRY_SECONDS
            ),
        )

    @property
    def is_valid(self) -> bool:
        return not self.is_used and timezone.now() < self.expires_at

    def __str__(self):
        return f"OTP {self.code} for {self.phone} (valid={self.is_valid})"


class Owner(models.Model):
    """Extended profile for turf owner accounts."""
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"
    VERIFICATION_CHOICES = [
        (PENDING, "Pending Review"),
        (VERIFIED, "Verified"),
        (REJECTED, "Rejected"),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="owner_profile")
    business_name = models.CharField(max_length=200)
    verification_status = models.CharField(
        max_length=10, choices=VERIFICATION_CHOICES, default=PENDING
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True, help_text="Admin notes on verification")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "owners"

    def __str__(self):
        return f"{self.business_name} ({self.verification_status})"
