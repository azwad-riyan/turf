"""Payment and Payout views."""
from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.models import User
from .models import Payment, Payout


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ["id", "booking_id", "provider", "provider_txn_id", "amount", "status", "created_at"]


class PayoutSerializer(serializers.ModelSerializer):
    owner_name = serializers.CharField(source="owner.business_name", read_only=True)

    class Meta:
        model = Payout
        fields = [
            "id", "owner_name", "period_start", "period_end",
            "gross_amount", "fee_deducted", "net_payout", "status", "paid_at", "created_at",
        ]


class OwnerPayoutListView(APIView):
    """GET /api/v1/payments/payouts/ — Owner's payout history."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role == User.OWNER:
            payouts = Payout.objects.filter(owner=request.user.owner_profile)
        elif request.user.role == User.ADMIN:
            payouts = Payout.objects.all().select_related("owner")
        else:
            return Response(status=403)
        return Response(PayoutSerializer(payouts, many=True).data)


class OwnerFeeBalanceView(APIView):
    """GET /api/v1/payments/balance/ — Outstanding platform fee balance for owner."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != User.OWNER:
            return Response(status=403)
        from apps.bookings.models import Booking
        turfs = request.user.owner_profile.turfs.values_list("id", flat=True)
        total_fee = (
            Booking.objects.filter(turf_id__in=turfs, status=Booking.CONFIRMED)
            .aggregate(total=__import__("django.db.models", fromlist=["Sum"]).Sum("platform_fee"))
        )["total"] or 0
        paid_out = (
            Payout.objects.filter(owner=request.user.owner_profile, status=Payout.PAID)
            .aggregate(total=__import__("django.db.models", fromlist=["Sum"]).Sum("fee_deducted"))
        )["total"] or 0
        return Response({
            "total_fee_owed": total_fee,
            "total_paid": paid_out,
            "outstanding_balance": total_fee - paid_out,
        })
