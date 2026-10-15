from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TaxiServiceViewSet,
    RegionViewSet,
    EstimateView,
    QuickLocalView,
    PriceEstimateHistoryView,
    FavoriteRouteViewSet,
    ReverseGeocodeView,
    GeocodeSearchView,
    RouteView,
    LivePricesView,
    DriverDemandView,
    SiteSettingView,
)

router = DefaultRouter()
router.register(r"services", TaxiServiceViewSet, basename="taxi-service")
router.register(r"regions", RegionViewSet, basename="region")
router.register(r"favorites", FavoriteRouteViewSet, basename="favorite-route")

urlpatterns = [
    path("estimate/", EstimateView.as_view(), name="taxi-estimate"),
    path("quick-local/", QuickLocalView.as_view(), name="taxi-quick-local"),
    path("live-prices/", LivePricesView.as_view(), name="taxi-live-prices"),
    path("demand/", DriverDemandView.as_view(), name="taxi-demand"),
    path("history/", PriceEstimateHistoryView.as_view(), name="taxi-history"),
    path("geocode/reverse/", ReverseGeocodeView.as_view(), name="geocode-reverse"),
    path("geocode/search/", GeocodeSearchView.as_view(), name="geocode-search"),
    path("route/", RouteView.as_view(), name="route"),
    path("site-settings/", SiteSettingView.as_view(), name="site-settings"),
    path("", include(router.urls)),
]
