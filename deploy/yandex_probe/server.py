#!/usr/bin/env python3
"""Taksi real narx servisi (Yandex Go, WB Taxi): HTTP -> telefon (adb + uiautomator) -> JSON.

Bitta telefon bor, shuning uchun so'rovlar navbat bilan bajariladi:
  * bir vaqtda bitta probe (phone_lock);
  * bir xil marshrut bo'yicha parallel so'rovlar bitta probe natijasini bo'lishadi;
  * FRESH_SECONDS ichidagi natija xotiradan qaytadi (diskdagi eski ma'lumot
    hech qachon mijozga qaytarilmaydi).
Har bir haqiqiy probe data/quotes-YYYY-MM.jsonl ga yoziladi (ML uchun).

Ishga tushirish:
  python3 server.py serve                      # .env dan sozlamalar
  python3 server.py probe --end 41.3111 69.2797  # bir martalik test
  python3 server.py probe --provider wb --start 41.2995 69.2010 --end 41.3111 69.2797

API:
  POST /v1/quote   {"start_lat":..,"start_lng":..,"end_lat":..,"end_lng":..,
                    "provider": "yandex" | "wb"}   (provider bo'lmasa — yandex)
  GET  /v1/health
  Sarlavha: X-Api-Key: <PROBE_API_KEY>
"""
import argparse
import hmac
import html
import json
import logging
import math
import os
import re
import subprocess
import sys
import threading
import time
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import xml.etree.ElementTree as ET

BASE_DIR = Path(__file__).resolve().parent
PKG = "ru.yandex.taxi"
UI_PATH = "/sdcard/taxiscan_ui.xml"

# Yandex ilovasi tili o'zgarib qolishi mumkin — uz / en / ru qo'llab-quvvatlanadi:
#   uz: content-desc="«Komfort» tarifi, Talab yuqori, 25000 soʻm, Yetkazish 3 daq"
#   en: content-desc="Comfort service class, 30,500 sum, Pickup 2 min"
#   ru: content-desc="Тариф «Комфорт», 30 500 сум, Подача 2 мин"
RX_TARIFFS = [
    re.compile(r'content-desc="(?:«|&quot;)?([^"«»&]+?)(?:»|&quot;)? tarifi, ([^"]*)"'),
    re.compile(r'content-desc="([^",]+?) service class, ([^"]*)"'),
    re.compile(r'content-desc="[Тт]ариф (?:«|&quot;)?([^"«»&,]+?)(?:»|&quot;)?, ([^"]*)"'),
]
RX_PRICE = re.compile(r"(\d[\d\s,.]*?)\s*(?:so(?:'|&apos;|&#39;|.)m|sum|сум)\b", re.I)
RX_PICKUP = re.compile(r"(?:Yetkazish|Pickup|Подача)\s*(\d+)\s*(?:daq|min|мин)", re.I)
RX_TRIP_MIN = re.compile(r"•\s*(\d+)\s*(?:daq|min|мин)", re.I)
RX_DEMAND = re.compile(r'(?:talab indeksi|demand index|индекс спроса): ([^"]+)', re.I)
# Manzil tugmalari: uz'da "Manzilingiz, ..."/"Qayerga, ...", en'da yorliqsiz ", ..."
RX_ADDR = re.compile(r'content-desc="(Manzilingiz|Qayerga|Откуда|Куда|Where to|)?, ([^"]*)"')
RX_ARRIVAL_NODE = re.compile(r'content-desc="([^"]*(?:yakuniy manzil|destination|назначени)[^"]*)"', re.I)
RX_TIME = re.compile(r"\b(\d{1,2}:\d{2})\b")

# Tarif nomi (har qanday til) -> kanonik kod
TARIFF_CODES = {
    "start": "start", "старт": "start", "ekonom": "start", "econom": "start", "эконом": "start",
    "komfort": "comfort", "comfort": "comfort", "комфорт": "comfort",
    "komfort+": "comfort_plus", "comfort+": "comfort_plus", "комфорт+": "comfort_plus",
    "biznes": "business", "business": "business", "бизнес": "business",
    "elektro": "electro", "electric": "electro", "электро": "electro",
    "birga": "carpool", "carpool": "carpool", "вместе": "carpool",
}

