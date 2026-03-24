import { useEffect } from "react";
import { onboardingApi } from "@/src/api/onboarding";
import { useAuth } from "@/src/features/auth/useAuth";
import { useOnboardingStore } from "@/src/features/onboarding/onboardingStore";

export function useOnboardingBootstrap() {
  const { accessToken, status } = useAuth();
  const { setAnswers } = useOnboardingStore();

  useEffect(() => {
    async function run() {
      if (status !== "signed_in" || !accessToken) return;
      try { const answers = await onboardingApi.getAnswers(accessToken); setAnswers(answers); } catch { }
    }
    void run();
  }, [accessToken, status, setAnswers]);
}
