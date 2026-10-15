import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme";
import { Card } from "./Card";

export function EmptyState({
  icon = "search-outline",
  title,
  subtitle,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
}) {
  const { colors } = useTheme();
  return (
    <Card padded style={styles.card}>
      <View style={[styles.iconCircle, { backgroundColor: colors.cardAlt }]}>
        <Ionicons name={icon} size={26} color={colors.inkMuted} />
      </View>
      <Text style={[styles.title, { color: colors.ink }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.sub, { color: colors.inkMuted }]}>{subtitle}</Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: "center", paddingVertical: 32 },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  title: { fontSize: 15, fontWeight: "800", textAlign: "center" },
  sub: { fontSize: 13, textAlign: "center", marginTop: 4, lineHeight: 18 },
});
