import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, radius } from "@/theme";
import { Button } from "@/components/ui/Button";
import { MapWebView, type MapWebViewHandle } from "@/components/MapWebView";
import { reverseGeocode, shortenLabel } from "@/lib/api/geocoding";
import type { AddressValue } from "@/components/AddressInput";

export function MapPicker({
  visible,
  title,
  initial,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  title: string;
  initial?: AddressValue | null;
  onConfirm: (v: AddressValue) => void;
  onClose: () => void;
}) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapWebViewHandle>(null);

  // lat/lng 0 bo'lsa (bo'sh manzil) — initial yo'q deb hisoblaymiz (aks holda okean markazda turadi)
  const hasInitial = Boolean(initial && initial.lat !== 0 && initial.lng !== 0);
  const start = hasInitial
    ? { lat: initial!.lat, lng: initial!.lng }
    : { lat: 41.311, lng: 69.279 };

  const [center, setCenter] = useState(start);
  const [label, setLabel] = useState<string>(hasInitial ? initial?.label || "" : "");
  const [geoLoading, setGeoLoading] = useState(false);
  const [locating, setLocating] = useState(false);

  const geoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastReq = useRef(0);

  // Xarita to'xtaganda — markazni reverse-geocode qilamiz (debounce)
  const handleCenter = (lat: number, lng: number) => {
    setCenter({ lat, lng });
    if (geoTimer.current) clearTimeout(geoTimer.current);
    setGeoLoading(true);
    const reqId = ++lastReq.current;
    geoTimer.current = setTimeout(async () => {
      try {
        const geo = await reverseGeocode(lat, lng);
        if (reqId === lastReq.current) {
          setLabel(shortenLabel(geo.label) || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        }
      } catch {
        if (reqId === lastReq.current) setLabel(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      } finally {
        if (reqId === lastReq.current) setGeoLoading(false);
      }
    }, 650);
  };

  // Modal ochilganda joriy joyni so'rab markazlash (faqat initial yo'q bo'lsa)
  useEffect(() => {
    if (visible && !hasInitial) {
      goToCurrentLocation(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const goToCurrentLocation = async (silent = false) => {
    if (!silent) setLocating(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== "granted") return;
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = pos.coords;
      mapRef.current?.recenter(latitude, longitude, 16);
      // recenter -> moveend -> handleCenter avtomatik ishlaydi
    } catch {
      /* ignore */
    } finally {
      setLocating(false);
    }
  };

  const confirm = () => {
    onConfirm({
      label: label || `${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}`,
      lat: center.lat,
      lng: center.lng,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.flex, { backgroundColor: colors.bg }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.card, borderBottomColor: colors.line }]}>
          <Pressable onPress={onClose} hitSlop={10} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.ink} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.ink }]} numberOfLines={1}>
            {title}
          </Text>
          <View style={styles.headerBtn} />
        </View>

        {/* Map */}
        <View style={styles.flex}>
          <MapWebView
            ref={mapRef}
            mode="picker"
            isDark={isDark}
            center={start}
            zoom={hasInitial ? 16 : 14}
            onCenterChange={handleCenter}
            style={styles.flex}
          />

          {/* "Joriy joylashuvim" suzuvchi tugma */}
          <Pressable
            onPress={() => goToCurrentLocation(false)}
            style={[styles.locateFab, { backgroundColor: colors.card, borderColor: colors.line }]}
          >
            {locating ? (
              <ActivityIndicator size="small" color={colors.brandDark} />
            ) : (
              <Ionicons name="locate" size={22} color={colors.brandDark} />
            )}
          </Pressable>

          {/* Markaz ko'rsatkichi izohi */}
          <View pointerEvents="none" style={styles.hintWrap}>
            <View style={[styles.hint, { backgroundColor: colors.ink + "E6" }]}>
              <Text style={styles.hintTxt}>Xaritani suring — nuqta markazda turadi</Text>
            </View>
          </View>
        </View>

        {/* Bottom confirm card */}
        <View style={[styles.bottom, { backgroundColor: colors.card, borderTopColor: colors.line, paddingBottom: insets.bottom + 14 }]}>
          <View style={styles.labelRow}>
            <Ionicons name="location" size={18} color={colors.brandDark} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.labelCaption, { color: colors.inkMuted }]}>Tanlangan manzil</Text>
              {geoLoading ? (
                <Text style={[styles.labelText, { color: colors.inkMuted }]}>Aniqlanmoqda…</Text>
              ) : (
                <Text style={[styles.labelText, { color: colors.ink }]} numberOfLines={2}>
                  {label || "Xaritani harakatlantiring"}
                </Text>
              )}
            </View>
          </View>
          <Button
            title="Tasdiqlash"
            onPress={confirm}
            icon={<Ionicons name="checkmark" size={18} color="#0F1216" />}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  headerBtn: { width: 32, alignItems: "center" },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: "800", textAlign: "center" },
  locateFab: {
    position: "absolute",
    right: 16,
    bottom: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  hintWrap: { position: "absolute", top: 12, left: 0, right: 0, alignItems: "center" },
  hint: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full },
  hintTxt: { color: "#fff", fontSize: 12, fontWeight: "600" },
  bottom: {
    paddingHorizontal: 16,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 14,
  },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  labelCaption: { fontSize: 11, fontWeight: "700" },
  labelText: { fontSize: 15, fontWeight: "700", marginTop: 2 },
});
