"""
Booking model — the heart of the platform.
Critical: UniqueConstraint prevents double-booking at the DB level.
"""
from django.db import models
from django.db.models import Q, UniqueConstraint
from apps.users.models import User
from apps.turfs.models import Turf


class Booking(models.Model):
    # Sources
    ONLINE = "online"
    OFFLINE = "offline_manual"
    SOURCE_CHOICES = [(ONLINE, "Online"), (OFFLINE, "Offline (Manual)")]

    # Statuses
    PENDING_PAYMENT = "pending_payment"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    COMPLETED = "completed"
    NO_SHOW = "no_show"
    STATUS_CHOICES = [
        (PENDING_PAYMENT, "Pending Payment"),
        (CONFIRMED, "Confirmed"),
        (CANCELLED, "Cancelled"),
        (COMPLETED, "Completed"),
        (NO_SHOW, "No-Show"),
    ]

    # Payment methods
    CASH = "cash"
    BKASH = "bkash"
    NAGAD = "nagad"
    PAYMENT_METHOD_CHOICES = [
        (CASH, "Cash on Arrival"),
        (BKASH, "bKash"),
        (NAGAD, "Nagad"),
    ]

    # Payment statuses
    UNPAID = "unpaid"
    PAID = "paid"
    REFUNDED = "refunded"
    PAYMENT_STATUS_CHOICES = [
        (UNPAID, "Unpaid"),
        (PAID, "Paid"),
        (REFUNDED, "Refunded"),
    ]

    turf = models.ForeignKey(Turf, on_delete=models.PROTECT, related_name="bookings")
    player = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="bookings", help_text="Null for guest checkouts"
    )
    # Guest checkout fields (used when player is not registered)
    player_name = models.CharField(max_length=100)
    player_phone = models.CharField(max_length=20)
    player_count = models.PositiveSmallIntegerField(default=1)

    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()

    source = models.CharField(max_length=15, choices=SOURCE_CHOICES, default=ONLINE)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default=CONFIRMED)
    payment_method = models.CharField(
        max_length=10, choices=PAYMENT_METHOD_CHOICES, default=CASH
    )
    payment_status = models.CharField(
        max_length=10, choices=PAYMENT_STATUS_CHOICES, default=UNPAID
    )

    amount = models.PositiveIntegerField(help_text="Total slot price in BDT")
    platform_fee = models.PositiveIntegerField(help_text="Platform fee in BDT")
    amount_paid = models.PositiveIntegerField(default=0)

    # Who created this booking
    created_by_player = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="bookings_created_as_player",
    )
    created_by_owner = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="bookings_created_as_owner",
        help_text="Set when owner marks an offline booking",
    )

    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancellation_reason = models.CharField(max_length=300, blank=True)

    class Meta:
        db_table = "bookings"
        ordering = ["-created_at"]
        constraints = [
            # ── CRITICAL: The double-booking prevention constraint ──────────────
            # Only one non-cancelled booking can exist for (turf, date, start_time)
            UniqueConstraint(
                fields=["turf", "date", "start_time"],
                condition=~Q(status="cancelled"),
                name="unique_active_booking_per_slot",
            )
        ]
        indexes = [
            models.Index(fields=["turf", "date"], name="idx_booking_turf_date"),
            models.Index(fields=["player_phone"], name="idx_booking_player_phone"),
            models.Index(fields=["status"], name="idx_booking_status"),
        ]

    def __str__(self):
        return f"Booking {self.id}: {self.turf.name} {self.date} {self.start_time} ({self.status})"

    @property
    def slot_label(self):
        return f"{self.start_time.strftime('%I:%M %p')} – {self.end_time.strftime('%I:%M %p')}"


class BookingAuditLog(models.Model):
    """Immutable audit trail of all booking status changes."""
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name="audit_logs")
    changed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    previous_status = models.CharField(max_length=15)
    new_status = models.CharField(max_length=15)
    reason = models.CharField(max_length=300, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "booking_audit_logs"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Audit: Booking {self.booking_id} {self.previous_status}→{self.new_status}"
