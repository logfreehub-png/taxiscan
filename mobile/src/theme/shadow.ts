import { Platform, ViewStyle } from "react-native";

function toRgba(color: string, opacity: number): string {
  let hex = color.replace("#", "");
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return color;
  const n = parseInt(hex, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${opacity})`;
}

/**
 * Platformaga mos soya: webda boxShadow, mobilda shadow* stillari
 * (react-native-web shadow* ni eskirgan deb ogohlantiradi)
 */
export function shadow({
  color = "#000",
  opacity,
  radius,
  offsetX = 0,
  offsetY = 0,
}: {
  color?: string;
  opacity: number;
  radius: number;
  offsetX?: number;
  offsetY?: number;
}): ViewStyle {
  if (Platform.OS === "web") {
    return { boxShadow: `${offsetX}px ${offsetY}px ${radius}px ${toRgba(color, opacity)}` } as ViewStyle;
  }
  return {
    shadowColor: color,
    shadowOpacity: opacity,
    shadowRadius: radius,
    shadowOffset: { width: offsetX, height: offsetY },
  };
}
