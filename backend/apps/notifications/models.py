"""NotificationLog model — records every notification sent."""
from django.db import models
from apps.bookings.models import Booking


class NotificationLog(models.Model):
    SMS = "sms"
    WHATSAPP = "whatsapp"
    CHANNEL_CHOICES = [(SMS, "SMS"), (WHATSAPP, "WhatsApp")]

    SENT = "sent"
    FAILED = "failed"
    STUB = "stub"
    STATUS_CHOICES = [(SENT, "Sent"), (FAILED, "Failed"), (STUB, "Stub (Dev)")]

    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name="notifications", null=True, blank=True)
    phone = models.CharField(max_length=20)
    channel = models.CharField(max_length=10, choices=CHANNEL_CHOICES)
    message_type = models.CharField(max_length=50, default="generic")
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=STUB)
    sent_at = models.DateTimeField(auto_now_add=True)
    error_message = models.TextField(blank=True)

    class Meta:
        db_table = "notification_logs"
        ordering = ["-sent_at"]

    def __str__(self):
        return f"Notification: {self.channel} to {self.phone} ({self.status})"
