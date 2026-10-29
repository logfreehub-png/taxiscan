from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView, LoginView, MeView, ProfileCompletionView,
    SimpleRegisterView, ChangePasswordView,
    PasswordResetRequestView, PasswordResetConfirmView,
    NotificationListView, NotificationUnreadCountView, NotificationMarkReadView,
    PushTokenView,
    DeleteAccountLookupView, DeleteAccountVerifyView, DeleteAccountConfirmView,
    SendVerificationCodeView, VerifyPhoneCodeView, CheckVerificationStatusView,
    PhonePasswordResetConfirmView,
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="auth-register"),
    path("register-simple/", SimpleRegisterView.as_view(), name="auth-register-simple"),
    path("phone/send-code/", SendVerificationCodeView.as_view(), name="phone-send-code"),
    path("phone/verify-code/", VerifyPhoneCodeView.as_view(), name="phone-verify-code"),
    path("phone/check-status/", CheckVerificationStatusView.as_view(), name="phone-check-status"),
    path("login/", LoginView.as_view(), name="auth-login"),
    path("refresh/", TokenRefreshView.as_view(), name="auth-refresh"),
    path("me/", MeView.as_view(), name="auth-me"),
    path("profile/complete/", ProfileCompletionView.as_view(), name="profile-complete"),
    path("change-password/", ChangePasswordView.as_view(), name="auth-change-password"),
    path("password-reset/request/", PasswordResetRequestView.as_view(), name="auth-pwreset-request"),
    path("password-reset/confirm/", PasswordResetConfirmView.as_view(), name="auth-pwreset-confirm"),
    path("password-reset/phone-confirm/", PhonePasswordResetConfirmView.as_view(), name="auth-pwreset-phone-confirm"),
    path("notifications/", NotificationListView.as_view(), name="notifications"),
    path("notifications/unread-count/", NotificationUnreadCountView.as_view(), name="notifications-unread"),
    path("notifications/mark-read/", NotificationMarkReadView.as_view(), name="notifications-mark-read"),
    path("push-token/", PushTokenView.as_view(), name="push-token"),
    path("delete-account/lookup/", DeleteAccountLookupView.as_view(), name="delete-account-lookup"),
    path("delete-account/verify/", DeleteAccountVerifyView.as_view(), name="delete-account-verify"),
    path("delete-account/confirm/", DeleteAccountConfirmView.as_view(), name="delete-account-confirm"),
]
