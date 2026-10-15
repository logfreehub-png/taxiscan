import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
} from "react-native";
import { useRouter, Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/store/auth";
import { useTheme, radius } from "@/theme";
import { useI18n } from "@/i18n";
import { Logo } from "@/components/ui/Header";
import { Field } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LanguageSwitchPill } from "@/components/LanguageSelectModal";

export default function RegisterScreen() {
  const router = useRouter();
  const register = useAuth((s) => s.register);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();

  const [role, setRole] = useState<"passenger" | "driver">("passenger");
  const [phone, setPhone] = useState("+998");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (password !== password2) {
      setError(t("auth.passwordsDoNotMatch"));
      return;
    }
    if (password.length < 6) {
      setError(t("auth.passwordMinLength"));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await register({
        phone: phone.trim(),
        password,
        password2,
        role,
        first_name: "",
        last_name: "",
        city: "Tashkent",
      });
      router.replace("/(tabs)");
    } catch (err: any) {
      const data = err?.data;
      const first =
        (data && typeof data === "object" && Object.values(data)[0]) ||
        t("auth.registerError");
      setError(Array.isArray(first) ? first[0] : String(first));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.flex, { backgroundColor: colors.bg }]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 30 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <Logo size={34} />
          <LanguageSwitchPill />
        </View>

        <Card padded style={{ marginTop: 12 }}>
          <Text style={[styles.title, { color: colors.ink }]}>{t("auth.registerTitle")}</Text>
          <Text style={[styles.subtitle, { color: colors.inkMuted }]}>
            {t("auth.registerSubtitle")}
          </Text>

          <View style={[styles.roleTabs, { backgroundColor: colors.cardAlt }]}>
            {([
              { key: "passenger", label: t("auth.rolePassenger"), icon: "person-outline" },
              { key: "driver", label: t("auth.roleDriver"), icon: "car-outline" },
            ] as const).map((r) => {
              const sel = role === r.key;
              return (
                <Pressable
                  key={r.key}
                  onPress={() => setRole(r.key)}
                  style={[styles.roleTab, sel && { backgroundColor: colors.card }]}
                >
                  <Ionicons name={r.icon} size={16} color={sel ? colors.ink : colors.inkMuted} />
                  <Text style={[styles.roleTxt, { color: sel ? colors.ink : colors.inkMuted }]}>
                    {r.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={{ gap: 14, marginTop: 16 }}>
            <Field
              label={t("auth.phone")}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder={t("auth.phonePlaceholder")}
              leftIcon={<Ionicons name="call-outline" size={18} color={colors.inkMuted} />}
            />
            <Field
              label={t("auth.password")}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder={t("auth.passwordMinLength")}
              leftIcon={<Ionicons name="lock-closed-outline" size={18} color={colors.inkMuted} />}
            />
            <Field
              label={t("auth.confirmPassword")}
              value={password2}
              onChangeText={setPassword2}
              secureTextEntry
              placeholder="••••••"
              leftIcon={<Ionicons name="lock-closed-outline" size={18} color={colors.inkMuted} />}
            />

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: colors.redBg }]}>
                <Text style={{ color: colors.red, fontSize: 13, fontWeight: "600" }}>{error}</Text>
              </View>
            ) : null}

            <Button title={t("common.continue")} onPress={submit} loading={loading} />
          </View>

          <View style={styles.footer}>
            <Text style={{ color: colors.inkMuted, fontSize: 14 }}>{t("auth.haveAccount")} </Text>
            <Link href="/(auth)/login" asChild>
              <Pressable>
                <Text style={{ color: colors.brandDark, fontWeight: "800", fontSize: 14 }}>
                  {t("auth.loginBtn")}
                </Text>
              </Pressable>
            </Link>
          </View>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { paddingHorizontal: 20 },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  title: { fontSize: 22, fontWeight: "900" },
  subtitle: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  roleTabs: {
    flexDirection: "row",
    padding: 4,
    borderRadius: radius.md,
    marginTop: 18,
    gap: 4,
  },
  roleTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.sm,
  },
  roleTxt: { fontSize: 14, fontWeight: "800" },
  errorBox: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 20 },
});
