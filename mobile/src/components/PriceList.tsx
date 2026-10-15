import React, { useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, radius } from "@/theme";
import { formatUzs, formatNum } from "@/lib/format";
import { openTaxiApp } from "@/lib/openTaxiApp";
import { ServiceLogo } from "./ui/ServiceLogo";
import { Badge } from "./ui/Badge";
import { EmptyState } from "./ui/EmptyState";
import type { PriceRow } from "@/lib/api/types";
import { useI18n } from "@/i18n";

const TIER_LABELS: Record<string, string> = {
  econom: "Start",
  comfort: "Comfort",
  comfort_plus: "Comfort+",
  business: "Business",
  delivery: "Dostavka",
};

// Brend aksiya eslatmalari (kartadan to'lov bonuslari)
const BRAND_NOTES: Record<string, string> = {
  "WB Taxi": "Kartadan — yo'l pulining 50% i tarvuz bonusiga qaytadi",
  "Yandex Go": "Obuna + kartadan to'lovda ball yig'iladi",
};

export function PriceList({
  rows,
  start,
  end,
  showBreakdown = true,
  sortMode = "cheap-first",
}: {
  rows: PriceRow[];
  start: { lat: number; lng: number };
  end: { lat: number; lng: number } | null;
  showBreakdown?: boolean;
  sortMode?: "cheap-first" | "expensive-first";
}) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [openId, setOpenId] = useState<number | null>(null);

  const sorted = useMemo(() => {
    const copy = [...(rows || [])];
    copy.sort((a, b) =>
      sortMode === "expensive-first" ? b.price_uzs - a.price_uzs : a.price_uzs - b.price_uzs
    );
    return copy;
  }, [rows, sortMode]);

  if (!rows || rows.length === 0) {
    return (
      <EmptyState
        icon="pricetags-outline"
        title="Hozircha narx yo'q"
        subtitle="Manzilni kiriting va narxlarni hisoblang."
      />
    );
  }

  return (
    <View style={{ gap: 10 }}>
      {sorted.map((r) => {
        const isOpen = openId === r.service.id;
        const tierLabel = r.service.tier ? TIER_LABELS[r.service.tier] : null;
        return (
          <View
            key={r.service.id}
            style={[
              styles.row,
              {
                backgroundColor: colors.card,
                borderColor: r.is_cheapest ? colors.brand : colors.line,
                borderWidth: r.is_cheapest ? 2 : StyleSheet.hairlineWidth,
              },
            ]}
          >
            <View style={styles.main}>
              <ServiceLogo code={r.service.code} color={r.service.color} uri={r.service.logo} size={46} />

              <View style={styles.info}>
                <View style={styles.titleRow}>
                  <Text style={[styles.name, { color: colors.ink }]} numberOfLines={1}>
                    {r.service.name}
                  </Text>
                </View>
                <View style={styles.badges}>
                  {tierLabel ? (
                    <Badge label={tierLabel} bg={colors.cardAlt} color={colors.inkMuted} />
                  ) : null}
                  {r.is_cheapest ? (
                    <Badge
                      label={t("passenger.cheapest")}
                      bg={colors.brand}
                      color="#0F1216"
                      icon={<Ionicons name="sparkles" size={9} color="#0F1216" />}
                    />
                  ) : null}
                  {r.surge > 1.05 ? (
                    <Badge label={`x${formatNum(r.surge, 1)}`} bg={colors.orangeBg} color={colors.orange} />
                  ) : null}
                </View>
                <Text style={[styles.meta, { color: colors.inkMuted }]}>
                  {formatNum(r.distance_km, 1)} km · {formatNum(r.duration_min, 0)} {t("passenger.minUnit")}
                  {r.diff_from_cheapest && r.diff_from_cheapest > 0
                    ? `  +${formatUzs(r.diff_from_cheapest)}`
                    : ""}
                </Text>
                {BRAND_NOTES[r.service.brand || ""] ? (
                  <Text style={{ color: "#16A34A", fontSize: 11, fontWeight: "700", marginTop: 3 }}>
                    💳 {BRAND_NOTES[r.service.brand || ""]}
                  </Text>
                ) : null}
              </View>

              <View style={styles.priceCol}>
                <Text style={[styles.price, { color: colors.ink }]}>
                  {formatUzs(r.price_uzs)}
                </Text>
                <View style={styles.actions}>
                  {showBreakdown && r.breakdown ? (
                    <Pressable
                      onPress={() => setOpenId(isOpen ? null : r.service.id)}
                      hitSlop={8}
                      style={styles.actionBtn}
                    >
                      <Text style={[styles.actionTxt, { color: colors.inkMuted }]}>{t("passenger.breakdown")}</Text>
                      <Ionicons
                        name={isOpen ? "chevron-up" : "chevron-down"}
                        size={12}
                        color={colors.inkMuted}
                      />
                    </Pressable>
                  ) : null}
                  <Pressable
                    onPress={() => openTaxiApp(r.service, start, end)}
                    hitSlop={8}
                    style={styles.actionBtn}
                  >
                    <Text style={[styles.actionTxt, { color: colors.brandDark }]}>{t("passenger.openApp")}</Text>
                    <Ionicons name="open-outline" size={11} color={colors.brandDark} />
                  </Pressable>
                </View>
              </View>
            </View>

            {isOpen && r.breakdown ? (
              <View style={[styles.breakdown, { backgroundColor: colors.cardAlt, borderTopColor: colors.line }]}>
                <BreakRow label={t("passenger.breakdownBase")} value={r.breakdown.base} colors={colors} />
                <BreakRow
                  label={t("passenger.breakdownDistance", { km: formatNum(r.distance_km, 1) })}
                  value={r.breakdown.distance_part}
                  colors={colors}
                />
                <BreakRow
                  label={t("passenger.breakdownTime", { min: formatNum(r.duration_min, 0) })}
                  value={r.breakdown.time_part}
                  colors={colors}
                />
                {r.surge > 1.05 ? (
                  <BreakRow
                    label={`Surge x${formatNum(r.surge, 2)}`}
                    value={r.breakdown.surge_extra}
                    colors={colors}
                    accent
                  />
                ) : null}
                <View style={[styles.totalRow, { borderTopColor: colors.line }]}>
                  <Text style={[styles.totalLabel, { color: colors.ink }]}>{t("passenger.total")}</Text>
                  <Text style={[styles.totalLabel, { color: colors.ink }]}>
                    {formatUzs(r.price_uzs)}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function BreakRow({
  label,
  value,
  colors,
  accent,
}: {
  label: string;
  value: number;
  colors: any;
  accent?: boolean;
}) {
  return (
    <View style={styles.breakLine}>
      <Text style={{ color: accent ? colors.orange : colors.inkMuted, fontSize: 12, fontWeight: accent ? "700" : "500" }}>
        {label}
      </Text>
      <Text style={{ color: colors.ink, fontSize: 12, fontWeight: "600" }}>{formatUzs(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  main: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  info: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: "row", alignItems: "center" },
  name: { fontSize: 15, fontWeight: "800" },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 4 },
  meta: { fontSize: 11, marginTop: 4 },
  priceCol: { alignItems: "flex-end" },
  price: { fontSize: 18, fontWeight: "900" },
  actions: { flexDirection: "row", gap: 12, marginTop: 4 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
  actionTxt: { fontSize: 12, fontWeight: "700" },
  breakdown: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  breakLine: { flexDirection: "row", justifyContent: "space-between" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    marginTop: 4,
  },
  totalLabel: { fontSize: 14, fontWeight: "900" },
});
