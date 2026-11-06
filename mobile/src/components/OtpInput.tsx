import React, { useEffect, useRef } from "react";
import { View, TextInput, StyleSheet, Platform } from "react-native";
import { useTheme } from "@/theme";

interface Props {
  value: string;
  onChange: (code: string) => void;
  length?: number;
  error?: boolean;
  autoFocus?: boolean;
}

/**
 * 6 ta alohida katakli kod kiritish.
 * - raqam yozilsa keyingi katakka o'tadi
 * - o'chirilsa (Backspace) oldingi katakka qaytadi
 * - butun kod paste qilinsa kataklarga taqsimlanadi
 */
export function OtpInput({ value, onChange, length = 6, error, autoFocus = true }: Props) {
  const { colors } = useTheme();
  const refs = useRef<(TextInput | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] || "");

  useEffect(() => {
    if (autoFocus) {
      const t = setTimeout(() => refs.current[0]?.focus(), 250);
      return () => clearTimeout(t);
    }
  }, [autoFocus]);

  const setAt = (index: number, text: string) => {
    const clean = text.replace(/\D/g, "");

    // Bir nechta raqam (paste yoki SMS autofill) — joriy katakdan boshlab to'ldiramiz
    if (clean.length > 1) {
      const next = (value.slice(0, index) + clean).slice(0, length);
      onChange(next);
      refs.current[Math.min(next.length, length - 1)]?.focus();
      return;
    }

    const arr = [...digits];
    arr[index] = clean;
    const next = arr.join("").slice(0, length);
    onChange(next);
    if (clean && index < length - 1) refs.current[index + 1]?.focus();
  };

  const onKeyPress = (index: number, key: string) => {
    if (key !== "Backspace") return;
    if (digits[index]) {
      // Joriy katakni tozalaymiz va oldingisiga qaytamiz
      const arr = [...digits];
      arr[index] = "";
      onChange(arr.join(""));
      if (index > 0) refs.current[index - 1]?.focus();
    } else if (index > 0) {
      const arr = [...digits];
      arr[index - 1] = "";
      onChange(arr.join(""));
      refs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={styles.row}>
      {digits.map((d, i) => (
        <TextInput
          key={i}
          ref={(r) => {
            refs.current[i] = r;
          }}
          value={d}
          onChangeText={(t) => setAt(i, t)}
          onKeyPress={({ nativeEvent }) => onKeyPress(i, nativeEvent.key)}
          keyboardType="number-pad"
          textContentType={i === 0 ? "oneTimeCode" : "none"}
          autoComplete={i === 0 ? "sms-otp" : "off"}
          maxLength={i === 0 ? length : 1}
          selectTextOnFocus
          caretHidden
          style={[
            styles.box,
            {
              backgroundColor: colors.cardAlt,
              color: colors.ink,
              borderColor: error ? colors.red : d ? colors.brand : colors.line,
            },
            Platform.OS === "web" && ({ outlineStyle: "none" } as any),
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  box: {
    flex: 1,
    maxWidth: 52,
    height: 56,
    borderRadius: 14,
    borderWidth: 2,
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
    padding: 0,
  },
});
