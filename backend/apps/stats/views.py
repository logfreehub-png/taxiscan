from rest_framework import permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Avg, Min, Max, Count, F
from django.db.models.functions import TruncDate, ExtractHour
from django.utils import timezone
from datetime import timedelta

from apps.taxi.models import PriceEstimate, TaxiService, Region


class HourlyByBrandView(APIView):
    """BUGUNGI kun (00:00→hozir) bo'yicha har bir brend narx DINAMIKASI.

    MUHIM: narxlar JONLI formuladan hisoblanadi (sparse/eski PriceEstimate emas) —
    shuning uchun har doim ANIQ, vaqt bo'yicha O'YNAYDI va to'g'ri tartiblanadi:
    eng QIMMAT brend tepada, eng ARZON pastda. Surge har brend uchun turli fazada
    aylangani uchun kim qimmat/arzon ekani vaqt o'tib almashinadi.
    """
    permission_classes = [permissions.AllowAny]

    # Vakil safar (narx dinamikasini ko'rsatish uchun) — ~5 km, ~12 daqiqa
    SAMPLE_KM = 5.0
    SAMPLE_MIN = 12.0

    def get(self, request):
        from datetime import datetime, timedelta
        from apps.taxi.models import TaxiService
        from apps.taxi.providers.formula import calculate_price, current_surge, region_level
        from apps.taxi.services import find_region_for_point
        from .models import HourlyPriceSnapshot

        now = timezone.localtime()
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        now_hour = now.hour
        weekday = now.weekday()
        today = now.date()
        tier = request.query_params.get("tier") or "econom"

        # Joylashuvga bog'liq narx: haydovchi turgan tuman (lat/lng) berilsa, o'sha
        # tumanning UMUMIY narx darajasi (region_level, barcha brendga teng) qo'llanadi
        # — Yunusobodda turgan haydovchi Yunusobod narxini, Chilonzorda Chilonzornikini
        # ko'radi. Snapshot'lar BAZA (hududsiz) saqlanadi → tarix barqaror; daraja faqat
        # ko'rsatishda ko'paytiriladi (har tumanda deterministik, "o'ynab" turmaydi).
        region = None
        try:
            lat = request.query_params.get("lat")
            lng = request.query_params.get("lng")
            if lat and lng:
                region = find_region_for_point(float(lat), float(lng))
        except (TypeError, ValueError):
            region = None
        rlvl = region_level(region.id) if region else 1.0

        def disp(p):
            """Baza narxni hududiy darajaga ko'paytirib, 100 so'mga yumaloqlaydi."""
            return round(p * rlvl / 100) * 100

        services = list(
            TaxiService.objects.filter(is_active=True, tier=tier).order_by("sort_order")
        )
        # order_by() ni tozalaymiz — aks holda default ordering distinct'ni buzadi
        available_tiers = list(
            TaxiService.objects.filter(is_active=True)
            .order_by("tier").values_list("tier", flat=True).distinct()
        )

        def live_price(service, hour):
            """Vakil safar uchun narx — solishtirish bilan AYNAN bir xil formula
            (current_surge), shuning uchun har brend mustaqil harakatlanadi: pik soatda
            spread kengayadi, kim arzon ekani vaqt o'tib o'zgaradi. Trend/strelka shu
            harakatdan kelib chiqadi (endi brendlar bir xil emas — nomuvofiqlik yo'q)."""
            dt = now if hour == now_hour else now.replace(
                hour=hour, minute=30, second=0, microsecond=0)
            surge = current_surge(hour=hour, service_code=service.code,
                                  weekday=weekday, when=dt)
            price, _ = calculate_price(service, self.SAMPLE_KM, self.SAMPLE_MIN, surge=surge)
            return price

        # Mavjud snapshot'lar (bugun, shu tarif) — TARIX shu yerdan, o'zgarmaydi
        existing = {
            (s.brand, s.hour): s.price_uzs
            for s in HourlyPriceSnapshot.objects.filter(day=today, tier=tier)
        }
        to_create = []
        brands = {}
        for s in services:
            by_hour = {}
            for h in range(now_hour + 1):
                if h == now_hour:
                    # Joriy (tugamagan) soat — jonli, snapshot yangilanadi
                    price = live_price(s, h)
                    HourlyPriceSnapshot.objects.update_or_create(
                        tier=tier, brand=s.brand, day=today, hour=h,
                        defaults={"price_uzs": price, "color": s.color},
                    )
                elif (s.brand, h) in existing:
                    # O'tgan soat — saqlangan qiymat, QAYTA HISOBLANMAYDI
                    price = existing[(s.brand, h)]
                else:
                    # Hali yozilmagan o'tgan soat — bir marta hisoblab QOTIRAMIZ
                    price = live_price(s, h)
                    to_create.append(HourlyPriceSnapshot(
                        tier=tier, brand=s.brand, day=today, hour=h,
                        price_uzs=price, color=s.color,
                    ))
                by_hour[h] = price
            brands[s.brand] = {"brand": s.brand, "color": s.color, "by_hour": by_hour}
        if to_create:
            HourlyPriceSnapshot.objects.bulk_create(to_create, ignore_conflicts=True)

        chart = []
        for h in range(now_hour + 1):
            point = {"hour": h, "label": f"{h:02d}:00"}
            for b, info in brands.items():
                point[b] = disp(info["by_hour"][h])   # hududiy daraja qo'llanadi
            chart.append(point)

        def trend_of(by_hour):
            if now_hour < 1:
                return "flat", 0.0
            last, prev = by_hour[now_hour], by_hour[now_hour - 1]
            if not prev:
                return "flat", 0.0
            pct = round((last - prev) / prev * 100, 1)
            if pct > 1:
                return "up", pct
            if pct < -1:
                return "down", pct
            return "flat", pct

        series = []
        for b, info in brands.items():
            trend, pct = trend_of(info["by_hour"])   # nisbat — daraja ta'sir qilmaydi
            vals = [disp(v) for v in info["by_hour"].values()]
            series.append({
                "brand": b,
                "color": info["color"],
                "current": disp(info["by_hour"][now_hour]),
                "max": max(vals) if vals else 0,
                "min": min(vals) if vals else 0,
                "trend": trend,
                "trend_pct": pct,
            })
        # Eng QIMMAT tepada, eng ARZON pastda
        series.sort(key=lambda s: -s["current"])

        rising = max(
            (s for s in series if s["trend"] == "up"),
            key=lambda s: s["trend_pct"],
            default=None,
        )

        return Response({
            "updated_at": timezone.now().isoformat(),
            "date": start.date().isoformat(),
            "tier": tier,
            "available_tiers": available_tiers,
            "series": series,
            "chart": chart,
            "region": {"id": region.id, "name": region.name} if region else None,
            "rising": {"brand": rising["brand"], "trend_pct": rising["trend_pct"], "color": rising["color"]} if rising else None,
        })


