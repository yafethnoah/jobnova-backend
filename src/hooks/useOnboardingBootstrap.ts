import { useCallback, useEffect, useState } from "react";
import { onboardingApi, OnboardingAnswers } from "@/src/api/onboarding";
import { getAccessToken } from "@/src/lib/secureStorage";
import { setAccessToken as setClientAccessToken } from "@/src/api/client";

type BootstrapState = {
  loading: boolean;
  answers: OnboardingAnswers | null;
  error: string | null;
  reload: () => Promise<void>;
};

function normalizeAnswers(payload: any): OnboardingAnswers | null {
  if (!payload) return null;

  if (payload?.user?.onboarding) {
    return payload.user.onboarding as OnboardingAnswers;
  }

  if (payload?.onboarding) {
    return payload.onboarding as OnboardingAnswers;
  }

  if (
    typeof payload === "object" &&
    (payload.lifeStage ||
      payload.profession ||
      payload.yearsExperience ||
      payload.educationLevel ||
      payload.englishLevel ||
      payload.frenchLevel ||
      payload.targetGoal ||
      payload.urgencyLevel)
  ) {
    return payload as OnboardingAnswers;
  }

  return null;
}

export function useOnboardingBootstrap(): BootstrapState {
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<OnboardingAnswers | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const storedToken = await getAccessToken();
      console.log("[ONBOARDING] accessToken exists:", Boolean(storedToken));

      if (!storedToken) {
        setAnswers(null);
        setError("No saved session found.");
        return;
      }

      // Keep API client in sync with persisted session token.
      // Do NOT JSON.parse the JWT. It is already a plain string.
      setClientAccessToken(storedToken);

      const payload = await onboardingApi.getAnswers();

      if ((payload as any)?.error === "unauthorized") {
        setAnswers(null);
        setError("Session expired. Please sign in again.");
        return;
      }

      const normalized = normalizeAnswers(payload);

      if (normalized) {
        console.log("[ONBOARDING] answers:", normalized);
      }

      setAnswers(normalized);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load onboarding answers.";
      console.log("[ONBOARDING] failed:", message);
      setError(message);
      setAnswers(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    loading,
    answers,
    error,
    reload: load,
  };
}