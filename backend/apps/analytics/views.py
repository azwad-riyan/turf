"""Analytics views — occupancy, revenue, and platform-wide stats."""
from datetime import date, timedelta

from django.db.models import Count, Sum, Avg, Q
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.bookings.models import Booking
from apps.turfs.models import Turf
from apps.users.models import User


class OwnerAnalyticsView(APIView):
    """GET /api/v1/analytics/owner/ — Occupancy & revenue for owner's turfs."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role not in [User.OWNER, User.ADMIN]:
            return Response(status=403)

        days = int(request.query_params.get("days", 30))
        end = date.today()
        start = end - timedelta(days=days)

        if request.user.role == User.OWNER:
            turfs = request.user.owner_profile.turfs.filter(is_active=True)
        else:
            turf_id = request.query_params.get("turf_id")
            turfs = Turf.objects.filter(id=turf_id) if turf_id else Turf.objects.all()

        bookings = Booking.objects.filter(
            turf__in=turfs, date__range=(start, end)
        ).exclude(status=Booking.CANCELLED)

        total_bookings = bookings.count()
        total_revenue = bookings.aggregate(Sum("amount"))["amount__sum"] or 0
        total_fees = bookings.aggregate(Sum("platform_fee"))["platform_fee__sum"] or 0

        # Bookings by status
        status_breakdown = (
            bookings.values("status").annotate(count=Count("id"))
        )

        # Bookings by day of week
        by_day = (
            bookings.extra(select={"day": "EXTRACT(DOW FROM date)"})
            .values("day").annotate(count=Count("id")).order_by("day")
        )

        # Repeat vs new players
        returning = bookings.values("player_phone").annotate(n=Count("id")).filter(n__gt=1).count()

        return Response({
            "period": {"start": start.isoformat(), "end": end.isoformat(), "days": days},
            "total_bookings": total_bookings,
            "total_revenue": total_revenue,
            "platform_fees": total_fees,
            "net_revenue": total_revenue - total_fees,
            "status_breakdown": list(status_breakdown),
            "bookings_by_day": list(by_day),
            "returning_players": returning,
            "new_players": total_bookings - returning,
        })


class AdminDashboardView(APIView):
    """GET /api/v1/analytics/admin/ — Platform-wide analytics."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != User.ADMIN:
            return Response(status=403)

        days = int(request.query_params.get("days", 30))
        end = date.today()
        start = end - timedelta(days=days)

        bookings = Booking.objects.filter(date__range=(start, end))
        active_bookings = bookings.exclude(status=Booking.CANCELLED)

        gmv = active_bookings.aggregate(Sum("amount"))["amount__sum"] or 0
        fees = active_bookings.aggregate(Sum("platform_fee"))["platform_fee__sum"] or 0

        top_turfs = (
            active_bookings.values("turf__name", "turf__id")
            .annotate(bookings=Count("id"), revenue=Sum("amount"))
            .order_by("-bookings")[:10]
        )

        return Response({
            "period": {"start": start.isoformat(), "end": end.isoformat()},
            "total_bookings": bookings.count(),
            "active_bookings": active_bookings.count(),
            "cancelled_bookings": bookings.filter(status=Booking.CANCELLED).count(),
            "gmv": gmv,
            "platform_fees": fees,
            "active_turfs": Turf.objects.filter(is_active=True).count(),
            "total_users": User.objects.filter(role=User.PLAYER).count(),
            "top_turfs": list(top_turfs),
        })
