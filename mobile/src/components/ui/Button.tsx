import React from "react";
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  ViewStyle,
  StyleProp,
} from "react-native";
import { useTheme, radius } from "@/theme";

type Variant = "primary" | "outline" | "ghost" | "dark";

export function Button({
  title,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  icon,
  style,
  small = false,
}: {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
}) {
  const { colors } = useTheme();
  const isDisabled = disabled || loading;

  const bg =
    variant === "primary"
      ? colors.brand
      : variant === "dark"
      ? colors.ink
      : "transparent";
  const border =
    variant === "outline" ? colors.line : "transparent";
  const textColor =
    variant === "primary"
      ? "#0F1216"
      : variant === "dark"
      ? colors.card
      : colors.ink;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.btn,
        small && styles.small,
        {
          backgroundColor: bg,
          borderColor: border,
          borderWidth: variant === "outline" ? StyleSheet.hairlineWidth * 2 : 0,
          opacity: isDisabled ? 0.55 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <View style={styles.row}>
          {icon}
          <Text
            style={[
              styles.text,
              small && styles.textSmall,
              { color: textColor },
              icon ? { marginLeft: 8 } : null,
            ]}
          >
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 52,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  small: {
    height: 38,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
  },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  text: { fontSize: 16, fontWeight: "800" },
  textSmall: { fontSize: 13, fontWeight: "700" },
});
