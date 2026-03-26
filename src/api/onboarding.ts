import { apiRequest, ApiRequestError } from "@/src/api/client";

export type OnboardingAnswers = {
  lifeStage: string;
  profession: string;
  yearsExperience?: string;
  educationLevel?: string;
  englishLevel?: string;
  frenchLevel?: string;
  hasCanadianExperience?: boolean;
  targetGoal?: string;
  urgencyLevel?: string;
};

type OnboardingResponse =
  | OnboardingAnswers
  | {
      ok?: boolean;
      user?: {
        onboarding?: Partial<OnboardingAnswers>;
      } | null;
    };

const EMPTY_ANSWERS: OnboardingAnswers = {
  lifeStage: "",
  profession: "",
  yearsExperience: "",
  educationLevel: "",
  englishLevel: "",
  frenchLevel: "",
  hasCanadianExperience: false,
  targetGoal: "",
  urgencyLevel: "medium",
};

function normalizeAnswers(payload: OnboardingResponse): OnboardingAnswers {
  const nested = (payload as { user?: { onboarding?: Partial<OnboardingAnswers> } })?.user
    ?.onboarding;

  const source =
    nested && typeof nested === "object"
      ? nested
      : payload && typeof payload === "object"
        ? (payload as Partial<OnboardingAnswers>)
        : {};

  return {
    lifeStage: String(source.lifeStage || ""),
    profession: String(source.profession || ""),
    yearsExperience: source.yearsExperience ? String(source.yearsExperience) : "",
    educationLevel: source.educationLevel ? String(source.educationLevel) : "",
    englishLevel: source.englishLevel ? String(source.englishLevel) : "",
    frenchLevel: source.frenchLevel ? String(source.frenchLevel) : "",
    hasCanadianExperience: Boolean(source.hasCanadianExperience),
    targetGoal: source.targetGoal ? String(source.targetGoal) : "",
    urgencyLevel: source.urgencyLevel ? String(source.urgencyLevel) : "medium",
  };
}

export const onboardingApi = {
  async getAnswers(token: string): Promise<OnboardingAnswers> {
    try {
      const response = await apiRequest<OnboardingResponse>("/users/onboarding", {
        method: "GET",
        token,
        disableApiPrefixFallback: true,
      });

      return normalizeAnswers(response);
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 404) {
        return EMPTY_ANSWERS;
      }

      throw error;
    }
  },

  async saveAnswers(token: string, payload: OnboardingAnswers) {
    return apiRequest("/users/onboarding", {
      method: "POST",
      token,
      body: payload,
      disableApiPrefixFallback: true,
    });
  },

  async generateCareerPath(token: string, payload: OnboardingAnswers) {
    return apiRequest("/career-path/generate", {
      method: "POST",
      token,
      body: payload,
      disableApiPrefixFallback: true,
    });
  },
};