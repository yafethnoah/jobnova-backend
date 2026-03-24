import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { authApi } from "@/src/api/auth";
import { env } from "@/src/lib/env";
import { mockAuthApi } from "@/src/mocks/mockAuthApi";
import { clearAccessToken, getAccessToken, saveAccessToken } from "@/src/lib/secureStorage";
import type {
  AuthContextValue,
  AuthStatus,
  SessionUser,
  SignUpPayload,
} from "@/src/features/auth/auth.types";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);

  const bootstrap = useCallback(async () => {
    try {
      const token = await getAccessToken();
      if (!token) {
        setStatus("signed_out");
        return;
      }

      const me = await Promise.race([
        authApi.me(token),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
      ]);

      if (!me) {
        await clearAccessToken();
        setAccessToken(null);
        setUser(null);
        setStatus("signed_out");
        return;
      }

      setAccessToken(token);
      setUser(me);
      setStatus("signed_in");
    } catch {
      await clearAccessToken();
      setAccessToken(null);
      setUser(null);
      setStatus("signed_out");
    }
  }, []);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const signIn = useCallback(async (email: string, password: string) => {
    const response = await authApi.signIn({ email, password });
    if (!response.accessToken || !response.user) {
      throw new Error(response.message || "Sign in failed.");
    }
    await saveAccessToken(response.accessToken);
    setAccessToken(response.accessToken);
    setUser(response.user);
    setStatus("signed_in");
  }, []);

  const signUp = useCallback(async (payload: SignUpPayload) => {
    const response = await authApi.signUp(payload);
    if (!response.accessToken || !response.user) {
      throw new Error(response.message || "Account created. Please sign in to continue.");
    }
    await saveAccessToken(response.accessToken);
    setAccessToken(response.accessToken);
    setUser(response.user);
    setStatus("signed_in");
  }, []);

  const signOut = useCallback(async () => {
    await clearAccessToken();
    setAccessToken(null);
    setUser(null);
    setStatus("signed_out");
  }, []);

  const refreshMe = useCallback(async () => {
    if (!accessToken) return;
    const me = await authApi.me(accessToken);
    setUser(me);
  }, [accessToken]);

  const markOnboardingComplete = useCallback(() => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, onboardingCompleted: true };
      if (env.useMockApi) {
        void mockAuthApi.updateUser({ onboardingCompleted: true });
      }
      return updated;
    });
  }, []);

  const signInLocal = useCallback(async (email: string, password: string) => signIn(email, password), [signIn]);

  const registerLocal = useCallback(async (fullName: string, email: string, password: string) => signUp({ fullName, email, password }), [signUp]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      accessToken,
      user,
      onboardingCompleted: Boolean(user?.onboardingCompleted),
      signIn,
      signUp,
      signOut,
      refreshMe,
      markOnboardingComplete,
      signInLocal,
      registerLocal,
    }),
    [status, accessToken, user, signIn, signUp, signOut, refreshMe, markOnboardingComplete, signInLocal, registerLocal]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuthContext must be used within AuthProvider");
  return context;
}
