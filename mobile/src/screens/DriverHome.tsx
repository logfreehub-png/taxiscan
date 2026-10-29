import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme";
import { shadow } from "@/theme/shadow";
import { ServiceLogo } from "@/components/ui/ServiceLogo";
import { MapWebView, type MapZone } from "@/components/MapWebView";
import { AppDrawer } from "@/components/AppDrawer";
import { apiGet, apiPost } from "@/lib/api/client";
import { formatUzs, formatNum } from "@/lib/format";
import { openDriverTaxiApp } from "@/lib/openTaxiApp";
import type { EstimateResponse, Region, Tier, DemandResponse, DemandRegion } from "@/lib/api/types";
import { useIsPremium } from "@/lib/subscription";
import { PaywallSheet } from "@/components/PaywallSheet";
import { useI18n } from "@/i18n";

const DEFAULT = { lat: 41.311, lng: 69.279 };

/** GeoJSON geometry -> [lat,lng] ringlar (MapWebView zonasi uchun) */
function geometryToRings(geom: Region["geometry"]): [number, number][][] {
  if (!geom) return [];
  const toRing = (ring: any[]) => ring.map(([lng, lat]: number[]) => [lat, lng] as [number, number]);
  if (geom.type === "Polygon") return [toRing(geom.coordinates[0])];
  if (geom.type === "MultiPolygon") return geom.coordinates.map((poly: any[]) => toRing(poly[0]));
  return [];
}

