import React, { useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, radius } from "@/theme";
import { formatUzs } from "@/lib/format";
import type { Tier, PriceRow } from "@/lib/api/types";
import { useI18n } from "@/i18n";

const TIERS: {
  code: Tier;
  labelKey: string;
  icon: keyof typeof Ionicons.glyphMap;
  descKey: string;
}[] = [
  { code: "econom", labelKey: "passenger.tierStart", icon: "car-outline", descKey: "passenger.tierEconomDesc" },
  { code: "comfort", labelKey: "passenger.tierComfort", icon: "car-sport-outline", descKey: "passenger.tierComfortDesc" },
  { code: "comfort_plus", labelKey: "passenger.tierComfortPlus", icon: "ribbon-outline", descKey: "passenger.tierComfortPlusDesc" },
  { code: "business", labelKey: "passenger.tierBusiness", icon: "briefcase-outline", descKey: "passenger.tierBusinessDesc" },
];

export function TierPicker({
  rows,
  selected,
  onSelect,
}: {
  rows?: PriceRow[];
  selected: Tier;
  onSelect: (t: Tier) => void;
}) {
  const { colors } = useTheme();
  const { t } = useI18n();

  const minByTier = useMemo(() => {
    const acc: Record<string, number | null> = {};
    for (const item of TIERS) {
      if (!rows || rows.length === 0) {
        acc[item.code] = null;
        continue;
      }
      const xs = rows.filter((r) => r.service.tier === item.code).map((r) => r.price_uzs);
      acc[item.code] = xs.length ? Math.min(...xs) : null;
    }
    return acc;
  }, [rows]);

  return (
    <View style={styles.grid}>
      {TIERS.map((item) => {
        const isSel = selected === item.code;
        const min = minByTier[item.code];
        return (
          <Pressable
            key={item.code}
            onPress={() => onSelect(item.code)}
            style={[
              styles.cell,
              {
                backgroundColor: isSel ? colors.brand : colors.card,
                borderColor: isSel ? colors.ink : colors.line,
              },
            ]}
          >
            <View style={styles.cellTop}>
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: isSel ? colors.ink : colors.cardAlt },
                ]}
              >
                <Ionicons
                  name={item.icon}
                  size={15}
                  color={isSel ? colors.brand : colors.inkMuted}
                />
              </View>
              <Text style={[styles.label, { color: isSel ? "#0F1216" : colors.ink }]}>
                {t(item.labelKey)}
              </Text>
            </View>
            <Text
              style={[
                styles.desc,
                { color: isSel ? "rgba(15,18,22,0.6)" : colors.inkMuted },
              ]}
            >
              {t(item.descKey).toUpperCase()}
            </Text>
            <Text style={[styles.price, { color: isSel ? "#0F1216" : colors.ink }]}>
              {min != null ? (
                <>
                  <Text style={styles.dan}>{t("passenger.fromPrice")}</Text>
                  {formatUzs(min)}
                </>
              ) : (
                <Text style={{ color: isSel ? "rgba(15,18,22,0.6)" : colors.inkMuted, fontSize: 12 }}>
                  {t("passenger.needAddress")}
                </Text>
              )}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  cell: {
    width: "47.5%",
    flexGrow: 1,
    borderWidth: 2,
    borderRadius: radius.lg,
    padding: 12,
  },
  cellTop: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  label: { fontSize: 14, fontWeight: "900" },
  desc: { fontSize: 9, fontWeight: "700", letterSpacing: 0.5 },
  price: { fontSize: 15, fontWeight: "900", marginTop: 6 },
  dan: { fontSize: 10, fontWeight: "700" },
});
