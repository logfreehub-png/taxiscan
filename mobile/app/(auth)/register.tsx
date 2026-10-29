import React, { useState } from "react";
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
import { useTheme, radius } from "@/theme";
import { useI18n } from "@/i18n";
import { Logo } from "@/components/ui/Header";
import { Field, PhoneField } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LanguageSelectModal } from "@/components/LanguageSelectModal";
import { PhoneVerificationModal } from "@/components/PhoneVerificationModal";
import { apiPost } from "@/lib/api/client";

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
  const [langModalOpen, setLangModalOpen] = useState(false);

  // Telegram bot orqali tasdiqlash holati
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [verifySession, setVerifySession] = useState<{
    sessionId: string;
    botUrl: string;
    botUsername: string;
    phone: string;
  } | null>(null);

  const submit = async () => {
    if (password !== password2) {
      setError(t("auth.passwordsDoNotMatch"));
      return;
    }
    if (password.length < 6) {
      setError(t("auth.passwordMinLength"));
      return;
    }

    const cleanPhone = phone.trim();
    if (!cleanPhone || cleanPhone.replace(/\D/g, "").length < 9) {
      setError("Telefon raqam noto'g'ri kiritildi");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Telegram bot tasdiqlash sessiyasini boshlash
      const res = await apiPost<{
        session_id: string;
        bot_url: string;
        bot_username: string;
      }>(
        "/auth/phone/send-code/",
        { phone: cleanPhone, purpose: "register" },
        { auth: false }
      );

      setVerifySession({
        sessionId: res.session_id,
        botUrl: res.bot_url,
        botUsername: res.bot_username || "TaxiScan_auth_bot",
        phone: cleanPhone,
      });
      setVerifyModalOpen(true);
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

  const handleCompleteRegister = async (sessionId: string) => {
    setVerifyModalOpen(false);
    setLoading(true);
    try {
      await register({
        phone: phone.trim(),
        password,
        password2,
        role,
        first_name: "",
        last_name: "",
        city: "Tashkent",
        session_id: sessionId,
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

  const handleResendCode = async () => {
    const cleanPhone = phone.trim();
    const res = await apiPost<{
      session_id: string;
      bot_url: string;
      bot_username: string;
    }>(
      "/auth/phone/send-code/",
      { phone: cleanPhone, purpose: "register" },
      { auth: false }
    );

    setVerifySession({
      sessionId: res.session_id,
      botUrl: res.bot_url,
      botUsername: res.bot_username || "TaxiScan_auth_bot",
      phone: cleanPhone,
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      style={[styles.flex, { backgroundColor: colors.bg }]}
    >
      {/* Tepada til tanlash (ekranning eng yuqori qismida, login bilan bir xil) */}
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
                placeholder="••••••"
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

      <LanguageSelectModal
        visible={langModalOpen}
        onClose={() => setLangModalOpen(false)}
        title={t("lang.title")}
        subtitle={t("lang.selectPrompt")}
      />

      {verifySession ? (
        <PhoneVerificationModal
          visible={verifyModalOpen}
          phone={verifySession.phone}
          sessionId={verifySession.sessionId}
          botUrl={verifySession.botUrl}
          botUsername={verifySession.botUsername}
          onClose={() => setVerifyModalOpen(false)}
          onVerified={handleCompleteRegister}
          onResend={handleResendCode}
        />
      ) : null}
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
  logoWrap: { alignItems: "center", marginBottom: 20 },
  tagline: { fontSize: 13, marginTop: 8, textAlign: "center", maxWidth: 280, lineHeight: 18 },
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
