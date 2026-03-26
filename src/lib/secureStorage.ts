import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "jobnova_token";

export async function saveToken(token: string) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function getToken() {
  return await AsyncStorage.getItem(TOKEN_KEY);
}

export async function removeToken() {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

/**
 * Backward-compatible aliases used elsewhere in the app.
 * Keep these so older files do not break.
 */
export const saveAccessToken = saveToken;
export const getAccessToken = getToken;
export const clearAccessToken = removeToken;