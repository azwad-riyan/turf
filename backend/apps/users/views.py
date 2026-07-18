"""Auth views: OTP request/verify, owner login, profile."""
import logging
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

from .models import OTPCode, User
from .serializers import (
    OTPRequestSerializer,
    OTPVerifySerializer,
    OwnerLoginSerializer,
    OwnerRegisterSerializer,
    UserSerializer,
    OwnerSerializer,
)
from services.notification_service import NotificationService

logger = logging.getLogger(__name__)
notification_service = NotificationService()


class OTPRequestView(APIView):
    """POST /api/v1/auth/otp/request/ — Send OTP to player's phone."""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = OTPRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        phone = serializer.validated_data["phone"]

        otp = OTPCode.generate(phone)
        notification_service.send_otp_sms(phone, otp.code)

        logger.info(f"OTP generated for {phone}")
        # In dev mode, return the code directly (remove in production)
        response_data = {"detail": "OTP sent successfully.", "phone": phone}
        from django.conf import settings
        if settings.DEBUG:
            response_data["debug_otp"] = otp.code  # REMOVE IN PRODUCTION
        return Response(response_data, status=status.HTTP_200_OK)


class OTPVerifyView(APIView):
    """POST /api/v1/auth/otp/verify/ — Verify OTP and return JWT tokens."""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = OTPVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user, created = serializer.get_or_create_user()
        tokens = OTPVerifySerializer.get_tokens(user)
        return Response(
            {
                "tokens": tokens,
                "user": UserSerializer(user).data,
                "is_new_user": created,
            },
            status=status.HTTP_200_OK,
        )


class OwnerLoginView(APIView):
    """POST /api/v1/auth/owner/login/ — Email/password login for owners & admins."""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = OwnerLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "tokens": {
                    "refresh": str(refresh),
                    "access": str(refresh.access_token),
                },
                "user": UserSerializer(user).data,
            },
            status=status.HTTP_200_OK,
        )


class OwnerRegisterView(APIView):
    """POST /api/v1/auth/owner/register/ — Register a new owner account (pending approval)."""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = OwnerRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        owner = serializer.create_owner()
        return Response(
            {
                "detail": "Owner account created. Pending admin approval.",
                "owner": OwnerSerializer(owner).data,
            },
            status=status.HTTP_201_CREATED,
        )


class MeView(APIView):
    """GET /api/v1/auth/me/ — Return current user profile."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user_data = UserSerializer(request.user).data
        if request.user.is_owner:
            try:
                user_data["owner_profile"] = OwnerSerializer(
                    request.user.owner_profile
                ).data
            except Exception:
                user_data["owner_profile"] = None
        return Response(user_data)

    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class LogoutView(APIView):
    """POST /api/v1/auth/logout/ — Blacklist refresh token."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data["refresh"]
            token = RefreshToken(refresh_token)
            token.blacklist()
        except Exception:
            pass
        return Response({"detail": "Logged out successfully."}, status=status.HTTP_200_OK)
