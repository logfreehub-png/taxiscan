import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { create } from "zustand";
import { useTheme, radius } from "@/theme";
import { useAuth } from "@/store/auth";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Input";
import { apiPatch, apiUpload } from "@/lib/api/client";

/** "Keyinroq" bosilgandan keyin eslatma qayta chiqish oralig'i */
const REMIND_AFTER_MS = 10 * 60 * 1000;

interface PromptState {
  formOpen: boolean;
  openForm: () => void;
  closeForm: () => void;
}
/** Formani boshqa joydan (masalan menyudan) ochish uchun */
export const useProfilePrompt = create<PromptState>((set) => ({
  formOpen: false,
  openForm: () => set({ formOpen: true }),
  closeForm: () => set({ formOpen: false }),
}));

/** "DDMMYYYY" raqamlarini "DD.MM.YYYY" ko'rinishiga keltiradi */
function maskDate(raw: string) {
  const d = raw.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}.${d.slice(2)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 4)}.${d.slice(4)}`;
}

function parseDate(masked: string): string | null {
  const m = masked.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  if (date.getDate() !== Number(dd) || date.getMonth() !== Number(mm) - 1) return null;
  const age = new Date().getFullYear() - Number(yyyy);
  if (age < 14 || age > 100) return null;
  return `${yyyy}-${mm}-${dd}`;
}

function fromIso(iso?: string | null) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}.${m}.${y}` : "";
}

/**
 * Profil to'ldirilmagan bo'lsa (bepul ham, obunali ham) — kirishda
 * "Ma'lumotlaringizni to'ldiring" oynasi chiqadi. "Keyinroq" bosilsa,
 * biroz vaqtdan keyin yana eslatadi. Rasmdan boshqa hamma maydon majburiy.
 */
export function ProfileCompletePrompt() {
  const { colors } = useTheme();
  const user = useAuth((s) => s.user);
  const { formOpen, openForm, closeForm } = useProfilePrompt();
  const [askOpen, setAskOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const needs = !!user && !user.profile_completed && user.role !== "admin";

  useEffect(() => {
    if (needs) {
      const t = setTimeout(() => setAskOpen(true), 900);
      return () => clearTimeout(t);
    }
    setAskOpen(false);
    if (timer.current) clearTimeout(timer.current);
  }, [needs, user?.id]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const later = () => {
    setAskOpen(false);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (!useAuth.getState().user?.profile_completed) setAskOpen(true);
    }, REMIND_AFTER_MS);
    Alert.alert(
      "Ma'lumotlaringizni to'ldiring",
      "Profilingiz to'liq emas. Istalgan vaqtda menyudagi «Ma'lumotlarni to'ldirish» bo'limidan to'ldirishingiz mumkin."
    );
  };

  if (!needs) return null;

  return (
    <>
      <Modal visible={askOpen && !formOpen} transparent animationType="fade" onRequestClose={later}>
        <View style={styles.backdrop}>
          <View style={[styles.askCard, { backgroundColor: colors.card, borderColor: colors.line }]}>
            <View style={[styles.askIcon, { backgroundColor: colors.brand }]}>
              <Ionicons name="person-add-outline" size={30} color="#0F1216" />
            </View>
            <Text style={[styles.askTitle, { color: colors.ink }]}>Ma'lumotlaringizni to'ldiring</Text>
            <Text style={[styles.askSub, { color: colors.inkMuted }]}>
              Ism, familiya, tug'ilgan sana va jinsingizni kiriting. Bu bir daqiqa vaqt oladi.
            </Text>
            <View style={{ gap: 10, alignSelf: "stretch", marginTop: 6 }}>
              <Button
                title="To'ldirish"
                onPress={() => {
                  setAskOpen(false);
                  openForm();
                }}
              />
              <Button title="Keyinroq" variant="outline" onPress={later} />
            </View>
          </View>
        </View>
      </Modal>

      <ProfileCompleteForm visible={formOpen} onClose={closeForm} onLater={later} />
    </>
  );
}