# --- WB Taxi (uz.wildberries.taxi.client, Citymobil asosida) ---
#   ekran: "Standard" / "27 500 сўм" (nom narx tepasida), pastda pickup va manzil
WB_PKG = "uz.wildberries.taxi.client"
RX_BOUNDS = re.compile(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]")
RX_WB_PRICE = re.compile(r"^\d[\d\s]*\d\s*\D{1,8}$")
RX_WB_MIN = re.compile(r"^\d+\s*(?:min|мин|daq)\.?$", re.I)
WB_TARIFF_CODES = {
    "standard": "standard", "стандарт": "standard", "standart": "standard",
    "comfort": "comfort", "комфорт": "comfort", "komfort": "comfort",
    "comfort+": "comfort_plus", "комфорт+": "comfort_plus", "komfort+": "comfort_plus",
    "business": "business", "бизнес": "business", "biznes": "business",
    "premium": "premium", "minivan": "minivan", "минивэн": "minivan",
    "electro": "electro", "child": "child", "детский": "child",
}
WB_UI = {"0", "cash", "наличные", "naqd", "entrance", "подъезд", "multi", "preferences",
         "пожелания", "request ride", "заказать", "pickup", "подача", "on the way", "в пути",
         "no watermelons yet", "pay by card to earn them"}


def wb_norm(t: str) -> str:
    return re.sub(r"\s+", "", t).lower()


PROVIDERS = ("yandex", "wb")

# O'zbekiston chegarasi (taxminan) — tashqaridagi koordinatalar rad etiladi
LAT_RANGE = (37.0, 46.0)
LNG_RANGE = (55.0, 74.0)

log = logging.getLogger("yandex_probe")


def load_env(path: Path):
    if not path.exists():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


class ProbeError(Exception):
    """Mijozga qaytariladigan xato. code — mashina o'qiydigan qisqa kod."""

    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


