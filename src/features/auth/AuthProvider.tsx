import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { setAccessToken as setApiAccessToken } from "@/src/api/client";
import { authApi } from "@/src/api/auth";
import {
  saveAccessToken,
  getAccessToken,
  clearAccessToken,
} from "@/src/lib/secureStorage";

type AuthStatus = "loading" | "signed_in" | "signed_out";

type SessionUser = {
  id: string;
  email: string;
  fullName?: string;
  onboardingCompleted?: boolean;
  onboarding?: Record<string, unknown>;
  preferences?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

type SignUpPayload = {
  fullName: string;
  email: string;
  password: string;
};

type AuthContextValue = {
  status: AuthStatus;
  accessToken: string | null;
  user: SessionUser | null;
  onboardingCompleted: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (payload: SignUpPayload) => Promise<void>;
  signOut: () => Promise<void>;
  refreshMe: () => Promise<void>;
  markOnboardingComplete: () => void;
  signInLocal: (email: string, password: string) => Promise<void>;
  registerLocal: (
    fullName: string,
    email: string,
    password: string
  ) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function normalizeUser(payload: unknown): SessionUser | null {
  if (!payload || typeof payload !== "object") return null;

  const raw = payload as Record<string, unknown>;
  const id = raw.id ? String(raw.id) : "";
  const email = raw.email ? String(raw.email) : "";

  if (!id || !email) return null;

  return {
    id,
    email,
    fullName: raw.fullName ? String(raw.fullName) : undefined,
    onboardingCompleted: Boolean(raw.onboardingCompleted),
    onboarding:
      raw.onboarding && typeof raw.onboarding === "object"
        ? (raw.onboarding as Record<string, unknown>)
        : undefined,
    preferences:
      raw.preferences && typeof raw.preferences === "object"
        ? (raw.preferences as Record<string, unknown>)
        : undefined,
    createdAt: raw.createdAt ? String(raw.createdAt) : undefined,
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : undefined,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);

  const applySignedOutState = useCallback(async () => {
    await clearAccessToken();
    setApiAccessToken(null);
    setAccessTokenState(null);
    setUser(null);
    setStatus("signed_out");
  }, []);

  const applySignedInState = useCallback(
    async (token: string, nextUser: SessionUser) => {
      await saveAccessToken(token);
      setApiAccessToken(token);
      setAccessTokenState(token);
      setUser(nextUser);
      setStatus("signed_in");
    },
    []
  );

  const refreshMe = useCallback(async () => {
    try {
      const payload = await authApi.me();
      const resolvedUser = normalizeUser((payload as any)?.user ?? payload);

      if (!resolvedUser) {
        await applySignedOutState();
        return;
      }

      setUser(resolvedUser);
      setStatus("signed_in");
    } catch {
      await applySignedOutState();
    }
  }, [applySignedOutState]);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const token = await getAccessToken();

        if (!token) {
          setApiAccessToken(null);
          setStatus("signed_out");
          return;
        }

        setApiAccessToken(token);
        setAccessTokenState(token);

        const payload = await authApi.me();
        const resolvedUser = normalizeUser((payload as any)?.user ?? payload);

        if (!resolvedUser) {
          await applySignedOutState();
          return;
        }

        setUser(resolvedUser);
        setStatus("signed_in");
      } catch {
        await applySignedOutState();
      }
    };

    void bootstrap();
  }, [applySignedOutState]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const payload = await authApi.login({ email, password });

      const token = payload.accessToken ?? payload.token;
      const resolvedUser = normalizeUser(payload.user);

      if (!token || !resolvedUser) {
        throw new Error(payload.message || "Sign in failed.");
      }

      await applySignedInState(token, resolvedUser);
    },
    [applySignedInState]
  );

  const signUp = useCallback(
    async (payload: SignUpPayload) => {
      const response = await authApi.register(payload);

      const token = response.accessToken ?? response.token;
      const resolvedUser = normalizeUser(response.user);

      if (!token || !resolvedUser) {
        throw new Error(response.message || "Sign up failed.");
      }

      await applySignedInState(token, resolvedUser);
    },
    [applySignedInState]
  );

  const signOut = useCallback(async () => {
    await applySignedOutState();
  }, [applySignedOutState]);

  const markOnboardingComplete = useCallback(() => {
    setUser((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        onboardingCompleted: true,
      };
    });
  }, []);

  const signInLocal = useCallback(
    async (email: string, password: string) => {
      await signIn(email, password);
    },
    [signIn]
  );

  const registerLocal = useCallback(
    async (fullName: string, email: string, password: string) => {
      await signUp({ fullName, email, password });
    },
    [signUp]
  );

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
    [
      status,
      accessToken,
      user,
      signIn,
      signUp,
      signOut,
      refreshMe,
      markOnboardingComplete,
      signInLocal,
      registerLocal,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuthContext must be used within AuthProvider");
  }

  return context;
}