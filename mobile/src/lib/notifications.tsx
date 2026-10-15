import React, {
  createContext, useContext, useEffect, useRef, useState, useCallback,
} from "react";
import {
  View, Text, StyleSheet, Pressable, Modal, FlatList, Animated, ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, radius } from "@/theme";
import { apiGet, apiPost, getAccessToken } from "@/lib/api/client";
import { API_BASE } from "@/lib/api/config";
import { useAuth } from "@/store/auth";

export interface Notif {
  id: number;
  kind: string;
  title: string;
  preview?: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

const KIND_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  news: "megaphone-outline",
  reminder: "alarm-outline",
  promo: "gift-outline",
  admin: "megaphone-outline",
  info: "information-circle-outline",
};

const POLL_MS = 25_000;

interface Ctx {
  unread: number;
  openList: () => void;
}
const NotifCtx = createContext<Ctx>({ unread: 0, openList: () => {} });
export const useNotifications = () => useContext(NotifCtx);

function fmt(d: string) {
  return new Date(d).toLocaleString("uz-UZ", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const userId = useAuth((s) => s.user?.id);
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const [listOpen, setListOpen] = useState(false);
  const [detail, setDetail] = useState<Notif | null>(null);
  const [banner, setBanner] = useState<Notif | null>(null);
  const seenTop = useRef<number | null>(null);
  const slide = useRef(new Animated.Value(-140)).current;
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    try {
      const raw = await apiGet<any>("/auth/notifications/");
      const list: Notif[] = Array.isArray(raw) ? raw : raw?.results ?? [];
      setItems(list);
      setUnread(list.filter((n) => !n.is_read).length);
      if (list.length) seenTop.current = list[0].id;
    } catch { /* ignore */ }
  }, []);

  const showBanner = useCallback((n: Notif) => {
    setBanner(n);
    slide.setValue(-140);
    Animated.spring(slide, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    bannerTimer.current = setTimeout(() => {
      Animated.timing(slide, { toValue: -140, duration: 250, useNativeDriver: true }).start(() => setBanner(null));
    }, 5000);
  }, [slide]);

  const hideBanner = () => {
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    Animated.timing(slide, { toValue: -140, duration: 200, useNativeDriver: true }).start(() => setBanner(null));
  };

  useEffect(() => {
    if (!userId) {
      // Chiqilgan — ro'yxatni tozalaymiz
      setItems([]);
      setUnread(0);
      return;
    }
    load();
    const t = setInterval(load, POLL_MS);

    let ws: WebSocket | null = null;
    let closedByUs = false;
    let retry: ReturnType<typeof setTimeout> | null = null;
    const connect = async () => {
      const token = await getAccessToken();
      if (!token) return;
      const url = `${API_BASE.replace(/^http/, "ws")}/ws/notifications/?token=${encodeURIComponent(token)}`;
      try {
        ws = new WebSocket(url);
        ws.onmessage = (e: any) => {
          try {
            const n: Notif = JSON.parse(e.data);
            setItems((prev) => [n, ...prev.filter((x) => x.id !== n.id)]);
            setUnread((u) => u + 1);
            showBanner(n);
          } catch { /* ignore */ }
        };
        ws.onclose = () => { if (!closedByUs) retry = setTimeout(connect, 4000); };
        ws.onerror = () => { try { ws?.close(); } catch { /* ignore */ } };
      } catch { /* ignore */ }
    };
    connect();

    return () => {
      clearInterval(t);
      closedByUs = true;
      if (retry) clearTimeout(retry);
      if (bannerTimer.current) clearTimeout(bannerTimer.current);
      try { ws?.close(); } catch { /* ignore */ }
    };
  }, [userId, load, showBanner]);

  const markAll = async () => {
    try {
      await apiPost("/auth/notifications/mark-read/", {});
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnread(0);
    } catch { /* ignore */ }
  };

  const openList = useCallback(() => {
    setListOpen(true);
    setUnread((u) => { if (u > 0) markAll(); return u; });
  }, []);

  const openDetail = (n: Notif) => {
    setDetail(n);
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
  };

  const DetailIcon = detail ? (KIND_ICON[detail.kind] || "information-circle-outline") : "information-circle-outline";

  return (
    <NotifCtx.Provider value={{ unread, openList }}>
      {children}

      {/* BANNER — ilova ildizida, hamma narsadan tepada, navbar ustida emas, touch bloklamaydi */}
      <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
        {banner ? (
          <Animated.View
            style={[styles.banner, { top: insets.top + 8, backgroundColor: colors.card, transform: [{ translateY: slide }] }]}
          >
            <View style={[styles.bannerAccent, { backgroundColor: colors.brand }]} />
            <Pressable
              onPress={() => { const n = banner; hideBanner(); if (n) openDetail(n); }}
              style={styles.bannerInner}
            >
              <View style={[styles.bannerIcon, { backgroundColor: colors.brand }]}>
                <Ionicons name={KIND_ICON[banner.kind] || "notifications"} size={18} color="#0F1216" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.brandDark, fontSize: 9, fontWeight: "900", letterSpacing: 0.5 }}>
                  YANGI BILDIRISHNOMA
                </Text>
                <Text style={{ color: colors.ink, fontWeight: "900", fontSize: 14, marginTop: 1 }} numberOfLines={1}>
                  {banner.title}
                </Text>
                {(banner.preview || banner.body) ? (
                  <Text style={{ color: colors.inkMuted, fontSize: 12, marginTop: 1 }} numberOfLines={2}>
                    {banner.preview || banner.body}
                  </Text>
                ) : null}
              </View>
              <Pressable onPress={hideBanner} hitSlop={8}>
                <Ionicons name="close" size={18} color={colors.inkMuted} />
              </Pressable>
            </Pressable>
          </Animated.View>
        ) : null}
      </View>

      {/* RO'YXAT */}
      <Modal visible={listOpen} animationType="slide" transparent onRequestClose={() => setListOpen(false)}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.bg, paddingBottom: insets.bottom + 16, maxHeight: "82%" }]}>
            <View style={styles.sheetHead}>
              <Text style={{ color: colors.ink, fontSize: 18, fontWeight: "900" }}>Bildirishnomalar</Text>
              <Pressable onPress={() => setListOpen(false)} hitSlop={10}>
                <Ionicons name="close" size={26} color={colors.ink} />
              </Pressable>
            </View>
            {items.length === 0 ? (
              <Text style={{ color: colors.inkMuted, fontSize: 14, textAlign: "center", paddingVertical: 30 }}>
                Bildirishnoma yo'q
              </Text>
            ) : (
              <FlatList
                data={items}
                keyExtractor={(n) => String(n.id)}
                contentContainerStyle={{ paddingBottom: 10 }}
                renderItem={({ item }) => {
                  const mini = item.preview || item.body;
                  return (
                    <Pressable onPress={() => openDetail(item)} style={[styles.row, { borderBottomColor: colors.line }]}>
                      {!item.is_read ? <View style={[styles.dot, { backgroundColor: colors.brand }]} /> : <View style={styles.dot} />}
                      <Ionicons name={KIND_ICON[item.kind] || "information-circle-outline"} size={18} color={colors.brandDark} style={{ marginTop: 2 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.ink, fontSize: 14, fontWeight: "800" }} numberOfLines={1}>{item.title}</Text>
                        {mini ? (
                          <Text style={{ color: colors.inkMuted, fontSize: 12, marginTop: 2 }} numberOfLines={1}>{mini}</Text>
                        ) : null}
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                          <Text style={{ color: colors.inkMuted, fontSize: 10 }}>{fmt(item.created_at)}</Text>
                          {item.body ? (
                            <Text style={{ color: colors.brandDark, fontSize: 10, fontWeight: "800" }}>· batafsil</Text>
                          ) : null}
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={colors.inkMuted} style={{ alignSelf: "center" }} />
                    </Pressable>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* BATAFSIL — alohida oyna */}
      <Modal visible={!!detail} animationType="slide" onRequestClose={() => setDetail(null)}>
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
          <View style={[styles.detailHead, { paddingTop: insets.top + 8, borderBottomColor: colors.line, backgroundColor: colors.card }]}>
            <Pressable onPress={() => setDetail(null)} hitSlop={10} style={{ width: 32 }}>
              <Ionicons name="arrow-back" size={24} color={colors.ink} />
            </Pressable>
            <Text style={{ color: colors.ink, fontSize: 16, fontWeight: "800", flex: 1, textAlign: "center" }}>Bildirishnoma</Text>
            <View style={{ width: 32 }} />
          </View>
          {detail ? (
            <ScrollView contentContainerStyle={{ padding: 20 }}>
              <View style={[styles.detailIcon, { backgroundColor: colors.brand }]}>
                <Ionicons name={DetailIcon} size={26} color="#0F1216" />
              </View>
              <Text style={{ color: colors.ink, fontSize: 22, fontWeight: "900", marginTop: 16 }}>{detail.title}</Text>
              <Text style={{ color: colors.inkMuted, fontSize: 12, marginTop: 6 }}>{fmt(detail.created_at)}</Text>
              {detail.preview ? (
                <Text style={{ color: colors.ink, fontSize: 15, fontWeight: "700", marginTop: 16 }}>{detail.preview}</Text>
              ) : null}
              {detail.body ? (
                <Text style={{ color: colors.inkSoft, fontSize: 15, lineHeight: 23, marginTop: 12 }}>{detail.body}</Text>
              ) : null}
            </ScrollView>
          ) : null}
        </View>
      </Modal>
    </NotifCtx.Provider>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute", left: 12, right: 12, flexDirection: "row", alignItems: "stretch",
    borderRadius: radius.lg, overflow: "hidden", zIndex: 1000,
    elevation: 12, shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 6 },
  },
  bannerAccent: { width: 4 },
  bannerInner: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, padding: 12 },
  bannerIcon: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingHorizontal: 20, paddingTop: 16 },
  sheetHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  row: { flexDirection: "row", gap: 8, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, alignItems: "flex-start" },
  dot: { width: 7, height: 7, borderRadius: 4, marginTop: 7 },
  detailHead: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  detailIcon: { width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center" },
});