# --------------------------------------------------------------------------- #
# Telefon
# --------------------------------------------------------------------------- #
class Phone:
    def __init__(self, serial: str | None, probe_timeout: float):
        self.serial = serial or None
        self.probe_timeout = probe_timeout
        self.wb_last = None  # oldingi WB natijasi — ekranda qolgan eski narxni tanish uchun

    def adb(self, args, timeout=20) -> subprocess.CompletedProcess:
        cmd = ["adb"] + (["-s", self.serial] if self.serial else []) + args
        try:
            return subprocess.run(cmd, capture_output=True, timeout=timeout)
        except subprocess.TimeoutExpired:
            raise ProbeError("adb_timeout", f"adb javob bermadi: {' '.join(args[:2])}")
        except FileNotFoundError:
            raise ProbeError("no_adb", "adb topilmadi")

    def shell_out(self, command: str, timeout=20) -> str:
        r = self.adb(["exec-out", command], timeout)
        if r.returncode != 0:
            err = (r.stderr or b"").decode("utf-8", "replace").strip()
            if "no devices" in err or "not found" in err or "offline" in err:
                raise ProbeError("no_device", f"telefon ulanmagan: {err}")
            raise ProbeError("adb_error", err or f"adb xato kodi {r.returncode}")
        return r.stdout.decode("utf-8", "replace")

    def state(self) -> dict:
        r = self.adb(["get-state"], 10)
        device = r.stdout.decode().strip() or r.stderr.decode().strip()
        if device != "device":
            return {"device": device or "none", "awake": False, "locked": None}
        power = self.shell_out("dumpsys power | grep -m1 mWakefulness=")
        window = self.shell_out("dumpsys window | grep -m1 isKeyguardShowing")
        return {
            "device": "device",
            "awake": "Awake" in power,
            "locked": "isKeyguardShowing=true" in window,
        }

    def ensure_ready(self):
        st = self.state()
        if st["device"] != "device":
            raise ProbeError("no_device", f"telefon holati: {st['device']}")
        if not st["awake"]:
            # Xiaomi'da "USB debugging (Security settings)" yoqilmasa bu ishlamaydi
            self.adb(["shell", "input", "keyevent", "KEYCODE_WAKEUP"], 10)
            time.sleep(0.5)
            st = self.state()
            if not st["awake"]:
                raise ProbeError("screen_off", "telefon ekrani o'chiq va yoqib bo'lmadi")
        if st["locked"]:
            # Telefonda PIN yo'q — qulf ekranini olib tashlash yetarli
            self.adb(["shell", "wm", "dismiss-keyguard"], 10)
            time.sleep(1)
            if self.state()["locked"]:
                raise ProbeError("phone_locked", "telefon qulflangan (lock screen)")

    def dump_xml(self) -> str:
        # Eski faylni o'chirib, yangisini olamiz — aks holda dump xato bo'lsa
        # oldingi marshrut narxlari qaytib qolardi.
        return self.shell_out(
            f"rm -f {UI_PATH}; uiautomator dump {UI_PATH} >/dev/null 2>&1; cat {UI_PATH} 2>/dev/null",
            timeout=15,
        )

    @staticmethod
    def parse(xml: str) -> dict | None:
        tariffs = []
        seen = set()
        for rx in RX_TARIFFS:
            for m in rx.finditer(xml):
                name = html.unescape(m.group(1)).strip()
                rest = html.unescape(m.group(2))
                pm = RX_PRICE.search(rest)
                price = int(re.sub(r"\D", "", pm.group(1)) or 0) if pm else 0
                if not name or price <= 0 or name in seen:
                    continue  # narxi hali chiqmagan (masalan «Birga»)
                seen.add(name)
                pickup = RX_PICKUP.search(rest)
                # Narx va yetkazishdan boshqa bo'laklar — masalan "Talab yuqori"
                leftover = RX_PICKUP.sub("", RX_PRICE.sub("", rest))
                notes = [p.strip() for p in leftover.split(",") if p.strip()]
                tariffs.append({
                    "tariff": name,
                    "code": TARIFF_CODES.get(name.lower()),
                    "price": price,
                    "pickup_min": int(pickup.group(1)) if pickup else None,
                    "notes": notes,
                })
        if not tariffs:
            return None

        frm = to = ""
        for m in RX_ADDR.finditer(xml):
            label, value = m.group(1) or "", html.unescape(m.group(2))
            if label in ("Qayerga", "Куда", "Where to") or "•" in value:
                to = to or value
            elif not frm:
                frm = value
        trip = RX_TRIP_MIN.search(to)
        arrival_node = RX_ARRIVAL_NODE.search(xml)
        arrival = RX_TIME.search(arrival_node.group(1)) if arrival_node else None
        demand = RX_DEMAND.search(xml)
        return {
            "from": frm.strip(" ,"),
            "to": to.split("•")[0].strip(" ,"),
            "trip_min": int(trip.group(1)) if trip else None,
            "arrival": arrival.group(1) if arrival else None,
            "demand": html.unescape(demand.group(1)).strip() if demand else "",
            "tariffs": tariffs,
        }

    def quote(self, s_lat, s_lng, e_lat, e_lng) -> dict:
        t0 = time.monotonic()
        self.ensure_ready()
        # Har safar ilovani yopib ochamiz: ekranda oldingi marshrut qolib,
        # eski narx o'qilib ketmasligi uchun.
        self.adb(["shell", "am", "force-stop", PKG], 15)
        url = (
            f"yandextaxi://route?start-lat={s_lat:.6f}&start-lon={s_lng:.6f}"
            f"&end-lat={e_lat:.6f}&end-lon={e_lng:.6f}"
        )
        r = self.adb(["shell", f"am start -a android.intent.action.VIEW -p {PKG} -d '{url}'"], 15)
        out = (r.stdout + r.stderr).decode("utf-8", "replace")
        if "Error" in out:
            raise ProbeError("launch_failed", out.strip()[:300])

        # Tariflar birin-ketin yuklanadi: ketma-ket ikki o'qish bir xil
        # chiqmaguncha (yoki vaqt tugaguncha) qabul qilmaymiz.
        prev = None
        while time.monotonic() - t0 < self.probe_timeout:
            parsed = self.parse(self.dump_xml())
            if parsed:
                if prev and parsed["tariffs"] == prev["tariffs"]:
                    parsed["seconds"] = round(time.monotonic() - t0, 1)
                    return parsed
                prev = parsed
            else:
                time.sleep(0.4)
        if prev:  # barqarorlashmadi, lekin narx bor — oxirgisini qaytaramiz
            prev["seconds"] = round(time.monotonic() - t0, 1)
            prev["unstable"] = True
            return prev
        raise ProbeError("timeout", f"{self.probe_timeout:.0f} soniyada narx chiqmadi")

    # ------------------------------------------------------------------ WB --
    def focus(self) -> str:
        return self.shell_out("dumpsys window | grep -m1 mCurrentFocus", 10)

    def wb_nodes(self) -> list[tuple[str, float, float]]:
        try:
            root = ET.fromstring(self.dump_xml())
        except ET.ParseError:
            return []
        nodes = []
        for n in root.iter("node"):
            t = (n.get("text") or "").strip()
            m = RX_BOUNDS.match(n.get("bounds") or "")
            if t and m:
                l, tp, r, b = map(int, m.groups())
                nodes.append((t, (l + r) / 2, (tp + b) / 2))
        return nodes

    @staticmethod
    def wb_parse(nodes) -> dict | None:
        def is_price(t):
            return bool(RX_WB_PRICE.match(t)) and len(re.sub(r"\D", "", t)) >= 4

        prices = [x for x in nodes if is_price(x[0])]
        names = [x for x in nodes if wb_norm(x[0]) in WB_TARIFF_CODES]
        if not prices or not names:
            return None
        tariffs = []
        for t, cx, cy in sorted(prices, key=lambda x: x[1]):
            # Tarif nomi narxning tepasida turadi — eng yaqin nom
            nm = min(names, key=lambda n: math.hypot(cx - n[1], (cy - n[2]) * 0.5))
            tariffs.append({
                "tariff": nm[0],
                "code": WB_TARIFF_CODES[wb_norm(nm[0])],
                "price": int(re.sub(r"\D", "", t)),
                "pickup_min": None,
                "notes": [],
            })

        def minutes_below(labels):
            """"Pickup" / "On the way" yorlig'i ostidagi "5 min" qiymati."""
            for t, cx, cy in nodes:
                if t.lower() in labels:
                    below = [(abs(cx - x) + (y - cy), t2) for t2, x, y in nodes
                             if y > cy and RX_WB_MIN.match(t2)]
                    if below:
                        return int(re.match(r"\d+", min(below)[1]).group())
            return None

        pickup_min = minutes_below({"pickup", "подача", "yetkazish"})
        for t in tariffs:
            t["pickup_min"] = pickup_min

        # Manzillar narxlar qatoridan pastda: birinchisi — qayerdan, ikkinchisi — qayerga
        row_y = max(p[2] for p in prices)
        addr = [t for t, _, cy in sorted(nodes, key=lambda x: x[2])
                if cy > row_y and not is_price(t) and wb_norm(t) not in WB_TARIFF_CODES
                and t.lower() not in WB_UI and not RX_WB_MIN.match(t)]
        return {
            "from": addr[0] if addr else "",
            "to": addr[1] if len(addr) > 1 else "",
            "trip_min": minutes_below({"on the way", "в пути", "yo'lda"}),
            "arrival": None,
            "demand": "",
            "tariffs": tariffs,
        }

    def quote_wb(self, s_lat, s_lng, e_lat, e_lng) -> dict:
        """WB Taxi: deeplink wb-taxi://ride?from=lat,lon&to=lat,lon.

        MUHIM: ilova noldan (cold) ochilsa, `from` ni GPS joylashuvi bilan
        almashtirib yuboradi. Shuning uchun ilovani yopmaymiz — avval ochiq
        turganiga ishonch hosil qilamiz, keyin deeplink yuboramiz.
        """
        t0 = time.monotonic()
        self.ensure_ready()
        # Ilova jarayoni tirik bo'lsa (fonda ham) deeplink "warm" ishlanadi va
        # `from` to'g'ri olinadi. O'lik bo'lsa — avval ochib, bosh ekranni kutamiz.
        alive = self.adb(["shell", "pidof", WB_PKG], 10).stdout.strip()
        if not alive:
            self.adb(["shell", "monkey", "-p", WB_PKG, "-c",
                      "android.intent.category.LAUNCHER", "1"], 15)
            while time.monotonic() - t0 < 15:
                time.sleep(1)
                if WB_PKG in self.focus() and len(self.wb_nodes()) >= 4:
                    break
            time.sleep(1)  # GPS bo'yicha pickup o'rnatilib bo'lsin
        # ESKI: deeplinkdan oldin BACK bosib bosh ekranga qaytilardi (har biri
        # ~2.7 s dump) — endi eski ekran wb_last bilan taqqoslab tashlab ketiladi.
        url = f"wb-taxi://ride?from={s_lat:.6f},{s_lng:.6f}&to={e_lat:.6f},{e_lng:.6f}"
        r = self.adb(["shell", f"am start -a android.intent.action.VIEW -p {WB_PKG} -d '{url}'"], 15)
        out = (r.stdout + r.stderr).decode("utf-8", "replace")
        if "Error" in out:
            raise ProbeError("launch_failed", out.strip()[:300])

        t_link = time.monotonic()
        prev = None
        while time.monotonic() - t0 < self.probe_timeout:
            parsed = self.wb_parse(self.wb_nodes())
            # Oldingi probe ekrani o'zgarmagan bo'lsa — bu eski narx (deeplink
            # hali ishlanmagan). Bir xil marshrut qayta so'ralgan bo'lishi ham
            # mumkin, shuning uchun 8 s dan keyin qabul qilamiz.
            stale = parsed == self.wb_last and time.monotonic() - t_link < 8
            if parsed and parsed["from"] and parsed["to"] and not stale:
                if prev and parsed == prev:
                    self.wb_last = dict(parsed)
                    parsed["seconds"] = round(time.monotonic() - t0, 1)
                    return parsed
                prev = parsed
            else:
                time.sleep(0.4)
        if prev:
            self.wb_last = dict(prev)
            prev["seconds"] = round(time.monotonic() - t0, 1)
            prev["unstable"] = True
            return prev
        raise ProbeError("timeout", f"{self.probe_timeout:.0f} soniyada WB narxi chiqmadi")

    def quote_for(self, provider, s_lat, s_lng, e_lat, e_lng) -> dict:
        if provider == "wb":
            return self.quote_wb(s_lat, s_lng, e_lat, e_lng)
        return self.quote(s_lat, s_lng, e_lat, e_lng)


