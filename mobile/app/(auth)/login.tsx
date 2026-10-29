import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { useRouter, Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/store/auth";
import { useTheme } from "@/theme";
import { useI18n } from "@/i18n";
import { Logo } from "@/components/ui/Header";
import { Field, PhoneField } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LanguageSelectModal } from "@/components/LanguageSelectModal";

export default function LoginScreen() {
  const router = useRouter();
  const login = useAuth((s) => s.login);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();

  const [phone, setPhone] = useState("+998");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [langModalOpen, setLangModalOpen] = useState(false);

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
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      style={[styles.flex, { backgroundColor: colors.bg }]}
    >
      {/* Tepada til tanlash (ekranning eng yuqori qismida) */}
      <View style={[styles.topLangBar, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => setLangModalOpen(true)}
          style={[styles.langPromptBtn, { backgroundColor: colors.cardAlt, borderColor: colors.line }]}
        >
          <Ionicons name="globe-outline" size={16} color={colors.ink} />
          <Text style={[styles.langPromptTxt, { color: colors.ink }]}>{t("lang.title")}</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
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
              <PhoneField
                label={t("auth.phone")}
                value={phone}
                onChangePhone={(fullPhone) => setPhone(fullPhone)}
              />
              <Field
                label={t("auth.password")}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder={t("auth.passwordPlaceholder")}
                leftIcon={<Ionicons name="lock-closed-outline" size={18} color={colors.inkMuted} />}
              />

              <View style={styles.forgotWrap}>
                <Link href="/(auth)/forgot-password" asChild>
                  <Pressable hitSlop={8}>
                    <Text style={[styles.forgotTxt, { color: colors.brandDark || "#D97706" }]}>
                      {t("auth.forgotPassword")}
                    </Text>
                  </Pressable>
                </Link>
              </View>

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
        </ScrollView>

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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  topLangBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 4,
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
  forgotWrap: { alignItems: "flex-end", marginTop: -4 },
  forgotTxt: { fontSize: 13, fontWeight: "700" },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 20 },
  demo: { marginTop: 16, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
});
