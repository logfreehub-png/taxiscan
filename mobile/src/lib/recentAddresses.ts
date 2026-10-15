import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AddressValue } from "@/components/AddressInput";

const KEY = "recent_addresses_v1";
const MAX = 8;

/** So'nggi tanlangan manzillar — eng yangisi birinchi. */
export async function getRecentAddresses(): Promise<AddressValue[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/** Manzilni ro'yxatga qo'shadi (dublikatni olib tashlab, boshiga qo'yadi). */
export async function addRecentAddress(v: AddressValue): Promise<void> {
  if (!v || !v.label) return;
  try {
    const list = await getRecentAddresses();
    const same = (a: AddressValue) =>
      a.label === v.label &&
      Math.abs(a.lat - v.lat) < 0.0002 &&
      Math.abs(a.lng - v.lng) < 0.0002;
    const next = [v, ...list.filter((a) => !same(a))].slice(0, MAX);
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}
