from django.urls import path
from .views import OwnerPayoutListView, OwnerFeeBalanceView

urlpatterns = [
    path("payouts/", OwnerPayoutListView.as_view(), name="payouts"),
    path("balance/", OwnerFeeBalanceView.as_view(), name="fee-balance"),
]
