"""
Haydovchilar uchun "talab" (demand) — HAQIQIY statistikadan.

Random emas: har bir rayon bo'yicha so'nggi davrda dasturda qilingan
narx qidiruvlari (PriceEstimate) soni va o'rtacha narxi hisoblanadi.
"Qayerda yo'lovchi ko'p" — shu real qidiruvlar soni bo'yicha tartiblanadi.
"""
from datetime import timedelta
from django.utils import timezone
from django.db.models import Count, Avg
from django.contrib.auth import get_user_model

from .models import Region, PriceEstimate, DriverPanelSettings
from .services import find_region_for_point
from .providers.formula import current_surge

User = get_user_model()

WINDOW_DAYS = 1
WINDOW_LABEL = "so'nggi 24 soat"


def _region_stats(since):
    """Rayon -> (UNIKAL qidiruvchi ODAMLAR soni, o'rtacha narx).

    MUHIM: yozuvlarni EMAS, unikal odamlarni sanaymiz (searcher_key —
    user id yoki IP). Sabablari:
      * bitta qidiruv har brend uchun alohida yozuv yaratadi (~20 ta);
      * bitta odam tugmani 10 marta bossa ham u 1 KISHI — 10 emas.
    Count(distinct) NULL'larni sanamaydi, shu sabab tick_stats/seed'ning
    sun'iy yozuvlari (searcher_key=NULL) hisobga qo'shilmaydi.
    """
    rows = (
        PriceEstimate.objects
        .filter(created_at__gte=since, region__isnull=False)
        .values("region_id")
        .annotate(n=Count("searcher_key", distinct=True), avg=Avg("price_uzs"))
    )
    return {r["region_id"]: (r["n"], int(r["avg"] or 0)) for r in rows}


def _level_by_rank(idx: int, total_ranked: int) -> str:
    """Qidiruvi bor rayonlar ichidagi o'rin bo'yicha talab darajasi."""
    if total_ranked <= 1:
        return "medium"
    third = total_ranked / 3.0
    if idx < third:
        return "high"
    if idx < 2 * third:
        return "medium"
    return "low"


def build_overview(now=None):
    """Barcha rayonlar talabi — real qidiruvlar soni bo'yicha tartiblangan."""
    now = now or timezone.now()
    since = now - timedelta(days=WINDOW_DAYS)
    stats = _region_stats(since)
    # timezone.now() UTC qaytaradi — surge uchun Toshkent soati kerak
    local = timezone.localtime(now)
    surge = current_surge(hour=local.hour, weekday=local.weekday())

    entries = []
    for r in Region.objects.filter(is_active=True):
        n, avg = stats.get(r.id, (0, 0))
        entries.append({
            "region_id": r.id,
            "region_name": r.name,
            "city": r.city,
            "center_lat": r.center_lat,
            "center_lng": r.center_lng,
            "searches": n,
            "avg_price": avg,
            "surge": surge,
        })

    # Real qidiruvlar soni bo'yicha kamayish tartibida
    entries.sort(key=lambda e: -e["searches"])
    total_searches = sum(e["searches"] for e in entries) or 1
    ranked = [e for e in entries if e["searches"] > 0]

    for idx, e in enumerate(entries):
        e["share_pct"] = round(e["searches"] / total_searches * 100, 1)
        if e["searches"] > 0:
            e["rank"] = idx + 1
            e["level"] = _level_by_rank(idx, len(ranked))
        else:
            e["rank"] = None
            e["level"] = "low"
    return entries


def _by_id(overview, region_id):
    for e in overview:
        if e["region_id"] == region_id:
            return e
    return None


def demand_for_point(lat, lng, overview):
    region = find_region_for_point(lat, lng)
    if not region:
        return None
    return _by_id(overview, region.id)


def demand_visible_for(user) -> bool:
    """Berilgan foydalanuvchiga talab ma'lumoti ko'rsatiladimi.

    - Admin: doim ko'radi (admin panelida ko'rish uchun).
    - Haydovchi: shaxsiy override (on/off) yoki global sozlama.
    - Boshqalar/anonim: global sozlama.
    """
    glob = DriverPanelSettings.get_solo().demand_enabled
    if not user or not getattr(user, "is_authenticated", False):
        return glob
    if getattr(user, "is_superuser", False) or getattr(user, "role", None) == "admin":
        return True
    override = getattr(user, "demand_access", "inherit")
    if override == "on":
        return True
    if override == "off":
        return False
    return glob


def system_totals(now=None):
    """Tizim bo'yicha real umumiy sonlar."""
    now = now or timezone.now()
    since = now - timedelta(days=WINDOW_DAYS)
    return {
        # Unikal qidiruvchi odamlar (yozuvlar ham, bosishlar soni ham emas)
        "searches": (
            PriceEstimate.objects
            .filter(created_at__gte=since, searcher_key__isnull=False)
            .values("searcher_key").distinct().count()
        ),
        "drivers": User.objects.filter(role="driver").count(),
        "passengers": User.objects.filter(role="passenger").count(),
        "regions": Region.objects.filter(is_active=True).count(),
    }
