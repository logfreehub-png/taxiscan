"""Taxi narxlari aggregatorining yuqori sathli servisi."""
import time
import uuid
from datetime import timedelta
from django.conf import settings
from django.utils import timezone
from concurrent.futures import ThreadPoolExecutor, wait as futures_wait
import logging
from .models import TaxiService, PriceEstimate, Region, LiveYandexQuote
from .providers import get_provider
from . import live_yandex
from .providers.formula import (
    haversine_km, calculate_price, current_surge, _base_hour_surge,
    tashkent_now, region_level,
)
from .routing import get_route, get_routes
from .weather import weather_surge

_last_cleanup_timestamp = 0.0
logger = logging.getLogger(__name__)


def cleanup_old_estimates(retention_days: int = 1) -> int:
    """1 kundan (24 soat) eski barcha taxi zaproslarini bazadan tozalash."""
    cutoff = timezone.now() - timedelta(days=retention_days)
    deleted_count, _ = PriceEstimate.objects.filter(created_at__lt=cutoff).delete()
    return deleted_count


def maybe_cleanup_old_estimates(interval_seconds: int = 1800, retention_days: int = 1):
    """Har 30 daqiqada bir marta avtomatik ravishda 1 kundan eski zaproslarni tozalaydi."""
    global _last_cleanup_timestamp
    now_ts = time.time()
    if now_ts - _last_cleanup_timestamp > interval_seconds:
        _last_cleanup_timestamp = now_ts
        try:
            cleanup_old_estimates(retention_days=retention_days)
        except Exception:
            pass


def _surge_reason(hour: int, weekday: int, weather_reason: str | None) -> str:
    """Narx nega shunday — odam o'qiy oladigan izoh (Yandex 'molniya' uslubida)."""
    parts = []
    is_workday = weekday < 5
    if hour in (17, 18, 19, 20):
        parts.append("Kechki pik — ishdan qaytish")
    elif is_workday and hour in (7, 8, 9, 10):
        parts.append("Ertalabki pik — ishga qatnov")
    elif hour in (12, 13, 14):
        parts.append("Tushlik (obed) — talab yuqori")
    if weekday == 4 and hour in (16, 17, 18, 19, 20, 21):
        parts.append("Juma kechqurun")
    if weather_reason:
        parts.append(weather_reason)
    if not parts:
        return "Talab past — narx tushgan"
    return " + ".join(parts)


def _point_in_ring(lng, lat, ring):
    """Ray-casting: nuqta polygon ringi ichidami."""
    inside = False
    n = len(ring)
    j = n - 1
    for i in range(n):
        xi, yi = ring[i][0], ring[i][1]
        xj, yj = ring[j][0], ring[j][1]
        if ((yi > lat) != (yj > lat)) and (
            lng < (xj - xi) * (lat - yi) / ((yj - yi) or 1e-12) + xi
        ):
            inside = not inside
        j = i
    return inside


def _point_in_geometry(lng, lat, geom):
    """Nuqta GeoJSON Polygon/MultiPolygon ichidami (tashqi ringlar bo'yicha)."""
    if not isinstance(geom, dict):
        return False
    t = geom.get("type")
    coords = geom.get("coordinates")
    if not coords:
        return False
    try:
        if t == "Polygon":
            return _point_in_ring(lng, lat, coords[0])
        if t == "MultiPolygon":
            return any(_point_in_ring(lng, lat, poly[0]) for poly in coords)
    except (IndexError, TypeError):
        return False
    return False


def find_region_for_point(lat: float, lng: float):
    """Berilgan nuqta qaysi tumanga tegishli ekanligini topadi.

    1) Avval haqiqiy polygon chegarasi ichida bo'lsa — o'sha tuman.
    2) Polygon yo'q/topilmasa — markaz + radius doirasi bo'yicha eng yaqini.
    """
    regions = list(Region.objects.filter(is_active=True))

    # 1) Aniq: polygon ichida
    for region in regions:
        if region.geometry and _point_in_geometry(lng, lat, region.geometry):
            return region

    # 2) Zaxira: eng yaqin markaz (radius ichida)
    best = None
    best_dist = None
    for region in regions:
        d = haversine_km(lat, lng, region.center_lat, region.center_lng)
        if d <= region.radius_km and (best_dist is None or d < best_dist):
            best = region
            best_dist = d
    return best


