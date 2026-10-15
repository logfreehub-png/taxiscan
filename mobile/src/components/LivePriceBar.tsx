import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, radius } from "@/theme";
import { apiGet } from "@/lib/api/client";
import { formatUzs } from "@/lib/format";
import { ServiceLogo } from "./ui/ServiceLogo";
import type { LiveResponse } from "@/lib/api/types";
import { useI18n } from "@/i18n";

const REFRESH_SEC = 30;

/** Real-time narxlar paneli — har 30 soniyada yangilanadi */
export function LivePriceBar({ tier }: { tier?: string }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [data, setData] = useState<LiveResponse | null>(null);
  const [secsLeft, setSecsLeft] = useState(REFRESH_SEC);
  const blink = useRef(new Animated.Value(1)).current;

  const load = async () => {
    try {
      const url = tier ? `/taxi/live-prices/?tier=${tier}` : "/taxi/live-prices/";
      const r = await apiGet<LiveResponse>(url);
      setData(r);
      setSecsLeft(REFRESH_SEC);
      Animated.sequence([
        Animated.timing(blink, { toValue: 0.4, duration: 150, useNativeDriver: true }),
        Animated.timing(blink, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]).start();
    } catch {
      /* sukut saqlaymiz — backend o'chiq bo'lishi mumkin */
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(() => {
      setSecsLeft((s) => {
        if (s <= 1) {
          load();
          return REFRESH_SEC;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tier]);

  if (!data || data.results.length === 0) return null;

  return (
    <View style={[styles.wrap, { backgroundColor: colors.card, borderColor: colors.brand }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Animated.View style={[styles.dot, { opacity: blink }]} />
          <Ionicons name="radio-outline" size={14} color={colors.ink} />
          <Text style={[styles.title, { color: colors.ink }]}>{t("passenger.realtimePrices")}</Text>
        </View>
        <Text style={[styles.secs, { color: colors.inkMuted }]}>{secsLeft}s</Text>
      </View>

      <View style={{ gap: 6 }}>
        {data.results.map((r) => {
          const trendColor =
            r.trend === "up" ? colors.red : r.trend === "down" ? colors.green : colors.inkMuted;
          const trendBg =
            r.trend === "up" ? colors.redBg : r.trend === "down" ? colors.greenBg : colors.cardAlt;
          const trendIcon =
            r.trend === "up" ? "trending-up" : r.trend === "down" ? "trending-down" : "remove";
          return (
            <View
              key={r.service.id}
              style={[
                styles.line,
                r.is_cheapest && { backgroundColor: colors.brand + "22", borderColor: colors.brand, borderWidth: 1 },
              ]}
            >
              <ServiceLogo code={r.service.code} color={r.service.color} size={26} />
              <Text style={[styles.brand, { color: colors.ink }]} numberOfLines={1}>
                {r.service.brand}
              </Text>
              <Text style={[styles.linePrice, { color: colors.ink }]}>{formatUzs(r.price_uzs)}</Text>
              <View style={[styles.trend, { backgroundColor: trendBg }]}>
                <Ionicons name={trendIcon as any} size={10} color={trendColor} />
                <Text style={[styles.trendTxt, { color: trendColor }]}>
                  {r.trend === "flat" ? "0" : `${r.change_pct > 0 ? "+" : ""}${r.change_pct}%`}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      <Text style={[styles.note, { color: colors.inkMuted }]}>
        {t("passenger.realtimeNote")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.lg,
    borderWidth: 2,
    padding: 14,
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#EF4444" },
  title: { fontSize: 14, fontWeight: "900" },
  secs: { fontSize: 11, fontWeight: "600" },
  line: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: radius.sm,
  },
  brand: { flex: 1, fontSize: 13, fontWeight: "700" },
  linePrice: { fontSize: 14, fontWeight: "900" },
  trend: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    minWidth: 44,
    justifyContent: "center",
  },
  trendTxt: { fontSize: 10, fontWeight: "800" },
  note: { fontSize: 10, marginTop: 10, fontStyle: "italic" },
});
