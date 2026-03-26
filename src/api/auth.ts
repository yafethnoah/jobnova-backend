import { publicApiRequest, apiRequest } from "@/src/api/client";

export type AuthUser = {
  id: string;
  email: string;
  fullName?: string;
  onboardingCompleted?: boolean;
  onboarding?: Record<string, unknown>;
  preferences?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

export type AuthSuccessResponse = {
  ok?: boolean;
  accessToken?: string;
  token?: string;
  user?: AuthUser;
  message?: string;
};

export type RegisterPayload = {
  fullName: string;
  email: string;
  password: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export const authApi = {
  register: async (payload: RegisterPayload): Promise<AuthSuccessResponse> => {
    return await publicApiRequest("/auth/register", "POST", payload);
  },

  login: async (payload: LoginPayload): Promise<AuthSuccessResponse> => {
    return await publicApiRequest("/auth/login", "POST", payload);
  },

  me: async (): Promise<{ ok?: boolean; user?: AuthUser; message?: string }> => {
    return await apiRequest("/users/me", "GET");
  },
};