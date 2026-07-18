"""
Turf models: Turf, OperatingSchedule, SlotOverride.
"""
from django.db import models
from django.contrib.postgres.fields import ArrayField
from apps.users.models import Owner


class Turf(models.Model):
    FOOTBALL = "football"
    CRICKET = "cricket"
    VOLLEYBALL = "volleyball"
    SPORT_CHOICES = [
        (FOOTBALL, "Football"),
        (CRICKET, "Cricket"),
        (VOLLEYBALL, "Volleyball"),
    ]

    owner = models.ForeignKey(Owner, on_delete=models.CASCADE, related_name="turfs")
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    address = models.TextField()
    area = models.CharField(max_length=100, help_text="Area/neighbourhood in Rajshahi")
    lat = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    lng = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    sport_types = ArrayField(
        models.CharField(max_length=20, choices=SPORT_CHOICES),
        default=list,
        help_text="List of sports available at this turf",
    )
    amenities = ArrayField(
        models.CharField(max_length=50),
        default=list,
        blank=True,
        help_text="e.g. ['lights','changing_room','parking','water']",
    )
    base_price = models.PositiveIntegerField(help_text="Price per slot in BDT")
    contact_phone = models.CharField(max_length=20, blank=True)
    is_active = models.BooleanField(default=True)
    cancellation_hours = models.PositiveIntegerField(
        default=3,
        help_text="Free cancellation up to this many hours before slot start",
    )
    average_rating = models.DecimalField(
        max_digits=3, decimal_places=2, default=0.00
    )
    total_reviews = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "turfs"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.area})"

    def update_rating(self, new_rating: float):
        """Recalculate average rating after a new review."""
        total = self.average_rating * self.total_reviews + new_rating
        self.total_reviews += 1
        self.average_rating = round(total / self.total_reviews, 2)
        self.save(update_fields=["average_rating", "total_reviews"])


class TurfPhoto(models.Model):
    turf = models.ForeignKey(Turf, on_delete=models.CASCADE, related_name="photos")
    image = models.ImageField(upload_to="turf_photos/")
    is_primary = models.BooleanField(default=False)
    order = models.PositiveSmallIntegerField(default=0)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "turf_photos"
        ordering = ["order"]

    def __str__(self):
        return f"Photo for {self.turf.name} (primary={self.is_primary})"


class OperatingSchedule(models.Model):
    """Day-of-week operating hours for a turf."""
    DAYS = [
        (0, "Monday"), (1, "Tuesday"), (2, "Wednesday"),
        (3, "Thursday"), (4, "Friday"), (5, "Saturday"), (6, "Sunday"),
    ]

    turf = models.ForeignKey(Turf, on_delete=models.CASCADE, related_name="schedules")
    day_of_week = models.PositiveSmallIntegerField(choices=DAYS)
    open_time = models.TimeField()
    close_time = models.TimeField()
    slot_duration_min = models.PositiveSmallIntegerField(
        default=90, help_text="Slot duration in minutes (default 90)"
    )
    is_closed = models.BooleanField(
        default=False, help_text="Mark this day as closed (no slots)"
    )

    class Meta:
        db_table = "operating_schedules"
        unique_together = [("turf", "day_of_week")]
        ordering = ["day_of_week"]

    def __str__(self):
        return f"{self.turf.name} — {self.get_day_of_week_display()}: {self.open_time}–{self.close_time}"


class SlotOverride(models.Model):
    """Date-specific override: block a slot or set a special price."""
    BLOCKED = "blocked"
    SPECIAL_PRICE = "special_price"
    STATUS_CHOICES = [
        (BLOCKED, "Blocked / Maintenance"),
        (SPECIAL_PRICE, "Special Price"),
    ]

    turf = models.ForeignKey(Turf, on_delete=models.CASCADE, related_name="slot_overrides")
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default=BLOCKED)
    price = models.PositiveIntegerField(
        null=True, blank=True, help_text="Override price (only for special_price status)"
    )
    reason = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "slot_overrides"
        ordering = ["date", "start_time"]

    def __str__(self):
        return f"{self.turf.name} override — {self.date} {self.start_time}–{self.end_time} ({self.status})"
