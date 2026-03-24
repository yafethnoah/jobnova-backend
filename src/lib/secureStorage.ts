import * as SecureStore from "expo-secure-store";

const ACCESS_TOKEN_KEY = "jobnova_access_token";
const LEGACY_ACCESS_TOKEN_KEY = "jobnova_access_token";

export async function saveAccessToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
  await SecureStore.deleteItemAsync(LEGACY_ACCESS_TOKEN_KEY).catch(() => undefined);
}

export async function getAccessToken(): Promise<string | null> {
  const current = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  if (current) return current;
  const legacy = await SecureStore.getItemAsync(LEGACY_ACCESS_TOKEN_KEY);
  if (legacy) {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, legacy).catch(() => undefined);
    await SecureStore.deleteItemAsync(LEGACY_ACCESS_TOKEN_KEY).catch(() => undefined);
    return legacy;
  }
  return null;
}

export async function clearAccessToken(): Promise<void> {
  await Promise.allSettled([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(LEGACY_ACCESS_TOKEN_KEY)
  ]);
}