function ProfileCompleteForm({
  visible,
  onClose,
  onLater,
}: {
  visible: boolean;
  onClose: () => void;
  onLater: () => void;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const user = useAuth((s) => s.user);
  const loadMe = useAuth((s) => s.loadMe);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) {
      setFirstName(user?.first_name || "");
      setLastName(user?.last_name || "");
      setDob(fromIso((user as any)?.date_of_birth));
      setGender(((user as any)?.gender as any) || "");
      setAvatarUri(null);
      setErrors({});
    }
  }, [visible]);

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!res.canceled && res.assets?.[0]?.uri) setAvatarUri(res.assets[0].uri);
  };

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!firstName.trim()) e.first_name = "Ismingizni kiriting";
    if (!lastName.trim()) e.last_name = "Familiyangizni kiriting";
    const iso = parseDate(dob);
    if (!iso) e.date_of_birth = "Sanani KK.OO.YYYY ko'rinishida to'g'ri kiriting";
    if (!gender) e.gender = "Jinsingizni tanlang";
    setErrors(e);
    if (Object.keys(e).length) return;

    setBusy(true);
    try {
      if (avatarUri) {
        const form = new FormData();
        form.append("first_name", firstName.trim());
        form.append("last_name", lastName.trim());
        form.append("date_of_birth", iso!);
        form.append("gender", gender);
        const name = avatarUri.split("/").pop() || "avatar.jpg";
        const ext = (name.split(".").pop() || "jpg").toLowerCase();
        form.append("avatar", { uri: avatarUri, name, type: `image/${ext === "jpg" ? "jpeg" : ext}` } as any);
        await apiUpload("/auth/profile/complete/", form, "PATCH");
      } else {
        await apiPatch("/auth/profile/complete/", {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          date_of_birth: iso,
          gender,
        });
      }
      await loadMe().catch(() => {});
      onClose();
      Alert.alert("Rahmat!", "Ma'lumotlaringiz saqlandi.");
    } catch (err: any) {
      const d = err?.data || {};
      const next: Record<string, string> = {};
      for (const k of ["first_name", "last_name", "date_of_birth", "gender", "avatar"]) {
        if (d[k]) next[k] = Array.isArray(d[k]) ? d[k][0] : String(d[k]);
      }
      if (!Object.keys(next).length) next.general = d.detail || "Saqlab bo'lmadi. Qayta urinib ko'ring.";
      setErrors(next);
    } finally {
      setBusy(false);
    }
  };

  const err = (k: string) =>
    errors[k] ? <Text style={[styles.errTxt, { color: colors.red }]}>{errors[k]}</Text> : null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, backgroundColor: colors.bg }}
      >
        <View style={[styles.head, { paddingTop: insets.top + 10, borderBottomColor: colors.line }]}>
          <Text style={[styles.headTitle, { color: colors.ink }]}>Ma'lumotlaringizni to'ldiring</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={26} color={colors.ink} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: insets.bottom + 30 }}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable onPress={pickImage} style={styles.avatarWrap}>
            {avatarUri || user?.avatar_url ? (
              <Image source={{ uri: avatarUri || user?.avatar_url || undefined }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: colors.cardAlt, alignItems: "center", justifyContent: "center" }]}>
                <Ionicons name="camera-outline" size={28} color={colors.inkMuted} />
              </View>
            )}
            <Text style={{ color: colors.brandDark, fontWeight: "800", fontSize: 13, marginTop: 8 }}>
              Rasm qo'shish (ixtiyoriy)
            </Text>
          </Pressable>

          <View>
            <Field label="Ism *" value={firstName} onChangeText={setFirstName} placeholder="Masalan: Aziz" />
            {err("first_name")}
          </View>
          <View>
            <Field label="Familiya *" value={lastName} onChangeText={setLastName} placeholder="Masalan: Karimov" />
            {err("last_name")}
          </View>
          <View>
            <Field
              label="Tug'ilgan sana *"
              value={dob}
              onChangeText={(v) => setDob(maskDate(v))}
              keyboardType="number-pad"
              placeholder="KK.OO.YYYY"
              maxLength={10}
              leftIcon={<Ionicons name="calendar-outline" size={18} color={colors.inkMuted} />}
            />
            {err("date_of_birth")}
          </View>

          <View>
            <Text style={[styles.label, { color: colors.inkMuted }]}>Jinsi *</Text>
            <View style={styles.genderRow}>
              {([
                { key: "male", label: "Erkak", icon: "male" },
                { key: "female", label: "Ayol", icon: "female" },
              ] as const).map((g) => {
                const sel = gender === g.key;
                return (
                  <Pressable
                    key={g.key}
                    onPress={() => setGender(g.key)}
                    style={[
                      styles.genderBtn,
                      {
                        backgroundColor: sel ? colors.brand : colors.cardAlt,
                        borderColor: sel ? colors.brand : colors.line,
                      },
                    ]}
                  >
                    <Ionicons name={g.icon} size={18} color={sel ? "#0F1216" : colors.inkMuted} />
                    <Text style={{ fontWeight: "800", color: sel ? "#0F1216" : colors.ink }}>{g.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            {err("gender")}
          </View>

          {errors.general || errors.avatar ? (
            <View style={[styles.generalErr, { backgroundColor: colors.redBg }]}>
              <Text style={{ color: colors.red, fontWeight: "600" }}>{errors.general || errors.avatar}</Text>
            </View>
          ) : null}

          <Button title="Saqlash" onPress={submit} loading={busy} />
          <Button
            title="Keyinroq"
            variant="ghost"
            onPress={() => {
              onClose();
              onLater();
            }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", padding: 20 },
  askCard: { borderRadius: radius.lg, borderWidth: 1, padding: 22, alignItems: "center", gap: 10 },
  askIcon: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  askTitle: { fontSize: 20, fontWeight: "900", textAlign: "center" },
  askSub: { fontSize: 14, lineHeight: 20, textAlign: "center" },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headTitle: { fontSize: 18, fontWeight: "900" },
  avatarWrap: { alignItems: "center", marginBottom: 4 },
  avatar: { width: 88, height: 88, borderRadius: 44 },
  label: { fontSize: 12, fontWeight: "700", marginBottom: 6, marginLeft: 2 },
  genderRow: { flexDirection: "row", gap: 10 },
  genderBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 50,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  errTxt: { fontSize: 12, fontWeight: "600", marginTop: 4, marginLeft: 2 },
  generalErr: { borderRadius: 12, padding: 12 },
});
