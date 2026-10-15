import React from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  StyleProp,
  ViewStyle,
} from "react-native";
import { useTheme, radius } from "@/theme";

export function Field({
  label,
  error,
  leftIcon,
  rightSlot,
  containerStyle,
  ...props
}: TextInputProps & {
  label?: string;
  error?: string | null;
  leftIcon?: React.ReactNode;
  rightSlot?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  return (
    <View style={containerStyle}>
      {label ? (
        <Text style={[styles.label, { color: colors.inkMuted }]}>{label}</Text>
      ) : null}
      <View
        style={[
          styles.inputWrap,
          {
            backgroundColor: colors.card,
            borderColor: error ? colors.red : colors.line,
          },
        ]}
      >
        {leftIcon ? <View style={styles.left}>{leftIcon}</View> : null}
        <TextInput
          placeholderTextColor={colors.inkMuted}
          style={[styles.input, { color: colors.ink }]}
          {...props}
        />
        {rightSlot ? <View style={styles.right}>{rightSlot}</View> : null}
      </View>
      {error ? <Text style={[styles.error, { color: colors.red }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
    marginLeft: 2,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: 12,
  },
  left: { marginRight: 8 },
  right: { marginLeft: 8 },
  input: {
    flex: 1,
    fontSize: 16,
    height: "100%",
    fontWeight: "500",
  },
  error: { fontSize: 11, marginTop: 4, marginLeft: 2, fontWeight: "600" },
});
