import { apiRequest } from "@/src/api/client";

export type OnboardingAnswers = {
  lifeStage?: string;
  profession?: string;
  yearsExperience?: string;
  educationLevel?: string;
  englishLevel?: string;
  frenchLevel?: string;
  targetGoal?: string;
  urgencyLevel?: string;
  hasCanadianExperience?: boolean;
};

export type SaveOnboardingResponse = {
  ok?: boolean;
  message?: string;
  user?: {
    id?: string;
    email?: string;
    fullName?: string;
    onboardingCompleted?: boolean;
    onboarding?: OnboardingAnswers;
    preferences?: Record<string, unknown>;
    createdAt?: string;
    updatedAt?: string;
  };
};

export type GetOnboardingResponse = {
  ok?: boolean;
  user?: {
    onboarding?: OnboardingAnswers;
    onboardingCompleted?: boolean;
  };
  onboarding?: OnboardingAnswers;
};

export type CareerPathResponse = {
  success?: boolean;
  generatedAt?: string;
  suggestedDirection?: string;
  profile?: Record<string, unknown>;
  paths?: Array<Record<string, unknown>>;
};

export const onboardingApi = {
  getAnswers: async (): Promise<GetOnboardingResponse | { error: "unauthorized"; status: 401 }> => {
    try {
      return await apiRequest("/users/onboarding", "GET");
    } catch (error) {
      const message = error instanceof Error ? error.message : "";

      // Fallback for older backend versions that only expose /users/me
      if (
        message.includes("404") ||
        message.includes("HTML instead of JSON") ||
        message.includes("Request failed")
      ) {
        return await apiRequest("/users/me", "GET");
      }

      throw error;
    }
  },

  saveAnswers: async (
    answers: OnboardingAnswers
  ): Promise<SaveOnboardingResponse | { error: "unauthorized"; status: 401 }> => {
    return await apiRequest("/users/onboarding", "POST", answers);
  },

  generateCareerPath: async (
    answers?: OnboardingAnswers
  ): Promise<CareerPathResponse | { error: "unauthorized"; status: 401 }> => {
    return await apiRequest("/career-path/generate", "POST", answers ?? {});
  },
};