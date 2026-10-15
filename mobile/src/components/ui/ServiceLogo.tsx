import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { BRAND_LOGOS } from "@/assets/brandLogos";

/**
 * Taksi brendining logotipi.
 *
 * 1) Backend'da xizmat uchun logo rasmi bo'lsa (`uri`) — backend rasmi ko'rsatiladi.
 * 2) Mahalliy ilovaga joylangan haqiqiy PNG logotiplari (`BRAND_LOGOS`) ko'rsatiladi.
 * 3) Rasm bo'lmasa — brendning rasmiy rangi va tanish belgisi chiziladi.
 */
type Brand = {
  bg: string;
  fg: string;
  label: string;
  scale: number;
  italic?: boolean;
};

const BRANDS: Record<string, Brand> = {
  yandex_go: { bg: "#FFCC00", fg: "#111111", label: "Y", scale: 0.54 },
  yandex: { bg: "#FFCC00", fg: "#111111", label: "Y", scale: 0.54 },
  uklon: { bg: "#0E0E0E", fg: "#B8F500", label: "U", scale: 0.52 },
  fast: { bg: "#FF6B00", fg: "#FFFFFF", label: "F", scale: 0.52 },
  fasten: { bg: "#FF6B00", fg: "#FFFFFF", label: "F", scale: 0.52 },
  wb_taxi: { bg: "#7B2CBF", fg: "#FFFFFF", label: "WB", scale: 0.36 },
  wb: { bg: "#7B2CBF", fg: "#FFFFFF", label: "WB", scale: 0.36 },
  mytaxi: { bg: "#0066CC", fg: "#FFFFFF", label: "my", scale: 0.42, italic: true },
};

const ALIASES: Record<string, string> = {
  yandex: "yandex",
  yandexgo: "yandex",
  yandex_go: "yandex",
  uklon: "uklon",
  wb: "wb",
  wbtaxi: "wb",
  wb_taxi: "wb",
  fast: "fasten",
  fasten: "fasten",
  mytaxi: "mytaxi",
};

export function resolveBrand(code: string): Brand | null {
  const base = (code || "").split("__")[0].toLowerCase().replace(/[^a-z_]/g, "");
  return BRANDS[base] || BRANDS[ALIASES[base]] || null;
}

function contrastText(hex: string): string {
  const c = (hex || "").replace("#", "");
  if (c.length < 6) return "#FFFFFF";
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.65 ? "#0F1216" : "#FFFFFF";
}

export function ServiceLogo({
  code,
  color,
  size = 44,
  uri,
}: {
  code: string;
  color?: string;
  size?: number;
  /** Backend'dagi asl logo rasmi manzili (bo'lsa) */
  uri?: string | null;
}) {
  const radius = size * 0.24;

  // 1) ASL LOGO rasmi (backend'dan bo'lsa)
  if (uri) {
    return (
      <View
        style={[
          styles.box,
          { width: size, height: size, borderRadius: radius, backgroundColor: "#FFFFFF", overflow: "hidden" },
        ]}
      >
        <Image source={{ uri }} style={{ width: size, height: size }} resizeMode="cover" />
      </View>
    );
  }

  // 2) MAHALLIY HAKIQIY PNG BREND LOGOTIPI (assets/logos/)
  const cleanCode = (code || "").split("__")[0].toLowerCase();
  const brandKey = ALIASES[cleanCode] || cleanCode;
  const localLogo = BRAND_LOGOS[brandKey];

  if (localLogo) {
    return (
      <View
        style={[
          styles.box,
          { width: size, height: size, borderRadius: radius, overflow: "hidden" },
        ]}
      >
        <Image source={localLogo} style={{ width: size, height: size }} resizeMode="cover" />
      </View>
    );
  }

  // 3) FALLBACK BREND BELGISI
  const brand = resolveBrand(code);
  const bg = brand?.bg || color || "#888";
  const fg = brand?.fg || contrastText(bg);
  const label =
    brand?.label || (code ? code.split("__")[0].charAt(0).toUpperCase() : "?");
  const scale = brand?.scale ?? 0.42;

  return (
    <View
      style={[
        styles.box,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: bg,
          shadowColor: bg,
          shadowOpacity: 0.35,
          shadowRadius: size * 0.14,
          shadowOffset: { width: 0, height: 1 },
        },
      ]}
    >
      <Text
        allowFontScaling={false}
        style={{
          color: fg,
          fontWeight: "900",
          fontSize: size * scale,
          fontStyle: brand?.italic ? "italic" : "normal",
          letterSpacing: label.length > 1 ? -0.5 : 0,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: "center",
    justifyContent: "center",
  },
});
