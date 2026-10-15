import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme";
import { useNotifications } from "@/lib/notifications";

/** Qo'ng'iroq tugmasi — bosilganda bildirishnomalar ro'yxati ochiladi. */
export function NotificationBell({ color }: { color?: string }) {
  const { colors } = useTheme();
  const { unread, openList } = useNotifications();

  return (
    <Pressable onPress={openList} hitSlop={8} style={styles.bellBtn}>
      <Ionicons name="notifications-outline" size={22} color={color || colors.ink} />
      {unread > 0 ? (
        <View style={[styles.badge, { backgroundColor: colors.red }]}>
          <Text style={styles.badgeTxt}>{unread > 9 ? "9+" : unread}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bellBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  badge: {
    position: "absolute", top: 4, right: 4, minWidth: 16, height: 16, borderRadius: 8,
    paddingHorizontal: 3, alignItems: "center", justifyContent: "center",
  },
  badgeTxt: { color: "#fff", fontSize: 9, fontWeight: "900" },
});
