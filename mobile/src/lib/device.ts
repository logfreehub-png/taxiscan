import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const DEVICE_ID_KEY = "tn_device_id";
let cached: { id: string; name: string } | null = null;

function randomId() {
  return "d-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 12);
}

/** Qurilmaning barqaror ID'si va nomi (bitta akkaunt — bitta qurilma qoidasi uchun). */
export async function getDeviceInfo(): Promise<{ id: string; name: string }> {
  if (cached) return cached;
  let id = await AsyncStorage.getItem(DEVICE_ID_KEY).catch(() => null);
  if (!id) {
    id = randomId();
    await AsyncStorage.setItem(DEVICE_ID_KEY, id).catch(() => {});
  }
  let name = Platform.OS === "ios" ? "iPhone" : Platform.OS === "android" ? "Android telefon" : "Brauzer";
  try {
    const Device = await import("expo-device");
    const model = [Device.manufacturer, Device.modelName].filter(Boolean).join(" ");
    if (Device.deviceName || model) name = Device.deviceName || model;
  } catch {
    /* expo-device bo'lmasa — umumiy nom */
  }
  cached = { id, name };
  return cached;
}
