from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    MySubscriptionView,
    PaymeCheckoutView,
    PaymeOrderStatusView,
    CancelSubscriptionView,
    CardViewSet,
    AddCardView,
    TransactionListView,
    PromoCodeAdminViewSet,
    RedeemPromoView,
    MyPromoRedemptionsView,
)
from .payme import PaymeWebhookView

router = DefaultRouter()
router.register(r"cards", CardViewSet, basename="card")
router.register(r"admin/promo-codes", PromoCodeAdminViewSet, basename="promo-code")

urlpatterns = [
    # Aniq yo'llar oldin bo'lishi kerak — DefaultRouter cards/<pk>/ ni ushlamasin
    path("cards/add/", AddCardView.as_view(), name="add-card"),
    path("subscription/", MySubscriptionView.as_view(), name="my-subscription"),
    # Eski /subscribe/ ham checkout havolasini qaytaradi (web'ni buzmaslik uchun)
    path("subscribe/", PaymeCheckoutView.as_view(), name="subscribe"),
    path("payme/checkout/", PaymeCheckoutView.as_view(), name="payme-checkout"),
    path("payme/status/", PaymeOrderStatusView.as_view(), name="payme-status"),
    # Payme serveridan keladigan JSON-RPC so'rovlar (Basic auth bilan himoyalangan)
    path("payme/", PaymeWebhookView.as_view(), name="payme-webhook"),
    path("cancel/", CancelSubscriptionView.as_view(), name="cancel-subscription"),
    path("transactions/", TransactionListView.as_view(), name="transactions"),
    # Promo-kod
    path("promo/redeem/", RedeemPromoView.as_view(), name="promo-redeem"),
    path("promo/mine/", MyPromoRedemptionsView.as_view(), name="promo-mine"),
    path("", include(router.urls)),
]
