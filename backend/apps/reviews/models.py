"""Review model."""
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models
from apps.bookings.models import Booking
from apps.turfs.models import Turf
from apps.users.models import User


class Review(models.Model):
    turf = models.ForeignKey(Turf, on_delete=models.CASCADE, related_name="reviews")
    booking = models.OneToOneField(Booking, on_delete=models.CASCADE, related_name="review", null=True, blank=True)
    player = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="reviews")
    player_name = models.CharField(max_length=100, blank=True)
    rating = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    comment = models.TextField(blank=True)
    is_flagged = models.BooleanField(default=False, help_text="Flagged for moderation")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "reviews"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Review: {self.turf.name} — {self.rating}★ by {self.player_name or 'Guest'}"

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        if not self.player_name and self.player:
            self.player_name = self.player.name
        super().save(*args, **kwargs)
        if is_new:
            self.turf.update_rating(self.rating)
