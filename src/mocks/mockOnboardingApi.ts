import { mockDelay } from "@/src/lib/mockDelay";
import { mockCareerPath } from "@/src/mocks/mockData";
import type { OnboardingAnswers } from "@/src/features/onboarding/onboarding.types";
import type { CareerPathResult } from "@/src/features/career-path/careerPath.types";

let storedAnswers: Partial<OnboardingAnswers> = {};

export const mockOnboardingApi = {
  async saveAnswers(payload: Partial<OnboardingAnswers>): Promise<{ success: true }> { await mockDelay(); storedAnswers = { ...storedAnswers, ...payload }; return { success: true }; },
  async getAnswers(): Promise<Partial<OnboardingAnswers>> { await mockDelay(); return { ...storedAnswers }; },
  async generateCareerPath(_payload: OnboardingAnswers & { resumeText?: string }): Promise<CareerPathResult> { await mockDelay(700); return { ...mockCareerPath, skillsToBuild: ['Resume tailoring', 'LinkedIn optimization', 'Interview practice'], reasoning: 'Mock mode returns a polished demo path. Live mode can generate a path from real user data and attached resume text.' }; }
};
