import React from "react";
import { View, Text, StyleSheet, Pressable, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, radius } from "@/theme";

/**
 * Obuna taklifi (paywall) — qulflangan funksiyaga tegilganda chiqadi.
 * "Obuna olish" tugmasi Obuna (billing) sahifasiga olib boradi.
 */
export function PaywallSheet({
  visible,
  onClose,
  title = "Obuna kerak",
  message,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
}) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const benefits = [
    "Kuniga cheksiz narx qidirish",
    "Barcha tariflar: Comfort, Comfort+, Biznes",
    "Bir nechta manzil (A, B, C, D...)",
    "Bir nechta yo'l narxini solishtirish",
    "Kunduzgi va tungi rejim",
  ];

  const goSubscribe = () => {
    onClose();
    router.push("/(tabs)/billing" as any);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.grip} />

          <View style={[styles.iconWrap, { backgroundColor: isDark ? "#1A1F26" : "#FFF8E1", borderColor: "#FFCC00" }]}>
            <Ionicons name="diamond" size={30} color="#FFCC00" />
          </View>

          <Text style={[styles.title, { color: colors.ink }]}>{title}</Text>
          {message ? (
            <Text style={[styles.msg, { color: colors.inkMuted }]}>{message}</Text>
          ) : null}

          <View style={styles.benefits}>
            {benefits.map((b) => (
              <View key={b} style={styles.benefitRow}>
                <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                <Text style={[styles.benefitTxt, { color: colors.ink }]}>{b}</Text>
              </View>
            ))}
          </View>

          <Pressable style={styles.subBtn} onPress={goSubscribe}>
            <Ionicons name="diamond-outline" size={18} color="#0F1216" />
            <Text style={styles.subBtnTxt}>Obuna olish</Text>
          </Pressable>

          <Pressable style={styles.laterBtn} onPress={onClose} hitSlop={8}>
            <Text style={[styles.laterTxt, { color: colors.inkMuted }]}>Keyinroq</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 22,
    paddingTop: 12,
    alignItems: "center",
  },
  grip: { width: 44, height: 5, borderRadius: 3, backgroundColor: "rgba(150,150,150,0.4)", marginBottom: 18 },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  title: { fontSize: 21, fontWeight: "900", marginTop: 14, textAlign: "center" },
  msg: { fontSize: 14, marginTop: 8, textAlign: "center", lineHeight: 20 },
  benefits: { alignSelf: "stretch", gap: 12, marginTop: 20, marginBottom: 8 },
  benefitRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  benefitTxt: { fontSize: 14, fontWeight: "600", flex: 1 },
  subBtn: {
    alignSelf: "stretch",
    height: 54,
    borderRadius: 18,
    backgroundColor: "#FFCC00",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 18,
  },
  subBtnTxt: { fontSize: 17, fontWeight: "900", color: "#0F1216" },
  laterBtn: { paddingVertical: 14 },
  laterTxt: { fontSize: 14, fontWeight: "700" },
});