def aggregate_estimates(
    start_lat: float,
    start_lng: float,
    end_lat: float,
    end_lng: float,
    user=None,
    save: bool = True,
    stops=None,
    searcher_key: str | None = None,
    live: bool = True,
):
    """
    Barcha faol taxi xizmatlaridan parallel ravishda narxlarni so'raydi
    va eng arzonidan eng qimmatigacha tartiblangan ro'yxatni qaytaradi.

    OSRM dan haqiqiy yo'l masofasi va vaqtini bir marta oladi va barcha
    provayderlarga uzatadi.
    """
    all_services = list(TaxiService.objects.filter(is_active=True).order_by("sort_order"))

    # Xizmat hududi tekshiruvi — WB Taxi kabi faqat shahar ichida ishlaydigan
    # xizmatlar yo'nalish hudud tashqarisiga chiqsa ro'yxatdan tushiriladi,
    # sababi esa unavailable_services'da qaytariladi (brend bo'yicha bittadan).
    services = []
    unavailable = {}
    for s in all_services:
        if s.covers_point(start_lat, start_lng) and s.covers_point(end_lat, end_lng):
            services.append(s)
        else:
            brand = s.brand or s.name
            if brand not in unavailable:
                area = (s.coverage_area or {}).get("label") or "o'z xizmat hududi"
                out_point = "boshlanish" if not s.covers_point(start_lat, start_lng) else "borish"
                unavailable[brand] = {
                    "brand": brand,
                    "area": area,
                    "reason": f"{brand} faqat {area} ichida ishlaydi — "
                              f"{out_point} manzili hudud tashqarisida",
                }
    unavailable_services = list(unavailable.values())

    if not services:
        return {"results": [], "routes": [], "route": None, "region": None,
                "unavailable_services": unavailable_services,
                "start": {"lat": start_lat, "lng": start_lng},
                "end": {"lat": end_lat, "lng": end_lng}}

    # Yandex va WB narxi FAQAT telefondan (real) olinadi — eski formula ular uchun
    # ishlatilmaydi (pastda kommentda). Qolgan brendlar formula bilan hisoblanadi.
    # live=False (quick_local_prices — sun'iy namunaviy yo'l) bo'lsa hammasi formula.
    live_services = [s for s in services if live and live_yandex.provider_of(s)]
    services = [s for s in services if s not in live_services]
    providers = []
    for s in live_services:
        p = live_yandex.provider_of(s)
        if p not in providers:
            providers.append(p)

    def _mark_unavailable(provider, reason):
        for s in live_services:
            brand = s.brand or s.name
            if live_yandex.provider_of(s) == provider and brand not in unavailable:
                unavailable[brand] = {"brand": brand, "area": "", "reason": reason}

    # Real narx telefondan (Yandex ~12 s, WB ~15 s) — OSRM bilan parallel boshlanadi.
    # Oraliq to'xtashli marshrutda olinmaydi: deeplink faqat A→B ni oladi.
    live_pool = None
    live_futures = {}
    if providers and stops:
        for p in providers:
            _mark_unavailable(p, "Oraliq to'xtashli marshrutda real narx olinmaydi")
        providers = []
    for p in list(providers):
        if not live_yandex.is_enabled(p):
            _mark_unavailable(p, "Real narx servisi o'chiq")
            providers.remove(p)
    live_started = time.monotonic()
    if providers:
        live_pool = ThreadPoolExecutor(max_workers=len(providers))
        live_futures = {
            p: live_pool.submit(live_yandex.get_quote, searcher_key,
                                start_lat, start_lng, end_lat, end_lng, p)
            for p in providers
        }

    # Oraliq to'xtashlar (A→...→B) — berilgan bo'lsa bitta yo'l, aks holda alternativlar
    waypoints = [(s["lat"], s["lng"]) for s in (stops or [])]
    routes = get_routes(
        start_lat, start_lng, end_lat, end_lng,
        min_routes=2, max_routes=4, waypoints=waypoints or None,
    )
    primary_route = routes[0]  # eng tez

    region = find_region_for_point(start_lat, start_lng)

    # Chaqirilgan joy (tuman) narx darajasi — markaziy/biznes tumanlarda narx
    # sal yuqoriroq, chekkada pastroq (~0.95..1.06). BARCHA brendga TENG
    # qo'llanadi, shuning uchun brendlar tartibi o'zgarmaydi.
    rlvl = region_level(region.id) if region else 1.0

    def _apply_region(price: int, minimum_fare: int) -> int:
        """Tuman darajasini narxga qo'llab, 100 so'mga yumaloqlaydi."""
        if rlvl == 1.0:
            return price
        return max(minimum_fare, round(price * rlvl / 100) * 100)

    # 1 kundan eski barcha zaproslarni avtomatik tozalab turish (bazani to'lib ketishdan saqlash)
    maybe_cleanup_old_estimates()

    # 15 soniyalik qayta-qayta so'rovlarda bir xil marshrut uchun har 15 soniyada
    # bazaga qayta-qayta 20 tadan yozuv yozilib ketmasligi uchun:
    # Agar ayni shu qidiruvchi ayni shu yo'nalishni so'nggi 60 soniya ichida
    # qidirgan bo'lsa, qayta saqlash shart emas (narx jonli hisoblab qaytariladi).
    if save and searcher_key:
        recent_threshold = timezone.now() - timedelta(seconds=60)
        already_saved_recently = PriceEstimate.objects.filter(
            searcher_key=searcher_key,
            start_lat=start_lat,
            start_lng=start_lng,
            end_lat=end_lat,
            end_lng=end_lng,
            created_at__gte=recent_threshold,
        ).exists()
        if already_saved_recently:
            save = False

    # Ob-havo keshini bir marta isitamiz — parallel narx so'rovlari kesh'dan oladi
    wx_boost, wx_reason, wx_info = weather_surge()

    # Bitta qidiruv = bitta ID: barcha brend yozuvlari shu ID bilan bog'lanadi,
    # demand statistikasi esa yozuvlarni emas, unikal qidiruvlarni sanaydi
    search_id = uuid.uuid4() if save else None

    # Telefon bitta — WB Yandex'dan keyin navbatda turadi. Javob Yandex VA WB real
    # narxi kelguncha kutadi (mobil ilovada shu payt loading turadi), lekin
    # YANDEX_LIVE_WAIT dan oshmaydi (nginx 60 s da uzib qo'ymasin). Ulgurmagan
    # probe fonda tugab keshga tushadi va keyingi yangilanishda chiqadi.
    #
    # ESKI: birinchi brend kelgach qolganini 5 s kutib, ulgurmaganiga formula:
    # deadline = live_started + settings.YANDEX_LIVE_TIMEOUT
    # _, not_done = futures_wait(pending, timeout=..., return_when=FIRST_COMPLETED)
    # if not_done:
    #     futures_wait(not_done, timeout=min(..., settings.YANDEX_LIVE_EXTRA_WAIT))
    live_quotes = {}
    if live_futures:
        futures_wait(list(live_futures.values()),
                     timeout=max(0.0, live_started + settings.YANDEX_LIVE_WAIT - time.monotonic()))
        for p, fut in live_futures.items():
            if not fut.done():
                logger.info("Live %s %.0f s da ulgurmadi", p, settings.YANDEX_LIVE_WAIT)
                _mark_unavailable(p, "Real narx hali olinmadi — bir necha soniyadan keyin chiqadi")
                continue
            try:
                q = fut.result()
            except Exception as exc:  # fetch_quote o'zi ushlaydi, bu — zaxira
                logger.warning("Live %s: %s", p, exc)
                q = None
            if q:
                live_quotes[p] = q
            else:
                _mark_unavailable(p, "Real narxni hozir olib bo'lmadi")
        live_pool.shutdown(wait=False)
    live_prices = {p: live_yandex.prices_by_tier(q, p) for p, q in live_quotes.items()}
    # ESKI: ML uchun shu brendlarning formula narxi ham yozilardi — endi formula
    # Yandex/WB uchun umuman hisoblanmaydi.
    # formula_prices = {p: {} for p in live_yandex.PROVIDERS}
    unavailable_services = list(unavailable.values())

    def _fetch(service):
        provider = get_provider(service)
        try:
            result = provider.fetch_estimate(start_lat, start_lng, end_lat, end_lng, route=primary_route)
        except Exception as exc:
            from .providers.base import EstimateResult
            result = EstimateResult(
                service_code=service.code,
                price_uzs=0,
                distance_km=0,
                duration_min=0,
                error=str(exc),
            )
        return service, result

    with ThreadPoolExecutor(max_workers=max(1, min(8, len(services)))) as ex:
        fetched = [(s, r) for s, r in ex.map(_fetch, services) if r.is_ok]

    # Chaqirilgan joy darajasi (region_level) — barcha brendga teng.
    # Per-brend random farq (region_factor) esa ATAY qo'llanmaydi —
    # u brend tartibini soxta aralashtirardi.
    for service, result in fetched:
        result.price_uzs = _apply_region(result.price_uzs, service.minimum_fare_uzs)
        # ESKI: Yandex/WB formula narxi ML uchun yig'ilardi
        # p = live_yandex.provider_of(service)
        # if p:
        #     formula_prices[p][service.tier] = result.price_uzs

    # ESKI: real narx formula bilan aralashtirilardi — ekranda yo'q tarif (Business)
    # formula × (real/formula nisbati) bilan "live_est" bo'lib chiqardi.
    # live_final = {
    #     p: live_yandex.final_tier_prices(live_prices[p], formula_prices[p])
    #     for p in live_prices
    # }
    # for service, result in fetched:
    #     lp = _live_price(service)
    #     if lp:
    #         result.price_uzs, result.source = lp

    # YANGI: Yandex/WB — faqat telefon ekranidan o'qilgan tariflar. Ekranda
    # bo'lmagan tarif ro'yxatga chiqmaydi.
    from .providers.base import EstimateResult
    for service in live_services:
        p = live_yandex.provider_of(service)
        price = live_prices.get(p, {}).get(service.tier)
        if not price:
            continue
        trip_min = live_quotes[p].get("trip_min")
        fetched.append((service, EstimateResult(
            service_code=service.code,
            price_uzs=price,
            distance_km=primary_route["distance_km"],
            duration_min=trip_min or primary_route["duration_min"],
            surge=1.0,
            source="live",
        )))

    def _live_price(service):
        """Telefondan o'qilgan narx yoki None."""
        return live_prices.get(live_yandex.provider_of(service), {}).get(service.tier)

    results = []
    for service, result in fetched:
        if save:
            PriceEstimate.objects.create(
                user=user if (user and user.is_authenticated) else None,
                search_id=search_id,
                searcher_key=searcher_key or None,
                service=service,
                start_lat=start_lat,
                start_lng=start_lng,
                end_lat=end_lat,
                end_lng=end_lng,
                distance_km=result.distance_km,
                duration_min=result.duration_min,
                price_uzs=result.price_uzs,
                surge=result.surge,
                region=region,
                source=result.source,
            )

        results.append({
            "service": {
                "id": service.id,
                "code": service.code,
                "name": service.name,
                "brand": service.brand,
                "tier": service.tier,
                "color": service.color,
                "logo": service.logo.url if service.logo else None,
                "deeplink_template": service.deeplink_template,
                "website": service.website,
                "base_fare_uzs": service.base_fare_uzs,
                "per_km_uzs": service.per_km_uzs,
                "per_minute_uzs": service.per_minute_uzs,
                "minimum_fare_uzs": service.minimum_fare_uzs,
            },
            "price_uzs": result.price_uzs,
            "distance_km": result.distance_km,
            "duration_min": result.duration_min,
            "surge": result.surge,
            "source": result.source,
            # Narxni qanday hisoblanganini ko'rsatish uchun breakdown
            "breakdown": {
                "base": service.base_fare_uzs,
                "distance_part": int(result.distance_km * service.per_km_uzs),
                "time_part": int(result.duration_min * service.per_minute_uzs),
                "surge_extra": result.price_uzs - int(
                    service.base_fare_uzs
                    + result.distance_km * service.per_km_uzs
                    + result.duration_min * service.per_minute_uzs
                ),
            },
        })

    results.sort(key=lambda r: r["price_uzs"])
    if results:
        cheapest_price = results[0]["price_uzs"]
        for r in results:
            r["is_cheapest"] = r["price_uzs"] == cheapest_price
            r["diff_from_cheapest"] = r["price_uzs"] - cheapest_price

    # Har bir alternativ yo'l uchun har xizmat narxini hisoblash
    routes_with_prices = []
    for idx, r_route in enumerate(routes):
        per_service = []
        for service in services + live_services:
            if service in live_services:
                # Yandex/WB: ilova o'zi yo'l tanlaydi — real narx har yo'lda bir xil.
                # ESKI: muqobil yo'llarda formula ishlatilardi (calculate_price).
                price = _live_price(service)
                if not price:
                    continue
            else:
                price, surge = calculate_price(
                    service, r_route["distance_km"], r_route["duration_min"]
                )
                price = _apply_region(price, service.minimum_fare_uzs)
            per_service.append({
                "service_id": service.id,
                "service_code": service.code,
                "brand": service.brand,
                "tier": service.tier,
                "color": service.color,
                "name": service.name,
                "price_uzs": price,
            })
        per_service.sort(key=lambda p: p["price_uzs"])
        cheapest = per_service[0]["price_uzs"] if per_service else 0

        routes_with_prices.append({
            "id": idx,
            "label": r_route["label"],
            "distance_km": r_route["distance_km"],
            "duration_min": r_route["duration_min"],
            "geometry": r_route.get("geometry"),
            "source": r_route.get("source"),
            "is_fastest": idx == 0,
            "is_cheapest_route": False,  # pastda hisoblanadi
            "cheapest_price_uzs": cheapest,
            "prices": per_service,
        })

    # Har bir telefon o'lchovi ML arxiviga BIR MARTA yoziladi (probed_at bo'yicha)
    for p, q in live_quotes.items():
        _save_live_quote(
            p, q, user, searcher_key, search_id, region,
            start_lat, start_lng, end_lat, end_lng,
            primary_route, {}, wx_boost, wx_reason,
        )

    # Eng arzon yo'lni belgilash (har xil yo'llar narxi farq qilishi mumkin)
    if routes_with_prices:
        min_route = min(routes_with_prices, key=lambda r: r["cheapest_price_uzs"])
        for r in routes_with_prices:
            if r["cheapest_price_uzs"] == min_route["cheapest_price_uzs"]:
                r["is_cheapest_route"] = True

    return {
        "start": {"lat": start_lat, "lng": start_lng},
        "end": {"lat": end_lat, "lng": end_lng},
        "stops": stops or [],
        "region": {
            "id": region.id,
            "name": region.name,
            "city": region.city,
        } if region else None,
        # Asosiy yo'l (eski API moslik uchun)
        "route": {
            "distance_km": primary_route["distance_km"],
            "duration_min": primary_route["duration_min"],
            "geometry": primary_route.get("geometry"),
            "source": primary_route.get("source"),
        },
        # Yangi: barcha alternativ yo'llar narxlari bilan
        "routes": routes_with_prices,
        "results": results,
        # Yo'nalish xizmat hududidan tashqarida bo'lgani uchun chiqmagan brendlar
        "unavailable_services": unavailable_services,
        "current_surge": current_surge(),
        # Yandex narxi telefondan olingan bo'lsa — shu daqiqadagi o'lchov haqida
        "yandex_live": {
            "probed_at": live_quotes["yandex"].get("probed_at"),
            "demand": live_quotes["yandex"].get("demand"),
        } if live_prices.get("yandex") else None,
        # Qaysi brendlar narxi telefondan real olingani
        "live": {
            p: {"probed_at": q.get("probed_at"), "demand": q.get("demand") or ""}
            for p, q in live_quotes.items() if live_prices.get(p)
        },
        # Narx nega shunday — talab sababi (pik / ob-havo) va ob-havo holati
        # MUHIM: Toshkent soati bo'yicha (server UTC bo'lsa 5 soat farq qilardi)
        "surge_reason": _surge_reason(
            tashkent_now().hour, tashkent_now().weekday(), wx_reason
        ),
        "weather": {
            "boost": wx_boost,
            "reason": wx_reason,
            **wx_info,
        },
    }


