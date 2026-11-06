import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, Linking, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, radius } from "@/theme";
import { Button } from "@/components/ui/Button";
import { OtpInput } from "@/components/OtpInput";
import { apiGet, apiPost } from "@/lib/api/client";

export interface VerifySession {
  sessionId: string;
  botUrl: string;
  botUsername: string;
  phone: string;
}

interface Props {
  session: VerifySession;
  /** Kod to'g'ri tasdiqlanganda chaqiriladi */
  onVerified: (code: string) => void;
  /** Kodni qayta yuborish (yangi sessiya qaytaradi) */
  onResend: () => Promise<void>;
  /** Telefon raqamni o'zgartirish (1-qadamga qaytish) */
  onChangePhone: () => void;
}

/**
 * Ikki bosqich:
 *  1) "telegram" — botni ochib kontakt ulashish, bot kod yuborguncha kutish
 *  2) "code"     — 6 xonali kodni kataklarga kiritib "Tasdiqlash"
 */
export function PhoneCodeFlow({ session, onVerified, onResend, onChangePhone }: Props) {
  const { colors } = useTheme();
  const [step, setStep] = useState<"telegram" | "code">("telegram");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(60);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Yangi sessiya kelganda (qayta yuborish) holatni yangilaymiz
  useEffect(() => {
    setStep("telegram");
    setCode("");
    setError(null);
    setCountdown(60);
  }, [session.sessionId]);

  // Qayta yuborish taymeri
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // Telegram bot kodni yuborganini kuzatamiz → avtomatik kod oynasiga o'tamiz
  useEffect(() => {
    if (step !== "telegram") return;
    const check = async () => {
      try {
        const res = await apiGet<{ code_sent?: boolean; verified?: boolean }>(
          `/auth/phone/check-status/?session_id=${session.sessionId}`,
          { auth: false }
        );
        if (res?.code_sent || res?.verified) setStep("code");
      } catch {
        /* polling xatolarini e'tiborsiz qoldiramiz */
      }
    };
    pollRef.current = setInterval(check, 2000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [step, session.sessionId]);

  const openTelegram = async () => {
    const url = session.botUrl || `https://t.me/${session.botUsername}?start=auth_${session.sessionId}`;
    try {
      await Linking.openURL(url);
    } catch {
      await Linking.openURL(`https://t.me/${session.botUsername}`);
    }
  };

  const verify = async () => {
    if (code.length < 6) {
      setError("6 xonali kodni to'liq kiriting");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiPost<{ verified: boolean }>(
        "/auth/phone/verify-code/",
        { session_id: session.sessionId, code, phone: session.phone },
        { auth: false }
      );
      if (res?.verified) onVerified(code);
    } catch (err: any) {
      setError(err?.data?.detail || "Tasdiqlash kodi noto'g'ri");
      setCode("");
    } finally {
      setSubmitting(false);
    }
  };

  const resend = async () => {
    if (countdown > 0) return;
    setError(null);
    try {
      await onResend();
    } catch {
      setError("Kodni qayta yuborib bo'lmadi");
    }
  };

  const phoneRow = (
    <View style={[styles.phoneRow, { backgroundColor: colors.cardAlt }]}>
      <Ionicons name="call-outline" size={16} color={colors.inkMuted} />
      <Text style={[styles.phoneTxt, { color: colors.ink }]}>{session.phone}</Text>
      <Pressable onPress={onChangePhone} hitSlop={8}>
        <Text style={[styles.link, { color: colors.brandDark }]}>O'zgartirish</Text>
      </Pressable>
    </View>
  );

  if (step === "telegram") {
    return (
      <View style={{ gap: 14, marginTop: 18 }}>
        {phoneRow}
        <View style={[styles.tgCard, { borderColor: "#0088cc55", backgroundColor: "#0088cc12" }]}>
          <View style={styles.tgIcon}>
            <Ionicons name="paper-plane" size={26} color="#0088cc" />
          </View>
          <Text style={[styles.tgTitle, { color: colors.ink }]}>Telegram orqali kod oling</Text>
          <Text style={[styles.tgSub, { color: colors.inkMuted }]}>
            @{session.botUsername} botini oching va «📱 Telefon raqamni ulashish» tugmasini bosing.
            Bot sizga 6 xonali kod yuboradi.
          </Text>
          <Pressable
            onPress={openTelegram}
            style={({ pressed }) => [styles.tgBtn, { opacity: pressed ? 0.85 : 1 }]}
          >
            <Ionicons name="paper-plane-outline" size={18} color="#fff" />
            <Text style={styles.tgBtnTxt}>Telegram botni ochish</Text>
          </Pressable>
          <View style={styles.waitRow}>
            <ActivityIndicator size="small" color="#0088cc" />
            <Text style={[styles.waitTxt, { color: colors.inkMuted }]}>Bot kodni yuborishini kutyapmiz...</Text>
          </View>
        </View>

        <Button title="Kod keldi — kiritish" variant="dark" onPress={() => setStep("code")} />
      </View>
    );
  }

  return (
    <View style={{ gap: 16, marginTop: 18 }}>
      {phoneRow}
      <Text style={[styles.codeHint, { color: colors.inkMuted }]}>
        Telegram botga kelgan 6 xonali kodni kiriting
      </Text>

      <OtpInput
        value={code}
        onChange={(v) => {
          setCode(v);
          if (error) setError(null);
        }}
        error={!!error}
      />

      {error ? (
        <View style={[styles.errorBox, { backgroundColor: colors.redBg }]}>
          <Ionicons name="alert-circle" size={16} color={colors.red} />
          <Text style={{ color: colors.red, fontSize: 13, fontWeight: "600", flex: 1 }}>{error}</Text>
        </View>
      ) : null}

      <Button title="Tasdiqlash" onPress={verify} loading={submitting} disabled={code.length < 6} />

      <View style={styles.footerRow}>
        <Pressable onPress={openTelegram} hitSlop={8}>
          <Text style={[styles.link, { color: "#0088cc" }]}>Telegramni ochish</Text>
        </Pressable>
        {countdown > 0 ? (
          <Text style={{ color: colors.inkMuted, fontSize: 13, fontWeight: "600" }}>
            Qayta yuborish: {countdown}s
          </Text>
        ) : (
          <Pressable onPress={resend} hitSlop={8}>
            <Text style={[styles.link, { color: colors.brandDark }]}>Kodni qayta yuborish</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  phoneTxt: { flex: 1, fontSize: 15, fontWeight: "800" },
  link: { fontSize: 13, fontWeight: "800" },
  tgCard: {
    borderWidth: 1.5,
    borderRadius: radius.md,
    padding: 18,
    alignItems: "center",
    gap: 10,
  },
  tgIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#0088cc22",
    alignItems: "center",
    justifyContent: "center",
  },
  tgTitle: { fontSize: 17, fontWeight: "900", textAlign: "center" },
  tgSub: { fontSize: 13, lineHeight: 19, textAlign: "center" },
  tgBtn: {
    marginTop: 4,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0088cc",
    paddingVertical: 14,
    borderRadius: radius.sm,
  },
  tgBtnTxt: { color: "#fff", fontSize: 15, fontWeight: "800" },
  waitRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  waitTxt: { fontSize: 12, fontWeight: "600" },
  codeHint: { fontSize: 13, textAlign: "center", lineHeight: 18 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  footerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
});
