import { apiRequest } from "@/src/api/client";
import { env } from "@/src/lib/env";
import { mockAuthApi } from "@/src/mocks/mockAuthApi";
import type { AuthResponse, SessionUser, SignInPayload, SignUpPayload } from "@/src/features/auth/auth.types";

export const authApi = {
  signIn(payload: SignInPayload) { return env.useMockApi ? mockAuthApi.signIn(payload) : apiRequest<AuthResponse>("/auth/login", { method: "POST", body: payload }); },
  signUp(payload: SignUpPayload) { return env.useMockApi ? mockAuthApi.signUp(payload) : apiRequest<AuthResponse>("/auth/register", { method: "POST", body: payload }); },
  me(token: string) { return env.useMockApi ? mockAuthApi.me() : apiRequest<SessionUser>("/auth/me", { token, timeoutMs: 1500 }); }
};
