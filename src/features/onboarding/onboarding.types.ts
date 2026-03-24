export type UrgencyLevel = "low" | "medium" | "high";
export type OnboardingAnswers = { lifeStage: string; profession: string; yearsExperience: string; educationLevel: string; englishLevel: string; frenchLevel?: string; hasCanadianExperience: boolean; targetGoal: string; urgencyLevel: UrgencyLevel; };
