export type AuthStatus = "loading" | "signed_out" | "signed_in";

export type SessionUser = {
  id: string;
  email: string;
  fullName?: string;
  onboardingCompleted: boolean;
  targetRole?: string;
  location?: string;
  summary?: string;
  authProvider?: string;
};

export type SignInPayload = { email: string; password: string };
export type SignUpPayload = { fullName: string; email: string; password: string };

export type AuthResponse = {
  accessToken?: string;
  sessionToken?: string;
  user?: SessionUser;
  success?: boolean;
  message?: string;
  authProvider?: string;
};

export type AuthContextValue = {
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
  registerLocal: (fullName: string, email: string, password: string) => Promise<void>;
};
