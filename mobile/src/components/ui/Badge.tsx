import React from "react";
import { View, Text, StyleSheet, ViewStyle, StyleProp } from "react-native";
import { radius } from "@/theme";

export function Badge({
  label,
  bg,
  color,
  icon,
  style,
}: {
  label: string;
  bg: string;
  color: string;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]}>
      {icon}
      <Text style={[styles.text, { color }, icon ? { marginLeft: 3 } : null]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    alignSelf: "flex-start",
  },
  text: { fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.3 },
});
