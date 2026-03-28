import { apiRequest, publicApiRequest } from "@/src/api/client";

type AuthUser = {
  id: string;
  email: string;
  fullName?: string;
  onboardingCompleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type AuthResponse = {
  ok?: boolean;
  accessToken?: string;
  token?: string;
  user?: AuthUser;
  message?: string;
};

export const authApi = {
  register: async (payload: {
    fullName: string;
    email: string;
    password: string;
  }): Promise<AuthResponse> => {
    return await publicApiRequest("/api/auth/register", "POST", payload);
  },

  login: async (payload: {
    email: string;
    password: string;
  }): Promise<AuthResponse> => {
    return await publicApiRequest("/api/auth/login", "POST", payload);
  },

  me: async (): Promise<AuthResponse | { error: "unauthorized"; status: 401 }> => {
    return await apiRequest("/api/auth/me", "POST");
  },

  logout: async (): Promise<{ ok?: boolean; message?: string }> => {
    return await apiRequest("/api/auth/logout", "POST");
  },
};