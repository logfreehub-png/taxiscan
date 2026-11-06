import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNotifications } from "@/lib/notifications";

/**
 * Xarita ustidagi xabarlar tugmasi — hamburger tugmasining tagida turadi.
 * Bosilganda xabarlar (SMS / bildirishnomalar) ro'yxati ochiladi.
 */
export function MapNotifButton({
  backgroundColor,
  borderColor,
  iconColor,
}: {
  backgroundColor: string;
  borderColor: string;
  iconColor: string;
}) {
  const { unread, openList } = useNotifications();

  return (
    <Pressable
      onPress={openList}
      hitSlop={10}
      style={[styles.btn, { backgroundColor, borderColor }]}
      accessibilityLabel="Xabarlar"
    >
      <Ionicons name={unread > 0 ? "notifications" : "notifications-outline"} size={22} color={iconColor} />
      {unread > 0 ? (
        <View style={[styles.badge, { borderColor: backgroundColor }]}>
          <Text style={styles.badgeTxt}>{unread > 9 ? "9+" : unread}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  badge: {
    position: "absolute",
    top: -6,
    right: -6,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 4,
    backgroundColor: "#DC2626",
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeTxt: { color: "#fff", fontSize: 10, fontWeight: "900" },
});
