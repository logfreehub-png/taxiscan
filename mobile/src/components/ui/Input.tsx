import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  TextInputProps,
  StyleProp,
  ViewStyle,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, radius } from "@/theme";

export const Field = React.forwardRef<
  TextInput,
  TextInputProps & {
    label?: string;
    error?: string | null;
    leftIcon?: React.ReactNode;
    rightSlot?: React.ReactNode;
    containerStyle?: StyleProp<ViewStyle>;
  }
>(function Field(
  { label, error, leftIcon, rightSlot, containerStyle, secureTextEntry, ...props },
  forwardedRef
) {
  const { colors } = useTheme();
  const localRef = useRef<TextInput>(null);
  // Parol maydonlarida ko'z ikonkasi orqali parolni ko'rsatish/yashirish
  const [passwordVisible, setPasswordVisible] = useState(false);

  const setRefs = (node: TextInput | null) => {
    (localRef as any).current = node;
    if (typeof forwardedRef === "function") {
      forwardedRef(node);
    } else if (forwardedRef) {
      (forwardedRef as any).current = node;
    }
  };

  const focusInput = () => {
    localRef.current?.focus();
  };

  return (
    <View style={containerStyle}>
      {label ? (
        <Text style={[styles.label, { color: colors.inkMuted }]}>{label}</Text>
      ) : null}
      <View
        // @ts-ignore Web pointer
        onClick={Platform.OS === "web" ? focusInput : undefined}
        style={[
          styles.inputWrap,
          {
            backgroundColor: colors.card,
            borderColor: error ? colors.red : colors.line,
            ...(Platform.OS === "web" ? { cursor: "text" } : {}),
          } as any,
        ]}
      >
        {leftIcon ? (
          <View
            style={[
              styles.left,
              Platform.OS === "web" ? styles.noPointer : undefined,
            ]}
            pointerEvents={Platform.OS === "web" ? undefined : "none"}
          >
            {leftIcon}
          </View>
        ) : null}
        <TextInput
          ref={setRefs}
          placeholderTextColor={colors.inkMuted}
          style={[
            styles.input,
            { color: colors.ink },
            Platform.OS === "web" && ({ outlineStyle: "none" } as any),
          ]}
          {...props}
          secureTextEntry={secureTextEntry && !passwordVisible}
        />
        {rightSlot ? <View style={styles.right}>{rightSlot}</View> : null}
        {secureTextEntry ? (
          <Pressable
            onPress={() => setPasswordVisible((v) => !v)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={passwordVisible ? "Parolni yashirish" : "Parolni ko'rsatish"}
            style={styles.right}
          >
            <Ionicons
              name={passwordVisible ? "eye-off-outline" : "eye-outline"}
              size={20}
              color={colors.inkMuted}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={[styles.error, { color: colors.red }]}>{error}</Text> : null}
    </View>
  );
});

/**
 * O'zbekiston raqamidan 9 ta mahalliy raqamni ajratib olish (998 prefiksisiz)
 */
export function extractUzPhoneDigits(raw: string): string {
  if (!raw) return "";
  let digits = String(raw).replace(/\D/g, "");
  if (digits.startsWith("998")) {
    digits = digits.slice(3);
  }
  return digits.slice(0, 9);
}

/**
 * 9 ta raqamni chiroyli ko'rinishga keltirish: (90) 123-45-67
 */
export function formatUzPhoneMask(digits: string): string {
  const d = digits.slice(0, 9);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 5) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2, 5)}-${d.slice(5)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 5)}-${d.slice(5, 7)}-${d.slice(7, 9)}`;
}

/**
 * O'zbekiston telefon raqamlari uchun qulay PhoneField.
 * - +998 doimiy prefiks sifatida chapda turadi
 * - Foydalanuvchi faqat 9 ta raqamni kiritadi: (90) 123-45-67
 * - Tasodifan +998 o'chib ketmaydi yoki ikki marta yozilmaydi
 * - onChangePhone to'liq "+998901234567" formatini qaytaradi
 */
export function PhoneField({
  label = "Telefon raqam",
  value,
  onChangePhone,
  error,
  containerStyle,
}: {
  label?: string;
  value: string; // "+998901234567" yoki "901234567"
  onChangePhone: (fullPhone: string, rawDigits: string) => void;
  error?: string | null;
  containerStyle?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const inputRef = useRef<TextInput>(null);

  const rawDigits = extractUzPhoneDigits(value);
  const displayValue = formatUzPhoneMask(rawDigits);

  const handleChangeText = (text: string) => {
    const digits = extractUzPhoneDigits(text);
    const full = digits.length > 0 ? `+998${digits}` : "+998";
    onChangePhone(full, digits);
  };

  const focusInput = () => {
    inputRef.current?.focus();
  };

  return (
    <View style={containerStyle}>
      {label ? (
        <Text style={[styles.label, { color: colors.inkMuted }]}>{label}</Text>
      ) : null}
      <View
        // @ts-ignore Web pointer
        onClick={Platform.OS === "web" ? focusInput : undefined}
        style={[
          styles.inputWrap,
          {
            backgroundColor: colors.card,
            borderColor: error ? colors.red : colors.line,
            ...(Platform.OS === "web" ? { cursor: "text" } : {}),
          } as any,
        ]}
      >
        {/* Telefon belgisi va doimiy +998 prefiksi */}
        <View
          style={[
            styles.phonePrefixRow,
            Platform.OS === "web" ? styles.noPointer : undefined,
          ]}
          pointerEvents={Platform.OS === "web" ? undefined : "none"}
        >
          <Ionicons name="call-outline" size={18} color={colors.inkMuted} />
          <Text style={[styles.prefixText, { color: colors.ink }]}>+998</Text>
          <View style={[styles.prefixDivider, { backgroundColor: colors.line }]} />
        </View>

        <TextInput
          ref={inputRef}
          value={displayValue}
          onChangeText={handleChangeText}
          placeholder="(90) 123-45-67"
          placeholderTextColor={colors.inkMuted}
          keyboardType="phone-pad"
          maxLength={15} // "(90) 123-45-67"
          style={[
            styles.input,
            { color: colors.ink },
            Platform.OS === "web" && ({ outlineStyle: "none" } as any),
          ]}
        />
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
  phonePrefixRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingRight: 8,
  },
  prefixText: {
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 2,
  },
  prefixDivider: {
    width: 1,
    height: 22,
    marginLeft: 6,
  },
  // Webda pointerEvents faqat StyleSheet.create ichida ishlaydi
  noPointer: { pointerEvents: "none" },
  left: { marginRight: 8 },
  right: { marginLeft: 8 },
  input: {
    flex: 1,
    fontSize: 16,
    height: "100%",
    paddingVertical: 0,
    fontWeight: "500",
  },
  error: { fontSize: 11, marginTop: 4, marginLeft: 2, fontWeight: "600" },
});
