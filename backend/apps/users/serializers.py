"""Serializers for auth flows."""
from django.contrib.auth import authenticate
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User, OTPCode, Owner


class OTPRequestSerializer(serializers.Serializer):
    phone = serializers.CharField(max_length=20)

    def validate_phone(self, value):
        # Normalize: remove spaces, ensure starts with +880 or 01
        value = value.strip().replace(" ", "")
        if not (value.startswith("+880") or value.startswith("01")):
            raise serializers.ValidationError("Enter a valid Bangladeshi phone number.")
        return value


class OTPVerifySerializer(serializers.Serializer):
    phone = serializers.CharField(max_length=20)
    code = serializers.CharField(max_length=6, min_length=6)
    name = serializers.CharField(max_length=100, required=False, allow_blank=True)

    def validate(self, data):
        phone = data["phone"].strip()
        code = data["code"]
        otp = OTPCode.objects.filter(phone=phone, code=code, is_used=False).last()
        if not otp or not otp.is_valid:
            raise serializers.ValidationError({"code": "Invalid or expired OTP."})
        data["otp"] = otp
        return data

    def get_or_create_user(self):
        phone = self.validated_data["phone"]
        name = self.validated_data.get("name", "")
        otp = self.validated_data["otp"]
        user, created = User.objects.get_or_create(
            phone=phone,
            defaults={"role": User.PLAYER, "name": name},
        )
        if created and name:
            user.name = name
            user.save(update_fields=["name"])
        otp.is_used = True
        otp.save(update_fields=["is_used"])
        return user, created

    @staticmethod
    def get_tokens(user: User) -> dict:
        refresh = RefreshToken.for_user(user)
        return {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        }


class OwnerLoginSerializer(serializers.Serializer):
    """Email/password login for owners and admins (phone is used as username)."""
    phone = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = authenticate(username=data["phone"], password=data["password"])
        if not user:
            raise serializers.ValidationError({"detail": "Invalid credentials."})
        if not user.is_active:
            raise serializers.ValidationError({"detail": "Account is disabled."})
        if user.role not in [User.OWNER, User.ADMIN]:
            raise serializers.ValidationError({"detail": "Not authorized."})
        data["user"] = user
        return data


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "phone", "name", "role", "created_at"]
        read_only_fields = ["id", "role", "created_at"]


class OwnerSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Owner
        fields = ["id", "user", "business_name", "verification_status", "verified_at"]
        read_only_fields = ["id", "verification_status", "verified_at"]


class OwnerRegisterSerializer(serializers.Serializer):
    """Owner account registration (requires admin approval)."""
    phone = serializers.CharField(max_length=20)
    password = serializers.CharField(min_length=8, write_only=True)
    name = serializers.CharField(max_length=100)
    business_name = serializers.CharField(max_length=200)

    def validate_phone(self, value):
        if User.objects.filter(phone=value).exists():
            raise serializers.ValidationError("An account with this phone already exists.")
        return value

    def create_owner(self):
        data = self.validated_data
        user = User.objects.create_user(
            phone=data["phone"],
            name=data["name"],
            password=data["password"],
            role=User.OWNER,
        )
        owner = Owner.objects.create(
            user=user,
            business_name=data["business_name"],
        )
        return owner
