import { apiRequest } from './client';

export type OnboardingAnswers = {
  lifeStage?: string;
  profession?: string;
  targetRole?: string;
  country?: string;
  province?: string;
  city?: string;
  workStatus?: string;
  yearsExperience?: string;
  yearsOfExperience?: string;
  educationLevel?: string;
  englishLevel?: string;
  frenchLevel?: string;
  hasCanadianExperience?: boolean;
  industry?: string;
  strengths?: string[];
  barriers?: string[];
  goals?: string[];
  targetGoal?: string;
  urgencyLevel?: string;
  notes?: string;
};

export const onboardingApi = {
  async saveAnswers(token: string, answers: OnboardingAnswers) {
    if (!token) {
      throw new Error('Missing access token for onboarding request.');
    }

    return apiRequest('/users/onboarding', {
      method: 'POST',
      token,
      body: {
        lifeStage: answers.lifeStage ?? '',
        targetRole: answers.targetRole ?? answers.profession ?? '',
        country: answers.country ?? '',
        province: answers.province ?? '',
        city: answers.city ?? '',
        workStatus: answers.workStatus ?? '',
        yearsOfExperience:
          answers.yearsOfExperience ?? answers.yearsExperience ?? '',
        industry: answers.industry ?? answers.profession ?? '',
        strengths: answers.strengths ?? [],
        barriers: answers.barriers ?? [],
        goals: answers.goals ?? (answers.targetGoal ? [answers.targetGoal] : []),
        notes: answers.notes ?? '',
      },
    });
  },

  async generateCareerPath(token: string, answers: OnboardingAnswers) {
    if (!token) {
      throw new Error('Missing access token for career path request.');
    }

    return apiRequest('/career-path/generate', {
      method: 'POST',
      token,
      body: {
        lifeStage: answers.lifeStage ?? '',
        profession: answers.profession ?? answers.targetRole ?? '',
        targetRole: answers.targetRole ?? answers.profession ?? '',
        yearsExperience:
          answers.yearsExperience ?? answers.yearsOfExperience ?? '',
        educationLevel: answers.educationLevel ?? '',
        englishLevel: answers.englishLevel ?? '',
        frenchLevel: answers.frenchLevel ?? '',
        hasCanadianExperience: Boolean(answers.hasCanadianExperience),
        targetGoal: answers.targetGoal ?? '',
        urgencyLevel: answers.urgencyLevel ?? 'medium',
      },
    });
  },
};