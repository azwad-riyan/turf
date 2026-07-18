"""Turf API views."""
import logging
from datetime import date, timedelta

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response

from apps.users.models import User
from services.slot_service import SlotService
from .models import Turf, OperatingSchedule, SlotOverride
from .serializers import (
    TurfListSerializer,
    TurfDetailSerializer,
    TurfCreateUpdateSerializer,
    OperatingScheduleSerializer,
    SlotOverrideSerializer,
    TurfPhotoSerializer,
)

logger = logging.getLogger(__name__)
slot_service = SlotService()


class IsOwnerOfTurf(IsAuthenticated):
    """Allow access only to the owner of the turf being accessed."""
    def has_object_permission(self, request, view, obj):
        if request.user.role == User.ADMIN:
            return True
        return obj.owner.user == request.user


class TurfViewSet(viewsets.ModelViewSet):
    queryset = Turf.objects.filter(is_active=True).select_related("owner__user").prefetch_related("photos", "schedules")
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["area", "is_active"]
    search_fields = ["name", "address", "area", "description"]
    ordering_fields = ["base_price", "average_rating", "created_at"]
    ordering = ["-average_rating"]

    def get_serializer_class(self):
        if self.action == "list":
            return TurfListSerializer
        if self.action in ["create", "update", "partial_update"]:
            return TurfCreateUpdateSerializer
        return TurfDetailSerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve", "availability", "slots"]:
            return [AllowAny()]
        return [IsOwnerOfTurf()]

    def filter_queryset(self, queryset):
        qs = super().filter_queryset(queryset)
        sport = self.request.query_params.get("sport")
        if sport:
            qs = qs.filter(sport_types__contains=[sport])
        min_price = self.request.query_params.get("min_price")
        max_price = self.request.query_params.get("max_price")
        if min_price:
            qs = qs.filter(base_price__gte=min_price)
        if max_price:
            qs = qs.filter(base_price__lte=max_price)
        return qs

    def perform_create(self, serializer):
        owner = self.request.user.owner_profile
        serializer.save(owner=owner)

    @action(detail=True, methods=["get"], url_path="slots")
    def slots(self, request, pk=None):
        """GET /api/v1/turfs/{id}/slots/?date=YYYY-MM-DD"""
        turf = self.get_object()
        date_str = request.query_params.get("date")
        try:
            slot_date = date.fromisoformat(date_str) if date_str else date.today()
        except ValueError:
            return Response({"error": "Invalid date format. Use YYYY-MM-DD."}, status=400)

        slots = slot_service.get_slots_for_date(turf, slot_date)
        return Response({
            "turf_id": turf.id,
            "date": slot_date.isoformat(),
            "slots": [s.to_dict() for s in slots],
        })

    @action(detail=True, methods=["get"], url_path="availability")
    def availability(self, request, pk=None):
        """GET /api/v1/turfs/{id}/availability/?start=YYYY-MM-DD&days=7"""
        turf = self.get_object()
        start_str = request.query_params.get("start")
        days = min(int(request.query_params.get("days", 7)), 30)
        try:
            start = date.fromisoformat(start_str) if start_str else date.today()
        except ValueError:
            return Response({"error": "Invalid date."}, status=400)
        end = start + timedelta(days=days - 1)
        return Response(slot_service.get_availability_for_range(turf, start, end))

    @action(detail=True, methods=["post", "get", "delete"], url_path="schedules")
    def schedules(self, request, pk=None):
        turf = self.get_object()
        if request.method == "GET":
            schedules = turf.schedules.all()
            return Response(OperatingScheduleSerializer(schedules, many=True).data)
        if request.method == "POST":
            serializer = OperatingScheduleSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save(turf=turf)
            return Response(serializer.data, status=201)

    @action(detail=True, methods=["post"], url_path="upload-photo")
    def upload_photo(self, request, pk=None):
        turf = self.get_object()
        photo_file = request.FILES.get("image")
        if not photo_file:
            return Response({"error": "No image provided."}, status=400)
        is_primary = not turf.photos.exists()
        photo = turf.photos.create(image=photo_file, is_primary=is_primary)
        return Response(TurfPhotoSerializer(photo, context={"request": request}).data, status=201)

    @action(detail=True, methods=["post"], url_path="overrides")
    def overrides(self, request, pk=None):
        turf = self.get_object()
        serializer = SlotOverrideSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(turf=turf)
        return Response(serializer.data, status=201)
