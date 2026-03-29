import AsyncStorage from "@react-native-async-storage/async-storage";

function ensureKey(key: string | null | undefined): string | null {
  if (typeof key !== "string") return null;
  const safeKey = key.trim();
  return safeKey.length ? safeKey : null;
}

export async function saveJson<T>(key: string, value: T): Promise<void> {
  const safeKey = ensureKey(key);
  if (!safeKey) return;
  await AsyncStorage.setItem(safeKey, JSON.stringify(value));
}

export async function getJson<T>(key: string): Promise<T | null> {
  const safeKey = ensureKey(key);
  if (!safeKey) return null;
  const raw = await AsyncStorage.getItem(safeKey);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function removeJson(key: string): Promise<void> {
  const safeKey = ensureKey(key);
  if (!safeKey) return;
  await AsyncStorage.removeItem(safeKey);
}
