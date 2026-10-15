import React from "react";
import { View, Text, StyleSheet, Pressable, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme";

export function Logo({ size = 32 }: { size?: number }) {
  const { colors } = useTheme();
  return (
    <View style={styles.logoRow}>
      <Image
        source={require("@/assets/logo.png")}
        style={{ width: size, height: size, borderRadius: 6 }}
        resizeMode="contain"
      />
      <Text style={[styles.logoText, { color: colors.ink }]}>
        Taxi<Text style={{ color: colors.brandDark }}>Scan</Text>
      </Text>
    </View>
  );
}

export function Header({
  title,
  subtitle,
  right,
  showLogo = true,
  showBack,
  onBack,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  showLogo?: boolean;
  showBack?: boolean;
  onBack?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {showBack || onBack ? (
            <Pressable onPress={onBack} hitSlop={12} style={{ marginRight: 4 }}>
              <Ionicons name="arrow-back" size={24} color={colors.ink} />
            </Pressable>
          ) : null}
          {showLogo && !showBack && !onBack ? (
            <Image
              source={require("@/assets/logo.png")}
              style={{ width: 28, height: 28, borderRadius: 6 }}
              resizeMode="contain"
            />
          ) : null}
          <Text style={[styles.title, { color: colors.ink }]}>{title}</Text>
        </View>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: colors.inkMuted }]}>{subtitle}</Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

export function IconButton({
  name,
  onPress,
  color,
}: {
  name: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  color?: string;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.iconBtn,
        { backgroundColor: colors.card, borderColor: colors.line, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Ionicons name={name} size={18} color={color || colors.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  logoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  logoMark: { borderRadius: 9, alignItems: "center", justifyContent: "center" },
  logoText: { fontSize: 19, fontWeight: "900" },
  header: { flexDirection: "row", alignItems: "center", marginTop: 4, marginBottom: 2 },
  title: { fontSize: 24, fontWeight: "900" },
  subtitle: { fontSize: 13, marginTop: 2, lineHeight: 18 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
});
