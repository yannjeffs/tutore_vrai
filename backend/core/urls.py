from django.urls import path
from .views import AdminDashboardStatsView

urlpatterns = [
    path('dashboard/admin/', AdminDashboardStatsView.as_view(), name='admin-dashboard'),
]
