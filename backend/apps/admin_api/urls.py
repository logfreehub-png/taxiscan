from django.urls import path
from .views import (
    DashboardView, UserListView, UserDetailView, TransactionListView,
    DriverPanelSettingsView, AdminDemandView, SendNotificationView,
    NotificationBatchListView, NotificationBatchDeleteView,
    UserSearchHistoryView, AdminAccountsView, AdminAccountDetailView,
    GlobalSearchHistoryView, GrantSubscriptionView,
)

urlpatterns = [
    path("dashboard/", DashboardView.as_view(), name="admin-dashboard"),
    # Superadmin: adminlarni boshqarish + global qidiruvlar
    path("admins/", AdminAccountsView.as_view(), name="admin-accounts"),
    path("admins/<int:pk>/", AdminAccountDetailView.as_view(), name="admin-account-detail"),
    path("searches/", GlobalSearchHistoryView.as_view(), name="admin-global-searches"),
    path("users/", UserListView.as_view(), name="admin-users"),
    path("users/<int:pk>/", UserDetailView.as_view(), name="admin-user-detail"),
    path("users/<int:pk>/searches/", UserSearchHistoryView.as_view(), name="admin-user-searches"),
    path("users/<int:pk>/grant-subscription/", GrantSubscriptionView.as_view(),
         name="admin-user-grant-subscription"),
    path("transactions/", TransactionListView.as_view(), name="admin-transactions"),
    path("settings/", DriverPanelSettingsView.as_view(), name="admin-settings"),
    path("demand/", AdminDemandView.as_view(), name="admin-demand"),
    path("send-notification/", SendNotificationView.as_view(), name="admin-send-notification"),
    path("notification-batches/", NotificationBatchListView.as_view(), name="admin-notification-batches"),
    path("notification-batches/<int:pk>/", NotificationBatchDeleteView.as_view(), name="admin-notification-batch-delete"),
]
