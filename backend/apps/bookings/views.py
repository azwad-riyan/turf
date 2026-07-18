"""Booking API views."""
import logging
from datetime import date, time, timedelta

from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.turfs.models import Turf
from apps.users.models import User
from core.exceptions import SlotNotAvailableError, SlotLockError
from services.booking_service import BookingService
from services.notification_service import NotificationService
from services.slot_service import SlotService
from .models import Booking
from .serializers import (
    BookingCreateSerializer,
    BookingSerializer,
    CancelBookingSerializer,
    OfflineBookingSerializer,
)

logger = logging.getLogger(__name__)
booking_service = BookingService()
slot_service = SlotService()
notification_service = NotificationService()


class BookingCreateView(APIView):
    """
    POST /api/v1/bookings/
    Player creates an online booking. Supports guest checkout (no auth required).
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = BookingCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            turf = Turf.objects.get(id=data["turf_id"], is_active=True)
        except Turf.DoesNotExist:
            return Response({"error": {"code": "NOT_FOUND", "message": "Turf not found."}}, status=404)

        # Compute end_time from start_time + slot_duration
        schedule_day = data["date"].weekday()
        try:
            schedule = turf.schedules.get(day_of_week=schedule_day)
            duration = timedelta(minutes=schedule.slot_duration_min)
        except Exception:
            duration = timedelta(minutes=90)

        start_times = data["start_times"]
        from datetime import datetime
        end_times = [(datetime.combine(date.today(), st) + duration).time() for st in start_times]

        player = request.user if request.user.is_authenticated else None

        try:
            bookings = booking_service.create_booking(
                turf=turf,
                slot_date=data["date"],
                start_times=start_times,
                end_times=end_times,
                player_name=data["player_name"],
                player_phone=data["player_phone"],
                player_count=data["player_count"],
                payment_method=data["payment_method"],
                source=Booking.ONLINE,
                player=player,
                notes=data.get("notes", ""),
                session_id=data.get("session_id", "locked"),
            )
        except (SlotNotAvailableError, SlotLockError) as e:
            return Response(
                {"error": {"code": e.code, "message": e.message}},
                status=e.status_code,
            )

        if bookings:
            notification_service.send_booking_confirmation(bookings[0].player_phone, bookings[0])
        return Response(BookingSerializer(bookings, many=True).data, status=status.HTTP_201_CREATED)


class OfflineBookingView(APIView):
    """
    POST /api/v1/bookings/offline/
    Owner marks a phone/manual booking in the system.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.role not in [User.OWNER, User.ADMIN]:
            return Response({"error": {"code": "FORBIDDEN", "message": "Owners only."}}, status=403)

        # Owner can only mark offline on their own turfs
        turf_id = request.data.get("turf_id")
        try:
            if request.user.role == User.OWNER:
                turf = Turf.objects.get(id=turf_id, owner=request.user.owner_profile)
            else:
                turf = Turf.objects.get(id=turf_id)
        except Turf.DoesNotExist:
            return Response({"error": {"code": "NOT_FOUND", "message": "Turf not found."}}, status=404)

        serializer = OfflineBookingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        schedule_day = data["date"].weekday()
        try:
            schedule = turf.schedules.get(day_of_week=schedule_day)
            duration = timedelta(minutes=schedule.slot_duration_min)
        except Exception:
            duration = timedelta(minutes=90)

        start_times = data["start_times"]
        from datetime import datetime
        end_times = [(datetime.combine(date.today(), st) + duration).time() for st in start_times]

        try:
            bookings = booking_service.create_booking(
                turf=turf,
                slot_date=data["date"],
                start_times=start_times,
                end_times=end_times,
                player_name=data["player_name"],
                player_phone=data["player_phone"],
                player_count=data["player_count"],
                source=Booking.OFFLINE,
                created_by_owner=request.user,
                notes=data.get("notes", ""),
            )
        except (SlotNotAvailableError, SlotLockError) as e:
            return Response(
                {"error": {"code": e.code, "message": e.message}},
                status=e.status_code,
            )

        return Response(BookingSerializer(bookings, many=True).data, status=status.HTTP_201_CREATED)


class BookingDetailView(APIView):
    """GET/PATCH /api/v1/bookings/{id}/"""
    permission_classes = [AllowAny]

    def get(self, request, booking_id):
        try:
            booking = Booking.objects.get(id=booking_id)
        except Booking.DoesNotExist:
            return Response({"error": {"code": "NOT_FOUND", "message": "Booking not found."}}, status=404)

        # Players can only view their own bookings (by phone for guests)
        phone = request.query_params.get("phone")
        if request.user.is_anonymous:
            if not phone or booking.player_phone != phone:
                return Response({"error": {"code": "FORBIDDEN", "message": "Not authorized."}}, status=403)

        return Response(BookingSerializer(booking, context={"include_audit": True}).data)


