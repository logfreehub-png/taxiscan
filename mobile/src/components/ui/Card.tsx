import React from "react";
import { View, StyleSheet, ViewStyle, StyleProp, Platform } from "react-native";
import { useTheme, radius } from "@/theme";

export function Card({
  children,
  style,
  padded = false,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}) {
  const { colors, isDark } = useTheme();

  const shadowStyle: any =
    Platform.OS === "web"
      ? { boxShadow: isDark ? "none" : "0px 4px 12px rgba(0, 0, 0, 0.06)" }
      : {
          shadowColor: colors.shadow,
          shadowOpacity: isDark ? 0 : 0.06,
          shadowOffset: { width: 0, height: 4 },
          shadowRadius: 12,
          elevation: 1,
        };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.line,
        },
        shadowStyle,
        padded && styles.padded,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  padded: {
    padding: 16,
  },
});