def _save_live_quote(provider, quote, user, searcher_key, search_id, region,
                     start_lat, start_lng, end_lat, end_lng,
                     route, formula_prices, wx_boost, wx_reason):
    """Real o'lchovni ML arxiviga yozish. Xato javobni buzmasin.

    Bir o'lchov (provider + probed_at) bir marta yoziladi — mobil ilovaning
    15 soniyalik yangilanishlari va keshdan qaytgan javoblar takror yozmaydi.
    """
    from django.utils.dateparse import parse_datetime
    probed_at = parse_datetime(quote["probed_at"]) if quote.get("probed_at") else None
    try:
        if probed_at:
            # Parallel so'rovlar (hisoblash + 15 s taymer) bir o'lchovni bir vaqtda
            # yozib yubormasin: cache.add atomar — faqat birinchisi o'tadi
            from django.core.cache import cache
            if not cache.add(f"ylive-saved:{provider}:{quote['probed_at']}", 1, 86400):
                return
            if LiveYandexQuote.objects.filter(provider=provider, probed_at=probed_at).exists():
                return
        LiveYandexQuote.objects.create(
            provider=provider,
            user=user if (user and user.is_authenticated) else None,
            searcher_key=searcher_key or "",
            search_id=search_id,
            start_lat=start_lat, start_lng=start_lng,
            end_lat=end_lat, end_lng=end_lng,
            region=region,
            from_address=(quote.get("from") or "")[:255],
            to_address=(quote.get("to") or "")[:255],
            demand=(quote.get("demand") or "")[:64],
            trip_min=quote.get("trip_min"),
            arrival=(quote.get("arrival") or "")[:8],
            tariffs=quote.get("tariffs") or [],
            probe_seconds=quote.get("seconds"),
            probed_at=probed_at,
            osrm_distance_km=route.get("distance_km"),
            osrm_duration_min=route.get("duration_min"),
            formula_prices=formula_prices,
            weather={"boost": wx_boost, "reason": wx_reason},
        )
    except Exception:
        logger.exception("LiveYandexQuote saqlanmadi")


def quick_local_prices(lat: float, lng: float, sample_distance_km: float = 5.0):
    """Haydovchi turgan joydan sample uzoqlikdagi joyga sample narxlar."""
    import math
    delta = sample_distance_km / 111.0
    end_lat = lat + delta * math.cos(math.radians(45))
    end_lng = lng + delta * math.sin(math.radians(45))
    # Sun'iy namunaviy marshrut — telefonni band qilmaymiz (live=False)
    return aggregate_estimates(lat, lng, end_lat, end_lng, save=False, live=False)
