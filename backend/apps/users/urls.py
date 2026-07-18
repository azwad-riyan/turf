from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    OTPRequestView,
    OTPVerifyView,
    OwnerLoginView,
    OwnerRegisterView,
    MeView,
    LogoutView,
)

urlpatterns = [
    path("otp/request/", OTPRequestView.as_view(), name="otp-request"),
    path("otp/verify/", OTPVerifyView.as_view(), name="otp-verify"),
    path("owner/login/", OwnerLoginView.as_view(), name="owner-login"),
    path("owner/register/", OwnerRegisterView.as_view(), name="owner-register"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("me/", MeView.as_view(), name="me"),
    path("logout/", LogoutView.as_view(), name="logout"),
]