class CancelBookingView(APIView):
    """POST /api/v1/bookings/{id}/cancel/"""
    permission_classes = [AllowAny]

    def post(self, request, booking_id):
        try:
            booking = Booking.objects.get(id=booking_id)
        except Booking.DoesNotExist:
            return Response({"error": {"code": "NOT_FOUND", "message": "Booking not found."}}, status=404)

        # Authorization: player (by phone for guests), owner of turf, or admin
        is_authorized = False
        if request.user.is_authenticated:
            if request.user.role == User.ADMIN:
                is_authorized = True
            elif request.user.role == User.OWNER and booking.turf.owner.user == request.user:
                is_authorized = True
            elif booking.player == request.user:
                is_authorized = True
        else:
            phone = request.data.get("phone", "")
            if phone and booking.player_phone == phone:
                is_authorized = True

        if not is_authorized:
            return Response({"error": {"code": "FORBIDDEN", "message": "Not authorized."}}, status=403)

        serializer = CancelBookingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            booking = booking_service.cancel_booking(
                booking, request.user if request.user.is_authenticated else None,
                reason=serializer.validated_data.get("reason", "")
            )
        except ValueError as e:
            return Response({"error": {"code": "BAD_REQUEST", "message": str(e)}}, status=400)

        notification_service.send_cancellation_notice(booking.player_phone, booking)
        return Response(BookingSerializer(booking).data)


class MyBookingsView(APIView):
    """GET /api/v1/bookings/mine/ — Player's booking history."""
    permission_classes = [AllowAny]

    def get(self, request):
        phone = request.query_params.get("phone")
        if request.user.is_authenticated:
            bookings = Booking.objects.filter(player=request.user).select_related("turf")
        elif phone:
            bookings = Booking.objects.filter(player_phone=phone).select_related("turf")
        else:
            return Response({"error": {"code": "UNAUTHORIZED", "message": "Provide phone or authenticate."}}, status=401)

        status_filter = request.query_params.get("status")
        if status_filter:
            bookings = bookings.filter(status=status_filter)

        bookings = bookings.order_by("-created_at")[:50]
        return Response(BookingSerializer(bookings, many=True).data)


class OwnerBookingsView(APIView):
    """GET /api/v1/bookings/turf/{turf_id}/ — All bookings for owner's turf."""
    permission_classes = [IsAuthenticated]

    def get(self, request, turf_id):
        try:
            if request.user.role == User.OWNER:
                turf = Turf.objects.get(id=turf_id, owner=request.user.owner_profile)
            else:
                turf = Turf.objects.get(id=turf_id)
        except Turf.DoesNotExist:
            return Response({"error": {"code": "NOT_FOUND", "message": "Turf not found."}}, status=404)

        bookings = Booking.objects.filter(turf=turf).select_related("turf")
        date_str = request.query_params.get("date")
        if date_str:
            try:
                bookings = bookings.filter(date=date.fromisoformat(date_str))
            except ValueError:
                pass

        bookings = bookings.order_by("date", "start_time")
        return Response(BookingSerializer(bookings, many=True).data)


class SlotLockView(APIView):
    """
    POST /api/v1/bookings/lock/ — Acquire slot lock when entering checkout.
    DELETE /api/v1/bookings/lock/ — Release lock when leaving checkout.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        turf_id = request.data.get("turf_id")
        date_str = request.data.get("date")
        start_times_list = request.data.get("start_times", [])
        session_id = request.data.get("session_id", "locked")
        
        if not start_times_list:
            # Fallback for old API if needed
            start_time_str = request.data.get("start_time")
            if start_time_str:
                start_times_list = [start_time_str]
                
        try:
            slot_date = date.fromisoformat(date_str)
            start_times = [time.fromisoformat(st) for st in start_times_list]
        except (ValueError, TypeError):
            return Response({"error": {"code": "BAD_REQUEST", "message": "Invalid date or time."}}, status=400)

        acquired = BookingService.acquire_checkout_lock(turf_id, slot_date, start_times, session_id)
        if not acquired:
            return Response(
                {"error": {"code": "SLOT_LOCKED", "message": "One or more slots are currently in checkout by another user."}},
                status=409,
            )
        return Response({"detail": "Slots locked for checkout.", "ttl": 180})

    def delete(self, request):
        turf_id = request.data.get("turf_id")
        date_str = request.data.get("date")
        start_times_list = request.data.get("start_times", [])
        session_id = request.data.get("session_id", "locked")
        
        if not start_times_list:
            start_time_str = request.data.get("start_time")
            if start_time_str:
                start_times_list = [start_time_str]
                
        try:
            slot_date = date.fromisoformat(date_str)
            start_times = [time.fromisoformat(st) for st in start_times_list]
        except (ValueError, TypeError):
            return Response(status=400)
        BookingService.release_checkout_lock(turf_id, slot_date, start_times, session_id)
        return Response({"detail": "Locks released."})
