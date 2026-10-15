from rest_framework import viewsets, generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import TaxiService, Region, PriceEstimate, FavoriteRoute, SiteSetting
from .serializers import (
    TaxiServiceSerializer,
    RegionSerializer,
    EstimateRequestSerializer,
    QuickLocalRequestSerializer,
    PriceEstimateSerializer,
    FavoriteRouteSerializer,
)
from . import services as taxi_services
from . import routing as taxi_routing
from . import demand as taxi_demand
from datetime import timedelta
from .providers.formula import calculate_price, current_surge, tashkent_now


class TaxiServiceViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = TaxiService.objects.filter(is_active=True)
    serializer_class = TaxiServiceSerializer
    permission_classes = [permissions.AllowAny]


class RegionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Region.objects.filter(is_active=True)
    serializer_class = RegionSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None  # Barcha tumanlar bir martada (xarita uchun)

    def list(self, request, *args, **kwargs):
        # Frontend {results: [...]} shaklini kutadi — shuni saqlaymiz
        data = self.get_serializer(self.filter_queryset(self.get_queryset()), many=True).data
        return Response({"results": data, "count": len(data)})


def _searcher_key(request) -> str:
    """Qidiruvchini barqaror aniqlash: login qilgan bo'lsa user id, aks holda IP.

    Talab statistikasi shu kalit bo'yicha UNIKAL odamlarni sanaydi — bitta odam
    tugmani 10 marta bossa ham "1 kishi" bo'lib qoladi.
    """
    if request.user and getattr(request.user, "is_authenticated", False):
        return f"u:{request.user.id}"
    xff = request.META.get("HTTP_X_FORWARDED_FOR", "")
    ip = xff.split(",")[0].strip() if xff else request.META.get("REMOTE_ADDR", "")
    return f"ip:{ip}" if ip else ""


class EstimateView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = EstimateRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        result = taxi_services.aggregate_estimates(
            start_lat=d["start_lat"],
            start_lng=d["start_lng"],
            end_lat=d["end_lat"],
            end_lng=d["end_lng"],
            user=request.user,
            stops=d.get("stops") or [],
            searcher_key=_searcher_key(request),
        )
        return Response(result)


class QuickLocalView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = QuickLocalRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data
        result = taxi_services.quick_local_prices(
            lat=d["lat"],
            lng=d["lng"],
            sample_distance_km=d["sample_distance_km"],
        )
        return Response(result)


class SiteSettingView(APIView):
    """Sayt global ko'rinish sozlamalari (brend rangi + standart rejim) — ochiq (auth kerak emas)."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        s = SiteSetting.get_solo()
        return Response({"brand_color": s.brand_color, "default_theme": s.default_theme})


class ReverseGeocodeView(APIView):
    """Koordinatadan joy nomini olish (Nominatim)."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        try:
            lat = float(request.query_params.get("lat"))
            lng = float(request.query_params.get("lng"))
        except (TypeError, ValueError):
            return Response({"detail": "lat va lng parametrlari kerak"},
                            status=status.HTTP_400_BAD_REQUEST)
        return Response(taxi_routing.reverse_geocode(lat, lng))


class GeocodeSearchView(APIView):
    """Joy nomi bo'yicha qidirish (Nominatim) — autocomplete uchun."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        q = request.query_params.get("q", "").strip()
        if len(q) < 2:
            return Response({"results": []})
        city = request.query_params.get("city", "Tashkent")
        return Response({"results": taxi_routing.search_address(q, city=city)})


class RouteView(APIView):
    """OSRM dan ikki nuqta orasidagi yo'l geometriyasini olish."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        try:
            d = request.data
            r = taxi_routing.get_route(
                float(d["start_lat"]), float(d["start_lng"]),
                float(d["end_lat"]), float(d["end_lng"]),
            )
        except (KeyError, TypeError, ValueError):
            return Response({"detail": "start/end koordinatalari kerak"},
                            status=status.HTTP_400_BAD_REQUEST)
        return Response(r)


