from django.urls import path
from .views import OwnerAnalyticsView, AdminDashboardView

urlpatterns = [
    path("owner/", OwnerAnalyticsView.as_view(), name="owner-analytics"),
    path("admin/", AdminDashboardView.as_view(), name="admin-analytics"),
]
