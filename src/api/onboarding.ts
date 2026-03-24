import { apiRequest } from "@/src/api/client";
import { env } from "@/src/lib/env";
import { mockOnboardingApi } from "@/src/mocks/mockOnboardingApi";
import type { OnboardingAnswers } from "@/src/features/onboarding/onboarding.types";
import type { CareerPathResult } from "@/src/features/career-path/careerPath.types";

export const onboardingApi = {
  saveAnswers(token: string, payload: Partial<OnboardingAnswers>) { return env.useMockApi ? mockOnboardingApi.saveAnswers(payload) : apiRequest<{ success: true }>("/users/onboarding", { method: "POST", token, body: payload }); },
  getAnswers(token: string) { return env.useMockApi ? mockOnboardingApi.getAnswers() : apiRequest<Partial<OnboardingAnswers>>("/users/onboarding", { token }); },
  generateCareerPath(token: string | null, payload: OnboardingAnswers & { resumeText?: string }) { return env.useMockApi ? mockOnboardingApi.generateCareerPath(payload) : apiRequest<CareerPathResult>("/career-path/generate", { method: "POST", token, body: payload }); }
};