class DailyStatsView(APIView):
    """Bugungi kun bo'yicha har bir taxi xizmati statistikasi.

    Query params:
      - region: int (optional) — tuman ID
      - days: int (default 1) — necha kunlikni ko'rsatish
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        days = int(request.query_params.get("days", 1))
        region_id = request.query_params.get("region")

        since = timezone.now() - timedelta(days=days)
        qs = PriceEstimate.objects.filter(created_at__gte=since)
        if region_id:
            qs = qs.filter(region_id=region_id)

        per_service = qs.values(
            "service__id", "service__code", "service__name", "service__color"
        ).annotate(
            avg_price=Avg("price_uzs"),
            min_price=Min("price_uzs"),
            max_price=Max("price_uzs"),
            avg_distance=Avg("distance_km"),
            avg_duration=Avg("duration_min"),
            count=Count("id"),
        ).order_by("avg_price")

        # cheapest_count — necha marta eng arzon bo'lgan
        cheapest_counts = {}
        # Har bir so'rov uchun (start_lat,start_lng,end_lat,end_lng,created_at) bo'yicha guruhlash
        # Hozircha oddiyroq: faqat eng past o'rtacha narxli xizmat ko'rsatamiz
        results = list(per_service)
        for r in results:
            r["avg_price"] = int(r["avg_price"] or 0)
            r["min_price"] = int(r["min_price"] or 0)
            r["max_price"] = int(r["max_price"] or 0)
            r["avg_distance"] = round(r["avg_distance"] or 0, 2)
            r["avg_duration"] = round(r["avg_duration"] or 0, 1)

        if results:
            cheapest = results[0]
            cheapest["is_cheapest"] = True

        return Response({
            "period_days": days,
            "region_id": int(region_id) if region_id else None,
            "total_requests": qs.count(),
            "services": results,
        })


class RegionStatsView(APIView):
    """Har bir tuman uchun o'rtacha narxlar."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        days = int(request.query_params.get("days", 7))
        since = timezone.now() - timedelta(days=days)

        qs = (PriceEstimate.objects
              .filter(created_at__gte=since, region__isnull=False)
              .values("region__id", "region__name", "region__city")
              .annotate(
                  avg_price=Avg("price_uzs"),
                  min_price=Min("price_uzs"),
                  max_price=Max("price_uzs"),
                  count=Count("id"),
              )
              .order_by("avg_price"))

        results = []
        for r in qs:
            results.append({
                "region_id": r["region__id"],
                "region_name": r["region__name"],
                "city": r["region__city"],
                "avg_price": int(r["avg_price"] or 0),
                "min_price": int(r["min_price"] or 0),
                "max_price": int(r["max_price"] or 0),
                "count": r["count"],
            })
        return Response({"period_days": days, "regions": results})


