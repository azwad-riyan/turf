"""Payment and Payout models."""
from django.db import models
from apps.users.models import Owner
from apps.bookings.models import Booking


class Payment(models.Model):
    CASH = "cash"
    BKASH = "bkash"
    NAGAD = "nagad"
    PROVIDER_CHOICES = [(CASH, "Cash"), (BKASH, "bKash"), (NAGAD, "Nagad")]

    PENDING = "pending"
    SUCCESS = "success"
    FAILED = "failed"
    REFUNDED = "refunded"
    STATUS_CHOICES = [(PENDING, "Pending"), (SUCCESS, "Success"), (FAILED, "Failed"), (REFUNDED, "Refunded")]

    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name="payments")
    provider = models.CharField(max_length=10, choices=PROVIDER_CHOICES)
    provider_txn_id = models.CharField(max_length=100, blank=True, help_text="Provider transaction ID")
    amount = models.PositiveIntegerField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "payments"

    def __str__(self):
        return f"Payment {self.id}: {self.provider} ৳{self.amount} ({self.status})"


class Payout(models.Model):
    PENDING = "pending"
    PROCESSING = "processing"
    PAID = "paid"
    STATUS_CHOICES = [(PENDING, "Pending"), (PROCESSING, "Processing"), (PAID, "Paid")]

    owner = models.ForeignKey(Owner, on_delete=models.CASCADE, related_name="payouts")
    period_start = models.DateField()
    period_end = models.DateField()
    gross_amount = models.PositiveIntegerField(help_text="Total slot revenue in period")
    fee_deducted = models.PositiveIntegerField(help_text="Total platform fees deducted")
    net_payout = models.PositiveIntegerField(help_text="Gross - fee = amount owed to owner")
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default=PENDING)
    paid_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "payouts"
        ordering = ["-period_end"]

    def __str__(self):
        return f"Payout {self.id}: {self.owner.business_name} ৳{self.net_payout} ({self.status})"