# --------------------------------------------------------------------------- #
# Navbat, kesh, saqlash
# --------------------------------------------------------------------------- #
class QuoteService:
    def __init__(self, phone: Phone, data_dir: Path, fresh_seconds: float, max_wait: float):
        self.phone = phone
        self.data_dir = data_dir
        self.fresh_seconds = fresh_seconds
        self.max_wait = max_wait
        self.phone_lock = threading.Lock()
        self.mu = threading.Lock()
        self.cache: dict[tuple, dict] = {}
        self.inflight: dict[tuple, threading.Event] = {}
        self.write_lock = threading.Lock()
        data_dir.mkdir(parents=True, exist_ok=True)

    @staticmethod
    def key(provider, s_lat, s_lng, e_lat, e_lng):
        # ~10 m aniqlik: shu oraliqdagi so'rovlar bitta marshrut hisoblanadi
        return (provider,) + tuple(round(x, 4) for x in (s_lat, s_lng, e_lat, e_lng))

    def _fresh(self, key):
        hit = self.cache.get(key)
        if hit and time.monotonic() - hit["_t"] < self.fresh_seconds:
            return hit
        return None

    def get(self, s_lat, s_lng, e_lat, e_lng, provider="yandex") -> dict:
        key = self.key(provider, s_lat, s_lng, e_lat, e_lng)
        with self.mu:
            # eskirgan kesh yozuvlarini tozalash
            now = time.monotonic()
            for k in [k for k, v in self.cache.items() if now - v["_t"] >= self.fresh_seconds]:
                del self.cache[k]
            hit = self._fresh(key)
            if hit:
                return self._public(hit, cached=True)
            ev = self.inflight.get(key)
            owner = ev is None
            if owner:
                ev = self.inflight[key] = threading.Event()

        if not owner:
            # Xuddi shu marshrut hozir o'lchanmoqda — natijasini kutamiz
            ev.wait(self.max_wait + self.phone.probe_timeout)
            with self.mu:
                hit = self._fresh(key)
            if hit:
                return self._public(hit, cached=True)
            raise ProbeError("busy", "parallel probe muvaffaqiyatsiz tugadi")

        try:
            if not self.phone_lock.acquire(timeout=self.max_wait):
                raise ProbeError("busy", "telefon band, navbat juda uzun")
            try:
                res = self.phone.quote_for(provider, s_lat, s_lng, e_lat, e_lng)
            finally:
                self.phone_lock.release()
            res["provider"] = provider
            res["probed_at"] = datetime.now(timezone.utc).isoformat()
            res["_t"] = time.monotonic()
            with self.mu:
                self.cache[key] = res
            self._save(True, (s_lat, s_lng, e_lat, e_lng), res)
            return self._public(res, cached=False)
        except ProbeError as e:
            self._save(False, (s_lat, s_lng, e_lat, e_lng),
                       {"provider": provider, "error": e.code, "message": e.message})
            raise
        finally:
            with self.mu:
                self.inflight.pop(key, None)
            ev.set()

    @staticmethod
    def _public(res: dict, cached: bool) -> dict:
        out = {k: v for k, v in res.items() if not k.startswith("_")}
        out["ok"] = True
        out["cached"] = cached
        return out

    def _save(self, ok: bool, coords, payload: dict):
        rec = {
            "ts": datetime.now(timezone.utc).isoformat(),
            "ok": ok,
            "start": [coords[0], coords[1]],
            "end": [coords[2], coords[3]],
            **{k: v for k, v in payload.items() if not k.startswith("_")},
        }
        path = self.data_dir / f"quotes-{datetime.now(timezone.utc):%Y-%m}.jsonl"
        try:
            with self.write_lock, path.open("a", encoding="utf-8") as f:
                f.write(json.dumps(rec, ensure_ascii=False) + "\n")
        except OSError as e:
            log.error("saqlab bo'lmadi: %s", e)


