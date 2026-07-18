from django.urls import path
from .views import (
    BookingCreateView,
    BookingDetailView,
    CancelBookingView,
    MyBookingsView,
    OwnerBookingsView,
    OfflineBookingView,
    SlotLockView,
)

urlpatterns = [
    path("", BookingCreateView.as_view(), name="booking-create"),
    path("mine/", MyBookingsView.as_view(), name="my-bookings"),
    path("offline/", OfflineBookingView.as_view(), name="offline-booking"),
    path("lock/", SlotLockView.as_view(), name="slot-lock"),
    path("turf/<int:turf_id>/", OwnerBookingsView.as_view(), name="owner-bookings"),
    path("<int:booking_id>/", BookingDetailView.as_view(), name="booking-detail"),
    path("<int:booking_id>/cancel/", CancelBookingView.as_view(), name="booking-cancel"),
]