class DriverDemandView(APIView):
    """Haydovchi uchun talab (demand) snapshot'i.

    Body: { lat, lng, dest_lat?, dest_lng? }
    Qaytaradi: hozirgi joy, manzil (bo'lsa) va barcha rayonlar talabi.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        from django.utils import timezone
        d = request.data
        now = timezone.now()
        try:
            lat = float(d["lat"])
            lng = float(d["lng"])
        except (KeyError, TypeError, ValueError):
            return Response({"detail": "lat va lng kerak"},
                            status=status.HTTP_400_BAD_REQUEST)

        enabled = taxi_demand.demand_visible_for(request.user)
        if not enabled:
            # Haydovchiga ko'rsatilmaydi — bo'sh, lekin xato emas
            return Response({
                "enabled": False,
                "updated_at": now.isoformat(),
                "window": taxi_demand.WINDOW_LABEL,
                "totals": None,
                "here": None,
                "destination": None,
                "regions": [],
            })

        overview = taxi_demand.build_overview(now=now)
        here = taxi_demand.demand_for_point(lat, lng, overview)

        destination = None
        if d.get("dest_lat") not in (None, "") and d.get("dest_lng") not in (None, ""):
            try:
                destination = taxi_demand.demand_for_point(
                    float(d["dest_lat"]), float(d["dest_lng"]), overview
                )
            except (TypeError, ValueError):
                destination = None

        return Response({
            "enabled": True,
            "updated_at": now.isoformat(),
            "window": taxi_demand.WINDOW_LABEL,
            "totals": taxi_demand.system_totals(now=now),
            "here": here,
            "destination": destination,
            "regions": overview,
        })


class LivePricesView(APIView):
    """Real-time narxlarni qaytaradi — har minutda o'zgaradi.

    Belgilangan sample (5 km) yo'nalish uchun barcha xizmatlar narxini hisoblaydi.
    Oldingi minut bilan farqni ham qaytaradi — ↑/↓ ko'rsatish uchun.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        try:
            distance_km = float(request.query_params.get("distance", 5.0))
            duration_min = float(request.query_params.get("duration", distance_km * 3.0))
            tier = request.query_params.get("tier")  # optional filter
        except (TypeError, ValueError):
            distance_km = 5.0
            duration_min = 15.0
            tier = None

        services = TaxiService.objects.filter(is_active=True)
        if tier:
            services = services.filter(tier=tier)

        # Toshkent soati — server UTC bo'lsa datetime.now() 5 soat adashardi
        now = tashkent_now()
        prev_minute = now - timedelta(minutes=1)
        # Bir minut oldingi narxni hisoblash uchun "soat" o'zgarmagan deb hisoblaymiz
        # (rare edge case: soat o'tib ketganda kichik sakrash bo'lishi mumkin, bu ham realistik)
        from .providers.formula import _base_hour_surge, _minute_jitter, brand_night_mult

        results = []
        for s in services:
            # brand_night_mult — WB tungi tarifi (22:40–00:20 → 2.2x) jonli
            # narxlarda ham ko'rinsin
            cur_surge = (_base_hour_surge(now.hour) * _minute_jitter(s.code, now)
                         * brand_night_mult(s.code, now))
            prev_surge = (_base_hour_surge(prev_minute.hour) * _minute_jitter(s.code, prev_minute)
                          * brand_night_mult(s.code, prev_minute))

            cur_price, _ = calculate_price(s, distance_km, duration_min, surge=cur_surge)
            prev_price, _ = calculate_price(s, distance_km, duration_min, surge=prev_surge)

            change = cur_price - prev_price
            pct = (change / prev_price * 100) if prev_price else 0

            results.append({
                "service": {
                    "id": s.id, "code": s.code, "name": s.name,
                    "brand": s.brand, "tier": s.tier, "color": s.color,
                    "logo": s.logo.url if s.logo else None,
                    "deeplink_template": s.deeplink_template,
                    "base_fare_uzs": s.base_fare_uzs,
                    "per_km_uzs": s.per_km_uzs,
                    "per_minute_uzs": s.per_minute_uzs,
                    "minimum_fare_uzs": s.minimum_fare_uzs,
                },
                "price_uzs": cur_price,
                "prev_price_uzs": prev_price,
                "change_uzs": change,
                "change_pct": round(pct, 2),
                "trend": "up" if change > 0 else ("down" if change < 0 else "flat"),
                "surge": round(cur_surge, 3),
                "distance_km": distance_km,
                "duration_min": duration_min,
            })

        results.sort(key=lambda r: r["price_uzs"])
        if results:
            results[0]["is_cheapest"] = True
            min_p = results[0]["price_uzs"]
            for r in results[1:]:
                r["diff_from_cheapest"] = r["price_uzs"] - min_p

        return Response({
            "updated_at": now.isoformat(),
            "minute_bucket": now.strftime("%H:%M"),
            "distance_km": distance_km,
            "duration_min": duration_min,
            "results": results,
        })


class PriceEstimateHistoryView(generics.ListAPIView):
    serializer_class = PriceEstimateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return PriceEstimate.objects.filter(user=self.request.user).select_related(
            "service", "region"
        )[:100]


class FavoriteRouteViewSet(viewsets.ModelViewSet):
    serializer_class = FavoriteRouteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return FavoriteRoute.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
