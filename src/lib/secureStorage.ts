import AsyncStorage from "@react-native-async-storage/async-storage";

const ACCESS_TOKEN_KEY = "jobnova_access_token";

export async function saveAccessToken(token: string): Promise<void> {
  await AsyncStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export async function getAccessToken(): Promise<string | null> {
  return await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
}

export async function clearAccessToken(): Promise<void> {
  await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
}