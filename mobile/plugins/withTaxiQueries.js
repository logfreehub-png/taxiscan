const { withAndroidManifest } = require("@expo/config-plugins");

/**
 * Android 11+ (targetSdk 30+) da boshqa ilovalar "ko'rinmaydi" — ularni
 * ochish/aniqlash uchun AndroidManifest'ga <queries> qo'shish SHART. Aks holda
 * Linking.openURL taksi ilovasini topolmay xato beradi va Play Store'ga o'tib
 * ketadi. Shu yerda taksi ilovalarining paketlari va scheme'larini ro'yxatga olamiz.
 */
const TAXI_PACKAGES = [
  // Yo'lovchi ilovalari
  "ru.yandex.taxi",              // Yandex Go
  "ru.yandex.go",
  "com.yandex.taxi",
  "ua.com.uklontaxi",           // Uklon
  "com.fasten.tashkent",        // Fasten
  "com.fasten.rider",
  "uz.wildberries.taxi.client", // WB Taxi
  "com.uznewmax.mytaxi",        // MyTaxi
  "net.mytaxi.passenger",
  "uz.mytaxi.client",

  // Haydovchilar ilovalari (Driver apps)
  "ru.yandex.taximeter",        // Yandex Pro (Yandex va Fasten haydovchilari uchun)
  "com.yandex.taximeter",
  "ua.com.uklon.driver",        // Uklon Driver
  "com.uznewmax.mytaxidriver",  // MyTaxi Driver
  "uz.mytaxi.driver",
  "uz.wildberries.taxi.driver", // WB Flot: haydovchilarga
  "ru.wildberries.taxi.driver",
];

const TAXI_SCHEMES = [
  // Yo'lovchi
  "yandextaxi",
  "yandexgo",
  "fasten",
  "fastentashkent",
  "uklon",
  "uklonpassenger",
  "mytaxi",
  "wbtaxi",

  // Haydovchi
  "taximeter",
  "yandextaximeter",
  "yandexpro",
  "uklondriver",
  "mytaxidriver",
  "wbflot",
  "wbfleet",
];

const withTaxiQueries = (config) => {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    if (!Array.isArray(manifest.queries)) {
      manifest.queries = [];
    }

    manifest.queries.push({
      package: TAXI_PACKAGES.map((name) => ({ $: { "android:name": name } })),
      intent: TAXI_SCHEMES.map((scheme) => ({
        action: [{ $: { "android:name": "android.intent.action.VIEW" } }],
        data: [{ $: { "android:scheme": scheme } }],
      })),
    });

    // Telegram, WhatsApp va tizimdan lokatsiya kelganda "Complete action using"
    // ro'yxatida TaxiScan ham chiqishi uchun MainActivity'ga <intent-filter> qo'shamiz
    if (
      manifest.application &&
      manifest.application[0] &&
      Array.isArray(manifest.application[0].activity)
    ) {
      const mainActivity = manifest.application[0].activity.find(
        (a) => a.$ && a.$["android:name"] === ".MainActivity"
      );
      if (mainActivity) {
        if (!Array.isArray(mainActivity["intent-filter"])) {
          mainActivity["intent-filter"] = [];
        }

        const hasGeo = mainActivity["intent-filter"].some(
          (f) =>
            Array.isArray(f.data) &&
            f.data.some((d) => d.$ && d.$["android:scheme"] === "geo")
        );

        if (!hasGeo) {
          mainActivity["intent-filter"].push({
            action: [{ $: { "android:name": "android.intent.action.VIEW" } }],
            category: [
              { $: { "android:name": "android.intent.category.DEFAULT" } },
              { $: { "android:name": "android.intent.category.BROWSABLE" } },
            ],
            data: [{ $: { "android:scheme": "geo" } }],
          });
        }
      }
    }

    return config;
  });
};

module.exports = withTaxiQueries;