# --------------------------------------------------------------------------- #
# HTTP
# --------------------------------------------------------------------------- #
ERROR_STATUS = {"busy": 503, "phone_locked": 503, "screen_off": 503, "no_device": 503,
                "timeout": 504, "adb_timeout": 504}


def make_handler(service: QuoteService, api_key: str):
    class Handler(BaseHTTPRequestHandler):
        server_version = "yandex-probe/1.0"
        sys_version = ""

        def log_message(self, fmt, *args):
            log.info("%s %s", self.client_address[0], fmt % args)

        def _send(self, status: int, body: dict):
            data = json.dumps(body, ensure_ascii=False).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

        def _authorized(self) -> bool:
            got = self.headers.get("X-Api-Key", "")
            if not hmac.compare_digest(got.encode(), api_key.encode()):
                self._send(401, {"ok": False, "error": "unauthorized"})
                return False
            return True

        def do_GET(self):
            if self.path != "/v1/health":
                return self._send(404, {"ok": False, "error": "not_found"})
            if not self._authorized():
                return
            try:
                st = service.phone.state()
            except ProbeError as e:
                return self._send(503, {"ok": False, "error": e.code, "message": e.message})
            ready = st["device"] == "device" and st["awake"] and not st["locked"]
            self._send(200, {"ok": ready, **st, "busy": service.phone_lock.locked()})

        def do_POST(self):
            if self.path != "/v1/quote":
                return self._send(404, {"ok": False, "error": "not_found"})
            if not self._authorized():
                return
            try:
                length = int(self.headers.get("Content-Length", "0"))
                if length <= 0 or length > 4096:
                    raise ValueError("body")
                body = json.loads(self.rfile.read(length))
                coords = [float(body[k]) for k in ("start_lat", "start_lng", "end_lat", "end_lng")]
            except (ValueError, KeyError, TypeError, json.JSONDecodeError):
                return self._send(400, {"ok": False, "error": "bad_request",
                                        "message": "start_lat, start_lng, end_lat, end_lng kerak"})
            s_lat, s_lng, e_lat, e_lng = coords
            provider = str(body.get("provider") or "yandex")
            if provider not in PROVIDERS:
                return self._send(400, {"ok": False, "error": "bad_provider",
                                        "message": f"provider: {', '.join(PROVIDERS)}"})
            for lat, lng in ((s_lat, s_lng), (e_lat, e_lng)):
                if not (LAT_RANGE[0] <= lat <= LAT_RANGE[1] and LNG_RANGE[0] <= lng <= LNG_RANGE[1]):
                    return self._send(400, {"ok": False, "error": "out_of_range"})
            try:
                res = service.get(s_lat, s_lng, e_lat, e_lng, provider)
            except ProbeError as e:
                log.warning("probe xato: %s %s", e.code, e.message)
                return self._send(ERROR_STATUS.get(e.code, 502),
                                  {"ok": False, "error": e.code, "message": e.message})
            except Exception as e:  # kutilmagan xato — servis yiqilmasin
                log.exception("kutilmagan xato")
                return self._send(500, {"ok": False, "error": "internal", "message": str(e)})
            self._send(200, res)

    return Handler


