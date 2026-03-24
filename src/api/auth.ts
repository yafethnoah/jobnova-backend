import { apiRequest } from "@/src/api/client";
import { env } from "@/src/lib/env";
import { mockAuthApi } from "@/src/mocks/mockAuthApi";
import type {
  AuthResponse,
  SessionUser,
  SignInPayload,
  SignUpPayload,
} from "@/src/features/auth/auth.types";

type MeResponse = SessionUser | { user?: SessionUser | null; auth?: unknown };

function normalizeMeResponse(payload: MeResponse): SessionUser {
  const candidate = (payload as { user?: SessionUser | null })?.user ?? payload;
  if (!candidate || typeof candidate !== "object") {
    throw new Error("Could not read the authenticated user profile.");
  }
  return candidate as SessionUser;
}

export const authApi = {
  signIn(payload: SignInPayload) {
    return env.useMockApi
      ? mockAuthApi.signIn(payload)
      : apiRequest<AuthResponse>("/auth/login", { method: "POST", body: payload });
  },

  signUp(payload: SignUpPayload) {
    return env.useMockApi
      ? mockAuthApi.signUp(payload)
      : apiRequest<AuthResponse>("/auth/register", { method: "POST", body: payload });
  },

  async me(token: string) {
    if (env.useMockApi) return mockAuthApi.me();
    const payload = await apiRequest<MeResponse>("/auth/me", { token, timeoutMs: 1500 });
    return normalizeMeResponse(payload);
  },
};
