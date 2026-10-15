from django.urls import path
from .views import (
    DashboardView, UserListView, UserDetailView, TransactionListView,
    DriverPanelSettingsView, AdminDemandView, SendNotificationView,
    NotificationBatchListView, NotificationBatchDeleteView,
)

urlpatterns = [
    path("dashboard/", DashboardView.as_view(), name="admin-dashboard"),
    path("users/", UserListView.as_view(), name="admin-users"),
    path("users/<int:pk>/", UserDetailView.as_view(), name="admin-user-detail"),
    path("transactions/", TransactionListView.as_view(), name="admin-transactions"),
    path("settings/", DriverPanelSettingsView.as_view(), name="admin-settings"),
    path("demand/", AdminDemandView.as_view(), name="admin-demand"),
    path("send-notification/", SendNotificationView.as_view(), name="admin-send-notification"),
    path("notification-batches/", NotificationBatchListView.as_view(), name="admin-notification-batches"),
    path("notification-batches/<int:pk>/", NotificationBatchDeleteView.as_view(), name="admin-notification-batch-delete"),
]
