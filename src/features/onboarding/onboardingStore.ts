import { create } from "zustand";
import type { OnboardingAnswers } from "@/src/features/onboarding/onboarding.types";

type OnboardingState = { answers: Partial<OnboardingAnswers>; setAnswer: <K extends keyof OnboardingAnswers>(key: K, value: OnboardingAnswers[K]) => void; setAnswers: (values: Partial<OnboardingAnswers>) => void; reset: () => void; };

export const useOnboardingStore = create<OnboardingState>((set) => ({
  answers: {},
  setAnswer: (key, value) => set((state) => ({ answers: { ...state.answers, [key]: value } })),
  setAnswers: (values) => set((state) => ({ answers: { ...state.answers, ...values } })),
  reset: () => set({ answers: {} })
}));
