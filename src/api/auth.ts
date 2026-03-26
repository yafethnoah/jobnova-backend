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

function normalizeUser(candidate: unknown): SessionUser {
  if (!candidate || typeof candidate !== "object") {
    throw new Error("Could not read the authenticated user profile.");
  }

  const user = candidate as Partial<SessionUser>;

  return {
    id: String(user.id || ""),
    email: String(user.email || ""),
    fullName: user.fullName ? String(user.fullName) : undefined,
    onboardingCompleted: Boolean(user.onboardingCompleted),
    targetRole: user.targetRole ? String(user.targetRole) : undefined,
    location: user.location ? String(user.location) : undefined,
    summary: user.summary ? String(user.summary) : undefined,
    authProvider: user.authProvider ? String(user.authProvider) : undefined,
  };
}

function normalizeAuthResponse(payload: AuthResponse): AuthResponse {
  const token =
    payload.accessToken ||
    payload.sessionToken ||
    (payload as AuthResponse & { token?: string }).token;

  const rawUser =
    payload.user && typeof payload.user === "object"
      ? payload.user
      : undefined;

  return {
    ...payload,
    accessToken: token,
    user: rawUser ? normalizeUser(rawUser) : undefined,
  };
}

function normalizeMeResponse(payload: MeResponse): SessionUser {
  const candidate = (payload as { user?: SessionUser | null })?.user ?? payload;
  return normalizeUser(candidate);
}

export const authApi = {
  async signIn(payload: SignInPayload): Promise<AuthResponse> {
    if (env.useMockApi) {
      return mockAuthApi.signIn(payload);
    }

    const response = await apiRequest<AuthResponse>("/auth/login", {
      method: "POST",
      body: payload,
    });

    return normalizeAuthResponse(response);
  },

  async signUp(payload: SignUpPayload): Promise<AuthResponse> {
    if (env.useMockApi) {
      return mockAuthApi.signUp(payload);
    }

    const response = await apiRequest<AuthResponse>("/auth/register", {
      method: "POST",
      body: payload,
    });

    return normalizeAuthResponse(response);
  },

  async me(token: string): Promise<SessionUser> {
    if (env.useMockApi) {
      return mockAuthApi.me();
    }

    const payload = await apiRequest<MeResponse>("/auth/me", {
      token,
      timeoutMs: 3000,
    });

    return normalizeMeResponse(payload);
  },
};