class TimeSeriesView(APIView):
    """Oxirgi N kun ichidagi har bir kun bo'yicha o'rtacha narx."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        days = int(request.query_params.get("days", 14))
        service_id = request.query_params.get("service")
        region_id = request.query_params.get("region")

        since = timezone.now() - timedelta(days=days)
        qs = PriceEstimate.objects.filter(created_at__gte=since)
        if service_id:
            qs = qs.filter(service_id=service_id)
        if region_id:
            qs = qs.filter(region_id=region_id)

        ts = (qs.annotate(date=TruncDate("created_at"))
                .values("date")
                .annotate(
                    avg_price=Avg("price_uzs"),
                    count=Count("id"),
                )
                .order_by("date"))

        results = [
            {
                "date": r["date"].isoformat(),
                "avg_price": int(r["avg_price"] or 0),
                "count": r["count"],
            }
            for r in ts
        ]
        return Response({"period_days": days, "points": results})


class HourlyStatsView(APIView):
    """Bugungi (yoki tanlangan kunning) har bir soati bo'yicha statistika.

    Query params:
      - days (default 1): oxirgi necha kun
      - region: optional
      - service: optional
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        days = int(request.query_params.get("days", 1))
        region_id = request.query_params.get("region")
        service_id = request.query_params.get("service")

        since = timezone.now() - timedelta(days=days)
        qs = PriceEstimate.objects.filter(created_at__gte=since)
        if region_id:
            qs = qs.filter(region_id=region_id)
        if service_id:
            qs = qs.filter(service_id=service_id)

        hourly = (qs.annotate(hour=ExtractHour("created_at"))
                    .values("hour")
                    .annotate(
                        avg_price=Avg("price_uzs"),
                        max_price=Max("price_uzs"),
                        min_price=Min("price_uzs"),
                        avg_surge=Avg("surge"),
                        count=Count("id"),
                    )
                    .order_by("hour"))

        # 24 ta soat — ma'lumot bo'lmagan soatlarda 0
        by_hour = {h["hour"]: h for h in hourly}
        points = []
        prev_avg = None
        for hour in range(24):
            d = by_hour.get(hour)
            avg = int(d["avg_price"]) if d and d["avg_price"] else 0
            change = None
            if d and avg and prev_avg:
                change = round((avg - prev_avg) / prev_avg * 100, 1)
            points.append({
                "hour": hour,
                "label": f"{hour:02d}:00",
                "avg_price": avg,
                "min_price": int(d["min_price"]) if d and d["min_price"] else 0,
                "max_price": int(d["max_price"]) if d and d["max_price"] else 0,
                "avg_surge": round(d["avg_surge"], 2) if d and d["avg_surge"] else 1.0,
                "count": d["count"] if d else 0,
                "change_pct": change,
                "is_rush": hour in (8, 9, 17, 18, 19),
                "is_night": hour in (0, 1, 2, 3, 4, 5),
            })
            if avg:
                prev_avg = avg

        active_avg = [p["avg_price"] for p in points if p["avg_price"]]
        return Response({
            "period_days": days,
            "region_id": int(region_id) if region_id else None,
            "service_id": int(service_id) if service_id else None,
            "overall_avg": int(sum(active_avg) / len(active_avg)) if active_avg else 0,
            "peak_hour": max(points, key=lambda p: p["avg_price"])["hour"] if active_avg else None,
            "cheap_hour": min(
                (p for p in points if p["avg_price"]), key=lambda p: p["avg_price"]
            )["hour"] if active_avg else None,
            "points": points,
        })