export function DriverHome() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const isPremium = useIsPremium();
  const { t } = useI18n();

  const LEVEL_LABEL: Record<string, string> = {
    high: t("driver.highDemand"),
    medium: t("driver.mediumDemand"),
    low: t("driver.lowDemand"),
  };

  const TARIFS_LIST: { key: Tier; label: string }[] = useMemo(
    () => [
      { key: "econom", label: t("passenger.tierStart") },
      { key: "comfort", label: t("passenger.tierComfort") },
      { key: "comfort_plus", label: t("passenger.tierComfortPlus") },
      { key: "business", label: t("passenger.tierBusiness") },
    ],
    [t]
  );
  const [paywall, setPaywall] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [regions, setRegions] = useState<Region[]>([]);
  const [selected, setSelected] = useState<Region | null>(null);
  const [myLoc, setMyLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [data, setData] = useState<EstimateResponse | null>(null);
  const [stats, setStats] = useState<Record<number, number>>({});
  const [demand, setDemand] = useState<DemandResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [tier, setTier] = useState<Tier>("econom");
  const [secondsLeft, setSecondsLeft] = useState(15);

  const loadRegions = () => {
    apiGet<{ results: Region[] }>("/taxi/regions/")
      .then((r) => setRegions(r.results || []))
      .catch(() => {});
  };

  useEffect(() => {
    loadRegions();
    apiGet<any>("/stats/regions/?days=7")
      .then((r) => {
        const map: Record<number, number> = {};
        for (const x of r.regions || []) map[x.region_id] = x.avg_price;
        setStats(map);
      })
      .catch(() => {});

    (async () => {
      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (perm.status === "granted") {
          const pos = await Location.getCurrentPositionAsync({});
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setMyLoc(loc);
          load(loc.lat, loc.lng);
          return;
        }
      } catch {
        /* fall through */
      }
      load(DEFAULT.lat, DEFAULT.lng);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Har 15 soniyada haydovchi uchun narxlarni yangilab turish
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          refresh();
          return 15;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [selected, myLoc]);

  const load = async (lat: number, lng: number) => {
    setLoading(true);
    try {
      const r = await apiPost<EstimateResponse>("/taxi/quick-local/", {
        lat,
        lng,
        sample_distance_km: 5,
      });
      setData(r);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
    apiPost<DemandResponse>("/taxi/demand/", { lat, lng })
      .then(setDemand)
      .catch(() => {});
  };

  const activeDemand: DemandRegion | null = useMemo(() => {
    if (!demand) return null;
    if (selected) return demand.regions.find((r) => r.region_id === selected.id) || demand.here;
    return demand.here;
  }, [demand, selected]);

  const onRegion = (r: Region) => {
    setSelected(r);
    load(r.center_lat, r.center_lng);
  };

  const refresh = () => {
    if (selected) load(selected.center_lat, selected.center_lng);
    else if (myLoc) load(myLoc.lat, myLoc.lng);
    else load(DEFAULT.lat, DEFAULT.lng);
  };

  const goMyLocation = async () => {
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status === "granted") {
        const pos = await Location.getCurrentPositionAsync({});
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMyLoc(loc);
        setSelected(null);
        load(loc.lat, loc.lng);
      }
    } catch {
      /* ignore */
    }
  };

  // Taksi logotipiga bosilganda o'sha brendning HAYDOVCHILAR ilovasini ochish (Yandex Pro, Uklon Driver, MyTaxi Driver, WB Flot)
  const openService = (row: EstimateResponse["results"][number]) => {
    const s = selected ? { lat: selected.center_lat, lng: selected.center_lng } : myLoc || DEFAULT;
    openDriverTaxiApp(row.service, s);
  };

  // Tanlangan tarif bo'yicha narxlar — QIMMATDAN ARZONGA (haydovchi ko'p to'laydiganini ko'radi)
  const tierRows = useMemo(
    () => (data?.results || []).filter((r) => r.service.tier === tier),
    [data, tier]
  );
  const sorted = useMemo(() => [...tierRows].sort((a, b) => b.price_uzs - a.price_uzs), [tierRows]);
  const top = sorted[0];

  const zones: MapZone[] = useMemo(
    () =>
      regions
        .filter((r) => r.geometry)
        .map((r) => ({
          id: r.id,
          name: r.name,
          rings: geometryToRings(r.geometry),
          highlighted: selected?.id === r.id,
        })),
    [regions, selected]
  );

  // KUN / TUN moslashuvchi ranglar (yo'lovchi paneli bilan bir xil)
  const cardBg = isDark ? "rgba(18, 22, 28, 0.96)" : "rgba(255, 255, 255, 0.96)";
  const cardBorder = isDark ? "rgba(255,255,255,0.14)" : "rgba(15, 18, 22, 0.12)";
  const textPrimary = isDark ? "#F3F5F7" : "#0F1216";
  const textMuted = isDark ? "#94A2B0" : "#5C6772";

  const zoneName = selected ? selected.name : data?.region?.name || "Hozirgi joy";
  const activeTarifLabel = TARIFS_LIST.find((t) => t.key === tier)?.label || t("passenger.tierStart");

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* 1. TO'LIQ EKRANLI XARITA FONI (zonalar) */}
      <MapWebView
        mode="zones"
        isDark={isDark}
        zones={zones}
        userLoc={myLoc}
        onZonePress={(id) => {
          const reg = regions.find((x) => x.id === id);
          if (reg) onRegion(reg);
        }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* 2. TEPA: HAMBURGER MENYU + O'NGDA "KIM KO'P TO'LAYDI" NARX KARTASI */}
      <View style={[styles.topHeader, { paddingTop: insets.top + 8, pointerEvents: "box-none" } as any]}>
        <Pressable
          onPress={() => setMenuOpen(true)}
          style={[styles.hamburgerBtn, { backgroundColor: cardBg, borderColor: cardBorder }]}
          hitSlop={12}
        >
          <Ionicons name="menu-sharp" size={26} color={textPrimary} />
        </Pressable>

        <View style={styles.topRightCardWrap}>
          <Pressable
            onPress={() => {
              setSecondsLeft(15);
              refresh();
            }}
            style={[styles.badgeHeader, { backgroundColor: isDark ? "#0A0D11" : "#FFFFFF" }]}
            hitSlop={8}
          >
            <View style={styles.badgeLine} />
            <Text style={styles.badgeText} numberOfLines={1}>
              {activeTarifLabel}
            </Text>
            <View style={styles.timerBadge}>
              {loading ? (
                <ActivityIndicator size={10} color="#FFCC00" />
              ) : (
                <Ionicons name="time-outline" size={11} color="#FFCC00" />
              )}
              <Text style={styles.timerBadgeText}>{secondsLeft}s</Text>
            </View>
            <View style={styles.badgeLine} />
          </Pressable>

          <View style={[styles.topRightCardBody, { backgroundColor: cardBg }]}>
            {loading ? (
              <ActivityIndicator color="#FFCC00" size="small" style={{ paddingVertical: 14 }} />
            ) : sorted.length > 0 ? (
              sorted.map((r, idx) => {
                // Bepul haydovchi faqat 2 ta taksini ko'radi, qolgani qulflangan
                const locked = !isPremium && idx >= 2;
                return (
                  <Pressable
                    key={r.service.id}
                    onPress={() => (locked ? setPaywall(true) : openService(r))}
                    style={({ pressed }) => [styles.rateRow, pressed && { opacity: 0.55 }]}
                    hitSlop={4}
                  >
                    <View style={[styles.rateLeftGroup, locked && { opacity: 0.5 }]}>
                      <ServiceLogo code={r.service.code} uri={r.service.logo} size={24} />
                      <Text style={[styles.serviceNameTxt, { color: textPrimary }]} numberOfLines={1}>
                        {r.service.brand || r.service.name}
                      </Text>
                    </View>
                    {locked ? (
                      <View style={styles.lockedPriceWrap}>
                        <Text style={[styles.ratePrice, { opacity: 0.15 }]} numberOfLines={1}>
                          {formatNum(r.price_uzs, 0)}
                        </Text>
                        <View style={styles.lockedOverlay}>
                          <Ionicons name="lock-closed" size={11} color="#FFCC00" />
                          <Text style={styles.lockedTxt}>Obuna</Text>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.rateRightGroup}>
                        <Text style={styles.ratePrice}>{formatNum(r.price_uzs, 0)}</Text>
                        <Ionicons name="open-outline" size={12} color="#FFCC00" />
                      </View>
                    )}
                  </Pressable>
                );
              })
            ) : (
              <Text style={{ color: textMuted, fontSize: 12, paddingVertical: 10 }}>Ma'lumot yo'q</Text>
            )}
          </View>
        </View>
      </View>

      {/* 3. SUZUVCHI TUGMALAR: JOYIMGA QAYTISH + YANGILASH */}
      <View style={[styles.floatBtns, { bottom: insets.bottom + 210 }]}>
        <Pressable style={styles.roundBtn} onPress={goMyLocation} hitSlop={10}>
          <Ionicons name="navigate-sharp" size={22} color="#0F1216" />
        </Pressable>
        <Pressable style={[styles.roundBtn, { backgroundColor: cardBg }]} onPress={refresh} hitSlop={10}>
          <Ionicons name="refresh" size={22} color={textPrimary} />
        </Pressable>
      </View>

      {/* 4. PASTKI KARTA: ZONA NOMI + TALAB + ZONALAR + TARIFLAR (qidiruvsiz) */}
      <View style={[styles.bottomCardWrap, { paddingBottom: insets.bottom + 16, pointerEvents: "box-none" } as any]}>
        <View style={[styles.infoCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          {/* Zona nomi + talab darajasi */}
          <View style={styles.zoneHeadRow}>
            <Ionicons name="location-sharp" size={18} color="#FFCC00" />
            <Text style={[styles.zoneName, { color: textPrimary }]} numberOfLines={1}>
              {zoneName}
            </Text>
            {activeDemand ? (
              <View style={[styles.levelBadge, { backgroundColor: levelColor(activeDemand.level) + "22" }]}>
                <Text style={{ color: levelColor(activeDemand.level), fontSize: 11, fontWeight: "900" }}>
                  {LEVEL_LABEL[activeDemand.level]}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Eng ko'p to'laydigan xizmat + talab statistikasi — struktura doim bir xil */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={[styles.statLabel, { color: textMuted }]}>Eng ko'p to'laydi</Text>
              <View style={styles.statValRow}>
                {top ? <ServiceLogo code={top.service.code} uri={top.service.logo} size={18} /> : null}
                <Text style={[styles.statVal, { color: textPrimary }]} numberOfLines={1}>
                  {top ? formatUzs(top.price_uzs).replace(" so'm", "") : "—"}
                </Text>
              </View>
            </View>
            <View style={[styles.vDivider, { backgroundColor: cardBorder }]} />
            <View style={styles.statBox}>
              <Text style={[styles.statLabel, { color: textMuted }]}>Chaqirgan ({demand?.window || "7 kun"})</Text>
              <Text style={[styles.statVal, { color: textPrimary }]}>
                {activeDemand ? `${activeDemand.searches.toLocaleString()} kishi` : "—"}
              </Text>
            </View>
          </View>

          {/* Zona tanlash chiplari */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
            style={{ marginTop: 12 }}
          >
            {regions.map((r) => {
              const sel = selected?.id === r.id;
              return (
                <Pressable
                  key={r.id}
                  onPress={() => onRegion(r)}
                  style={[
                    styles.chip,
                    { backgroundColor: sel ? "#FFCC00" : "transparent", borderColor: sel ? "#FFCC00" : cardBorder },
                  ]}
                >
                  <Text style={{ color: sel ? "#0F1216" : textPrimary, fontSize: 12, fontWeight: "800" }}>
                    {r.name}
                  </Text>
                  {stats[r.id] ? (
                    <Text style={{ color: sel ? "#0F1216" : textMuted, fontSize: 10, fontWeight: "700" }}>
                      {formatUzs(stats[r.id]).replace(" so'm", "")}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
            {regions.length === 0 ? (
              <Text style={{ color: textMuted, fontSize: 12, paddingVertical: 8 }}>{t("common.loading")}</Text>
            ) : null}
          </ScrollView>

          {/* Tarif tanlash */}
          <View style={styles.tarifRow}>
            {TARIFS_LIST.map((tItem) => {
              const active = tier === tItem.key;
              const locked = !isPremium && tItem.key !== "econom";
              // Faol tugma: kunduzi to'liq sariq (qora yozuv), tunda sariq yozuv (shaffof fon)
              const activeBg = isDark ? "rgba(255,204,0,0.18)" : "#FFCC00";
              const activeTxt = isDark ? "#FFCC00" : "#0F1216";
              return (
                <Pressable
                  key={tItem.key}
                  onPress={() => (locked ? setPaywall(true) : setTier(tItem.key))}
                  style={[
                    styles.tarifPill,
                    { borderColor: cardBorder },
                    active && { backgroundColor: activeBg, borderColor: "#FFCC00" },
                    locked && { opacity: 0.7 },
                  ]}
                >
                  {locked ? (
                    <Ionicons name="lock-closed" size={11} color="#FFCC00" style={{ marginRight: 3 }} />
                  ) : null}
                  <Text style={[styles.tarifTxt, { color: active ? activeTxt : textPrimary }]}>{tItem.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      {/* 5. MENYU — tepada TaxiScan logotipi + nomi, faqat haydovchi ma'lumotlari (qidiruvsiz) */}
      <AppDrawer visible={menuOpen} onClose={() => setMenuOpen(false)} />

      {/* 6. PAYWALL — qulflangan tariflar uchun obuna taklifi */}
      <PaywallSheet
        visible={paywall}
        onClose={() => setPaywall(false)}
        title="Tarif qulflangan"
        message="Comfort, Comfort+ va Biznes tariflari obuna bilan ochiladi."
      />
    </View>
  );
}

function levelColor(level: string): string {
  return level === "high" ? "#16A34A" : level === "medium" ? "#F59E0B" : "#94A2B0";
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  /* Top header */
  topHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    zIndex: 30,
  },
  hamburgerBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },

  /* Top-right price card */
  topRightCardWrap: { alignItems: "center", maxWidth: 200 },
  badgeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: -10,
    zIndex: 10,
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#FFCC00",
  },
  badgeLine: { width: 10, height: 1, backgroundColor: "#FFCC00" },
  badgeText: { fontSize: 12, fontWeight: "900", color: "#FFCC00", letterSpacing: 0.3 },
  timerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: "rgba(255,204,0,0.12)",
  },
  timerBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#FFCC00",
    fontVariant: ["tabular-nums"],
  },
  topRightCardBody: {
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 10,
    borderWidth: 1.5,
    borderColor: "#FFCC00",
    gap: 9,
    minWidth: 180,
    ...shadow({ color: "#000", opacity: 0.35, radius: 14 }),
    elevation: 8,
  },
  rateRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  rateLeftGroup: { flexDirection: "row", alignItems: "center", gap: 7, flex: 1, minWidth: 0 },
  rateRightGroup: { flexDirection: "row", alignItems: "center", gap: 4 },
  serviceNameTxt: { fontSize: 12, fontWeight: "700", flexShrink: 1 },
  ratePrice: { fontSize: 13, fontWeight: "900", color: "#FFCC00" },
  lockedPriceWrap: { minWidth: 56, alignItems: "center", justifyContent: "center" },
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  lockedTxt: { fontSize: 11, fontWeight: "900", color: "#FFCC00" },

  /* Floating buttons */
  floatBtns: { position: "absolute", right: 16, gap: 10, zIndex: 35 },
  roundBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#FFCC00",
    alignItems: "center",
    justifyContent: "center",
    ...shadow({ color: "#000", opacity: 0.35, radius: 8 }),
    elevation: 6,
  },

  /* Bottom info card */
  bottomCardWrap: { position: "absolute", left: 16, right: 16, bottom: 0, zIndex: 30 },
  infoCard: {
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    ...shadow({ color: "#000", opacity: 0.35, radius: 14 }),
    elevation: 8,
  },
  zoneHeadRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  zoneName: { fontSize: 16, fontWeight: "900", flex: 1 },
  levelBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statsRow: { flexDirection: "row", alignItems: "center", marginTop: 12 },
  statBox: { flex: 1 },
  statLabel: { fontSize: 11, fontWeight: "600" },
  statValRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 },
  statVal: { fontSize: 16, fontWeight: "900", marginTop: 2 },
  vDivider: { width: 1, height: 34, marginHorizontal: 12 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  tarifRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  tarifPill: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  tarifTxt: { fontSize: 12, fontWeight: "800" },
});
