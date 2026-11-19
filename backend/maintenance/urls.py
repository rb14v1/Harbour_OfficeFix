from django.urls import path

from . import views

urlpatterns = [
    path("requests", views.RequestListCreateView.as_view(), name="requests"),
    path("requests/<int:request_id>", views.RequestDetailView.as_view(), name="request-detail"),
    path("technicians", views.TechnicianListCreateView.as_view(), name="technicians"),
    path("technicians/<int:technician_id>", views.TechnicianDetailView.as_view(), name="technician-detail"),
    path("dashboard/stats", views.DashboardStatsView.as_view(), name="dashboard-stats"),
]
