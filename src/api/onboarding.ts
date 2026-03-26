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
    return await apiRequest("/users/onboarding", "GET");
  },

  saveAnswers: async (
    answers: OnboardingAnswers
  ): Promise<SaveOnboardingResponse | { error: "unauthorized"; status: 401 }> => {
    return await apiRequest("/users/onboarding", "POST", answers);
  },

  generateCareerPath: async (): Promise<
    CareerPathResponse | { error: "unauthorized"; status: 401 }
  > => {
    return await apiRequest("/career-path/generate", "POST");
  },
};