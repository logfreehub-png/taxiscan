"""Foydalanuvchi qidiruvlarini tarixga yozish (admin panel uchun)."""
from datetime import timedelta
import logging

from django.utils import timezone

from .models import SearchHistory

log = logging.getLogger(__name__)

# Narxlar har 15 soniyada avtomatik yangilanadi — bir xil qidiruv takror yozilmasligi uchun
ROUTE_DEDUP = timedelta(minutes=10)
LOCAL_DEDUP = timedelta(minutes=30)
SAME_PLACE_DEG = 0.002  # ~200 m


def _near(a, b):
    return a is not None and b is not None and abs(a - b) < SAME_PLACE_DEG


def _prices(results):
    prices = [r.get("price_uzs") for r in results or [] if r.get("price_uzs")]
    return (min(prices), max(prices)) if prices else (None, None)


def record_route_search(user, data: dict, result: dict):
    if not user or not user.is_authenticated:
        return
    try:
        recent = (
            SearchHistory.objects.filter(
                user=user, kind="route", created_at__gte=timezone.now() - ROUTE_DEDUP
            )
            .order_by("-created_at")
            .first()
        )
        if (
            recent
            and _near(recent.start_lat, data["start_lat"]) and _near(recent.start_lng, data["start_lng"])
            and _near(recent.end_lat, data["end_lat"]) and _near(recent.end_lng, data["end_lng"])
        ):
            return

        route = result.get("route") or {}
        geom = (route.get("geometry") or {}).get("coordinates") or []
        lo, hi = _prices(result.get("results"))
        SearchHistory.objects.create(
            user=user,
            kind="route",
            start_lat=data["start_lat"],
            start_lng=data["start_lng"],
            start_address=(data.get("start_address") or "")[:255],
            end_lat=data["end_lat"],
            end_lng=data["end_lng"],
            end_address=(data.get("end_address") or "")[:255],
            stops=[
                {"lat": s.get("lat"), "lng": s.get("lng"), "address": s.get("address", "")}
                for s in (data.get("stops") or [])
            ],
            distance_km=route.get("distance_km"),
            duration_min=route.get("duration_min"),
            min_price_uzs=lo,
            max_price_uzs=hi,
            # Juda uzun geometriyani siqamiz (har N-nuqta)
            route_coords=geom[:: max(1, len(geom) // 400)] if geom else [],
        )
    except Exception:  # tarix yozilmasa ham asosiy javob buzilmasin
        log.exception("route search history yozilmadi")


def record_local_search(user, lat: float, lng: float, result: dict):
    if not user or not user.is_authenticated:
        return
    try:
        recent = (
            SearchHistory.objects.filter(
                user=user, kind="local", created_at__gte=timezone.now() - LOCAL_DEDUP
            )
            .order_by("-created_at")
            .first()
        )
        if recent and _near(recent.start_lat, lat) and _near(recent.start_lng, lng):
            return
        lo, hi = _prices((result or {}).get("results"))
        SearchHistory.objects.create(
            user=user, kind="local", start_lat=lat, start_lng=lng,
            min_price_uzs=lo, max_price_uzs=hi,
        )
    except Exception:
        log.exception("local search history yozilmadi")
