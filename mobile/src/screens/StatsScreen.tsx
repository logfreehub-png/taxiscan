import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme, radius } from "@/theme";
import { Screen } from "@/components/ui/Screen";
import { Card } from "@/components/ui/Card";
import { Header } from "@/components/ui/Header";
import { EmptyState } from "@/components/ui/EmptyState";
import { apiGet } from "@/lib/api/client";
import { formatUzs, formatTime } from "@/lib/format";
import type { HourlyStatsResponse } from "@/lib/api/types";
import { useIsPremium } from "@/lib/subscription";
import { PaywallSheet } from "@/components/PaywallSheet";
import { useI18n } from "@/i18n";

const REFRESH_SEC = 60;

export function StatsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const isPremium = useIsPremium();
  const { t } = useI18n();
  const [data, setData] = useState<HourlyStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [secsLeft, setSecsLeft] = useState(REFRESH_SEC);
  const [selBrand, setSelBrand] = useState<string | null>(null);
  const [tier, setTier] = useState("econom");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = async (t = tier) => {
    try {
      const r = await apiGet<HourlyStatsResponse>(`/stats/hourly-by-brand/?tier=${t}`);
      setData(r);
      setSecsLeft(REFRESH_SEC);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(tier);
    timer.current = setInterval(() => {
      setSecsLeft((s) => {
        if (s <= 1) {
          load(tier);
          return REFRESH_SEC;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tier]);

  const series = data?.series || [];
  const maxVal = Math.max(1, ...series.map((s) => s.max || s.current || 0));

  // 24 soatlik dinamika — tanlangan brend (yoki barchasi) bo'yicha soatma-soat narx
  const dynamics = useMemo(() => {
    const chart = data?.chart || [];
    const brands = series.map((s) => s.brand);
    const points = chart.map((pt: Record<string, any>) => {
      let val = 0;
      if (selBrand) {
        val = Number(pt[selBrand]) || 0;
      } else {
        const vals = brands.map((b) => Number(pt[b]) || 0).filter((v) => v > 0);
        val = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
      }
      return { hour: pt.hour as number, label: pt.label as string, avg: val };
    });
    const vals = points.map((p) => p.avg).filter((v) => v > 0);
    const max = Math.max(1, ...vals);
    // Y-o'qi 0 dan emas — eng arzon (min) dan boshlanadi, chiziqlar aniqroq ko'rinadi
    const min = vals.length ? Math.min(...vals) : 0;
    const base = Math.max(0, min - Math.round((max - min) * 0.25));
    const active = points.filter((p) => p.avg > 0);
    return { points, max, base, hasData: active.length > 0 };
  }, [data, series, selBrand]);

  const TIER_TABS = useMemo(
    () => [
      { code: "econom", label: t("passenger.tierStart") },
      { code: "comfort", label: t("passenger.tierComfort") },
      { code: "comfort_plus", label: t("passenger.tierComfortPlus") },
      { code: "business", label: t("passenger.tierBusiness") },
    ],
    [t]
  );

  const selColor = selBrand ? series.find((s) => s.brand === selBrand)?.color : null;

  // Statistika faqat obunali foydalanuvchilar uchun
  if (!isPremium) {
    return (
      <Screen>
        <Header
          title={t("stats.title")}
          onBack={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))}
        />
        <View style={{ alignItems: "center", paddingVertical: 40, paddingHorizontal: 20, gap: 16 }}>
          <View style={[styles.lockIcon, { backgroundColor: colors.card, borderColor: "#FFCC00" }]}>
            <Ionicons name="lock-closed" size={34} color="#FFCC00" />
          </View>
          <Text style={{ color: colors.ink, fontSize: 19, fontWeight: "900", textAlign: "center" }}>
            {t("stats.title")}
          </Text>
          <Text style={{ color: colors.inkMuted, fontSize: 14, textAlign: "center", lineHeight: 20 }}>
            {t("paywall.message")}
          </Text>
        </View>
        <PaywallSheet visible onClose={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))} />
      </Screen>
    );
  }

  return (
    <Screen refreshing={loading} onRefresh={load}>
      <Header
        title={t("stats.title")}
        subtitle={t("stats.refreshIn", { sec: secsLeft })}
        onBack={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))}
        right={
          <View style={[styles.timerBadge, { backgroundColor: colors.card, borderColor: colors.line }]}>
            <Ionicons name="time-outline" size={13} color={colors.inkMuted} />
            <Text style={{ color: colors.inkMuted, fontSize: 12, fontWeight: "700" }}>{secsLeft}s</Text>
          </View>
        }
      />

      {/* Tarif tanlovi — Start/Comfort/Comfort+/Business */}
      <View style={styles.tierRow}>
        {TIER_TABS.map((tTab) => {
          const has = !data?.available_tiers || data.available_tiers.includes(tTab.code);
          const active = tier === tTab.code;
          return (
            <Pressable
              key={tTab.code}
              onPress={() => setTier(tTab.code)}
              style={[
                styles.tierTab,
                {
                  backgroundColor: active ? colors.ink : colors.card,
                  borderColor: colors.line,
                  opacity: has ? 1 : 0.4,
                },
              ]}
            >
              <Text style={{ color: active ? "#fff" : colors.inkMuted, fontSize: 12, fontWeight: "800" }}>
                {tTab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Hozir o'smoqda — dinamika ko'rsatkichi */}
      {data?.rising ? (
        <Card padded style={{ borderColor: "#16A34A66", borderWidth: 1.5 }}>
          <View style={styles.cardHead}>
            <View style={styles.barLabel}>
              <Ionicons name="trending-up" size={18} color="#16A34A" />
              <Text style={{ color: colors.ink, fontSize: 14, fontWeight: "900" }}>
                {data.rising.brand} o'smoqda
              </Text>
            </View>
            <Text style={{ color: "#16A34A", fontSize: 16, fontWeight: "900" }}>
              +{data.rising.trend_pct}%
            </Text>
          </View>
        </Card>
      ) : null}

      {loading && !data ? (
        <EmptyState icon="bar-chart-outline" title="Yuklanmoqda..." />
      ) : series.length === 0 ? (
        <EmptyState
          icon="bar-chart-outline"
          title="Hali statistika yo'q"
          subtitle="Yo'lovchilar narx so'raganida ma'lumot to'planadi."
        />
      ) : (
        <>
          <Card padded>
            <View style={styles.cardHead}>
              <Text style={[styles.cardTitle, { color: colors.ink }]}>Hozirgi o'rtacha narx</Text>
              {selBrand ? (
                <Pressable onPress={() => setSelBrand(null)} hitSlop={8}>
                  <Text style={{ color: colors.brandDark, fontSize: 11, fontWeight: "800" }}>Barchasi</Text>
                </Pressable>
              ) : data?.updated_at ? (
                <Text style={{ color: colors.inkMuted, fontSize: 11 }}>{formatTime(data.updated_at)}</Text>
              ) : null}
            </View>

            <View style={{ gap: 14, marginTop: 8 }}>
              {series.map((s) => {
                const pct = Math.min(100, ((s.current || 0) / maxVal) * 100);
                const isSel = selBrand === s.brand;
                const dim = selBrand && !isSel;
                return (
                  <Pressable
                    key={s.brand}
                    onPress={() => setSelBrand(isSel ? null : s.brand)}
                    style={{ opacity: dim ? 0.4 : 1 }}
                  >
                    <View style={styles.barTop}>
                      <View style={styles.barLabel}>
                        <View
                          style={[
                            styles.dot,
                            { backgroundColor: isSel ? colors.brand : s.color, width: isSel ? 12 : 10, height: isSel ? 12 : 10 },
                          ]}
                        />
                        <Text style={{ color: colors.ink, fontSize: 13, fontWeight: isSel ? "900" : "700" }}>
                          {s.brand}
                        </Text>
                      </View>
                      <Text style={{ color: colors.ink, fontSize: 13, fontWeight: "900" }}>
                        {s.current ? formatUzs(s.current) : "—"}
                      </Text>
                    </View>
                    <View style={[styles.track, { backgroundColor: colors.cardAlt }]}>
                      <View
                        style={[
                          styles.fill,
                          { width: `${pct}%`, backgroundColor: isSel ? colors.brand : s.color },
                        ]}
                      />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </Card>

          {/* Bugungi dinamika — 24 soatlik o'rtacha narx grafigi */}
          {dynamics.hasData ? (
            <Card padded>
              <View style={styles.cardHead}>
                <View style={styles.barLabel}>
                  <Ionicons name="pulse" size={16} color={(selColor as string) || colors.brandDark} />
                  <Text style={[styles.cardTitle, { color: colors.ink }]}>
                    {selBrand ? `${selBrand} dinamikasi` : "Bugungi dinamika"}
                  </Text>
                </View>
                <Text style={{ color: colors.inkMuted, fontSize: 11 }}>
                  24 soat · {selBrand ? "narx" : "o'rtacha"}
                </Text>
              </View>
              <View style={styles.chart}>
                {dynamics.points.map((p) => {
                  const span = Math.max(1, dynamics.max - dynamics.base);
                  const h = p.avg ? Math.max(6, ((p.avg - dynamics.base) / span) * 100) : 2;
                  const nowH = new Date().getHours();
                  const isNow = p.hour === nowH;
                  return (
                    <View key={p.hour} style={styles.barCol}>
                      <View
                        style={[
                          styles.bar,
                          {
                            height: `${h}%`,
                            backgroundColor: p.avg
                              ? (isNow ? colors.brandDark : (selColor as string) || colors.brand)
                              : colors.cardAlt,
                          },
                        ]}
                      />
                    </View>
                  );
                })}
              </View>
              <View style={styles.chartAxis}>
                <Text style={{ color: colors.inkMuted, fontSize: 9 }}>00:00</Text>
                <Text style={{ color: colors.inkMuted, fontSize: 9 }}>12:00</Text>
                <Text style={{ color: colors.inkMuted, fontSize: 9 }}>23:00</Text>
              </View>
            </Card>
          ) : null}

          <Text style={[styles.sectionTitle, { color: colors.inkMuted }]}>24 SOATLIK ORALIQ</Text>
          <View style={styles.grid}>
            {series.map((s) => (
              <Card key={s.brand} padded style={styles.statCell}>
                <View style={styles.barLabel}>
                  <View style={[styles.dot, { backgroundColor: s.color }]} />
                  <Text style={{ color: colors.ink, fontSize: 12, fontWeight: "800" }} numberOfLines={1}>
                    {s.brand}
                  </Text>
                </View>
                <Text style={{ color: colors.ink, fontSize: 16, fontWeight: "900", marginTop: 4 }}>
                  {s.current ? formatUzs(s.current) : "—"}
                </Text>
                <Text style={{ color: colors.inkMuted, fontSize: 10, marginTop: 2 }}>
                  {s.min ? `${formatUzs(s.min)} – ${formatUzs(s.max)}` : "ma'lumot yo'q"}
                </Text>
              </Card>
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  lockIcon: {
    width: 74,
    height: 74,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  timerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    height: 32,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tierRow: { flexDirection: "row", gap: 6, marginBottom: 4 },
  tierTab: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth },
  cardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { fontSize: 15, fontWeight: "800" },
  barTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  barLabel: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  track: { height: 10, borderRadius: 5, overflow: "hidden" },
  fill: { height: 10, borderRadius: 5 },
  chart: { flexDirection: "row", alignItems: "flex-end", height: 150, gap: 4, marginTop: 14 },
  barCol: { flex: 1, height: "100%", justifyContent: "flex-end" },
  bar: { width: "100%", borderRadius: 3, minHeight: 3 },
  chartAxis: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  sectionTitle: { fontSize: 11, fontWeight: "800", letterSpacing: 0.5, marginLeft: 2 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCell: { width: "47.5%", flexGrow: 1 },
});