def main():
    load_env(BASE_DIR / ".env")
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

    p = argparse.ArgumentParser()
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("serve")
    pr = sub.add_parser("probe", help="bir martalik test")
    pr.add_argument("--start", nargs=2, type=float, default=[41.2755, 69.2030])
    pr.add_argument("--end", nargs=2, type=float, default=[41.3111, 69.2797])
    pr.add_argument("--provider", choices=PROVIDERS, default="yandex")
    a = p.parse_args()

    phone = Phone(os.environ.get("ADB_SERIAL"), float(os.environ.get("PROBE_TIMEOUT", "30")))

    if a.cmd == "probe":
        try:
            print(json.dumps(phone.quote_for(a.provider, *a.start, *a.end),
                             ensure_ascii=False, indent=2))
        except ProbeError as e:
            print(f"{e.code}: {e.message}", file=sys.stderr)
            sys.exit(1)
        return

    api_key = os.environ.get("PROBE_API_KEY", "")
    if len(api_key) < 16:
        sys.exit("PROBE_API_KEY (kamida 16 belgi) .env da berilmagan")
    service = QuoteService(
        phone,
        Path(os.environ.get("DATA_DIR", BASE_DIR / "data")),
        fresh_seconds=float(os.environ.get("FRESH_SECONDS", "20")),
        max_wait=float(os.environ.get("MAX_WAIT", "45")),
    )
    host = os.environ.get("PROBE_HOST", "0.0.0.0")
    port = int(os.environ.get("PROBE_PORT", "3060"))
    httpd = ThreadingHTTPServer((host, port), make_handler(service, api_key))
    httpd.daemon_threads = True
    log.info("yandex-probe %s:%s da ishlayapti", host, port)
    httpd.serve_forever()


if __name__ == "__main__":
    main()
