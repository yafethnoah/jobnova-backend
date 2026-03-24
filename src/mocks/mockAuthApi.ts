import AsyncStorage from "@react-native-async-storage/async-storage";
import { mockDelay } from "@/src/lib/mockDelay";
import type { AuthResponse, SessionUser, SignInPayload, SignUpPayload } from "@/src/features/auth/auth.types";

const MOCK_USER_KEY = "jobnova_mock_user";
const defaultMockUser: SessionUser = { id: "user-1", email: "you@example.com", fullName: "Shadi", onboardingCompleted: false };

async function getStoredMockUser(): Promise<SessionUser> {
  const raw = await AsyncStorage.getItem(MOCK_USER_KEY);
  if (!raw) { await AsyncStorage.setItem(MOCK_USER_KEY, JSON.stringify(defaultMockUser)); return defaultMockUser; }
  try { return JSON.parse(raw) as SessionUser; } catch { await AsyncStorage.setItem(MOCK_USER_KEY, JSON.stringify(defaultMockUser)); return defaultMockUser; }
}
async function saveStoredMockUser(user: SessionUser): Promise<void> { await AsyncStorage.setItem(MOCK_USER_KEY, JSON.stringify(user)); }

export const mockAuthApi = {
  async signIn(payload: SignInPayload): Promise<AuthResponse> { await mockDelay(); const existing = await getStoredMockUser(); const user: SessionUser = { ...existing, email: payload.email || existing.email }; await saveStoredMockUser(user); return { accessToken: "mock-token", user }; },
  async signUp(payload: SignUpPayload): Promise<AuthResponse> { await mockDelay(); const user: SessionUser = { id: "user-1", email: payload.email, fullName: payload.fullName, onboardingCompleted: false }; await saveStoredMockUser(user); return { accessToken: "mock-token", user }; },
  async me(): Promise<SessionUser> { await mockDelay(); return getStoredMockUser(); },
  async updateUser(patch: Partial<SessionUser>): Promise<SessionUser> { const current = await getStoredMockUser(); const updated = { ...current, ...patch }; await saveStoredMockUser(updated); return updated; }
};
