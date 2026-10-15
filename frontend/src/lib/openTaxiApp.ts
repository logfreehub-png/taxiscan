// Web'da taxi ilovasini ochish — sayt emas, IMKON BO'LSA ILOVA.
// Android mobil brauzerda `intent://` orqali o'rnatilgan ilova ochiladi
// (o'rnatilmagan bo'lsa browser_fallback_url = brend sayti). iOS/desktop'da
// deeplink (Yandex) yoki sayt.

interface SvcLike {
  code: string;
  deeplink_template?: string;
  website?: string;
}
type LatLng = { lat: number; lng: number };

// Brend kodi -> Android paket (Google Play'dan tasdiqlangan)
const ANDROID_PKG: Record<string, string> = {
  yandex_go: "ru.yandex.taxi",
  uklon: "ua.com.uklontaxi",
  fast: "com.fasten.rider",
  wb_taxi: "uz.wildberries.taxi.client",
  mytaxi: "com.uznewmax.mytaxi",
};

function fillTemplate(tpl: string, s: LatLng, e: LatLng | null): string | null {
  if (!tpl) return null;
  let out = tpl.replace("{start_lat}", String(s.lat)).replace("{start_lng}", String(s.lng));
  if (e) out = out.replace("{end_lat}", String(e.lat)).replace("{end_lng}", String(e.lng));
  if (out.includes("{end_")) return null;
  return out;
}

export function openTaxiApp(svc: SvcLike, start: LatLng, end: LatLng | null) {
  const key = (svc.code || "").split("__")[0];
  const pkg = ANDROID_PKG[key];
  const isAndroid = typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);

  // 1) Manzil bilan to'ldirilgan deeplink (Yandex universal link — hamma joyda ishlaydi)
  const deeplink = fillTemplate(svc.deeplink_template || "", start, end);
  if (deeplink) {
    window.location.href = deeplink;
    return;
  }

  // 2) Android mobil brauzer — intent orqali ILOVANI ochamiz
  //    (o'rnatilmagan bo'lsa fallback sifatida brend sayti ochiladi)
  if (isAndroid && pkg) {
    const fallback = encodeURIComponent(svc.website || `https://play.google.com/store/apps/details?id=${pkg}`);
    window.location.href = `intent://#Intent;package=${pkg};S.browser_fallback_url=${fallback};end`;
    return;
  }

  // 3) iOS/desktop — ilova sxemasi noma'lum, brend saytiga
  if (svc.website) window.open(svc.website, "_blank", "noopener");
}
