import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, Pressable } from "react-native";
import { useRouter, Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/store/auth";
import { useTheme } from "@/theme";
import { useI18n } from "@/i18n";
import { Logo } from "@/components/ui/Header";
import { Field } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LanguageSelectModal, LanguageSwitchPill } from "@/components/LanguageSelectModal";

export default function LoginScreen() {
  const router = useRouter();
  const login = useAuth((s) => s.login);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { t, hasChosenLang } = useI18n();

  const [phone, setPhone] = useState("+998");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [langModalOpen, setLangModalOpen] = useState(false);

  // Birinchi marta kirganda foydalanuvchidan qaysi tilda bo'lishini so'raymiz
  useEffect(() => {
    if (!hasChosenLang) {
      const timer = setTimeout(() => {
        setLangModalOpen(true);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [hasChosenLang]);

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const user = await login(phone.trim(), password);
      const dest =
        user.role === "driver"
          ? "/(tabs)"
          : !user.profile_completed
          ? "/(tabs)"
          : "/(tabs)";
      router.replace(dest);
    } catch (err: any) {
      setError(err?.data?.detail || t("auth.invalidCredentials"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.flex, { backgroundColor: colors.bg }]}
    >
      <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
        {/* Tepada tezkor til tanlash (UZ | RU | EN) */}
        <View style={styles.topLangBar}>
          <Pressable
            onPress={() => setLangModalOpen(true)}
            style={[styles.langPromptBtn, { backgroundColor: colors.cardAlt, borderColor: colors.line }]}
          >
            <Ionicons name="globe-outline" size={16} color={colors.ink} />
            <Text style={[styles.langPromptTxt, { color: colors.ink }]}>{t("lang.title")}</Text>
          </Pressable>
          <LanguageSwitchPill />
        </View>

        <View style={styles.logoWrap}>
          <Logo size={42} />
          <Text style={[styles.tagline, { color: colors.inkMuted }]}>
            {t("nav.tagline")}
          </Text>
        </View>

        <Card padded>
          <Text style={[styles.title, { color: colors.ink }]}>{t("auth.loginTitle")}</Text>
          <Text style={[styles.subtitle, { color: colors.inkMuted }]}>
            {t("auth.loginSubtitle")}
          </Text>

          <View style={{ gap: 14, marginTop: 18 }}>
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
              placeholder={t("auth.passwordPlaceholder")}
              leftIcon={<Ionicons name="lock-closed-outline" size={18} color={colors.inkMuted} />}
            />

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: colors.redBg }]}>
                <Text style={{ color: colors.red, fontSize: 13, fontWeight: "600" }}>{error}</Text>
              </View>
            ) : null}

            <Button title={t("auth.loginBtn")} onPress={submit} loading={loading} />
          </View>

          <View style={styles.footer}>
            <Text style={{ color: colors.inkMuted, fontSize: 14 }}>{t("auth.noAccount")} </Text>
            <Link href="/(auth)/register" asChild>
              <Pressable>
                <Text style={{ color: colors.brandDark, fontWeight: "800", fontSize: 14 }}>
                  {t("auth.registerBtn")}
                </Text>
              </Pressable>
            </Link>
          </View>
        </Card>
      </View>

      <LanguageSelectModal
        visible={langModalOpen}
        onClose={() => setLangModalOpen(false)}
        title={t("lang.title")}
        subtitle={t("lang.selectPrompt")}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 20, justifyContent: "flex-start" },
  topLangBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  langPromptBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  langPromptTxt: {
    fontSize: 12,
    fontWeight: "700",
  },
  logoWrap: { alignItems: "center", marginBottom: 24 },
  tagline: { fontSize: 13, marginTop: 10, textAlign: "center", maxWidth: 280, lineHeight: 18 },
  title: { fontSize: 22, fontWeight: "900" },
  subtitle: { fontSize: 13, marginTop: 4 },
  errorBox: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 20 },
  demo: { marginTop: 16, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
});
