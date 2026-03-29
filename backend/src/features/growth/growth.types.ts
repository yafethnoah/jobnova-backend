export type GrowthPlanPayload = {
  role?: string;
  targetRole?: string;
  strengths?: string[];
  risks?: string[];
  notes?: string;
};

export type GrowthPlanResponse = {
  focusRole: string;
  first90Days: string[];
  nextYearRoadmap: string[];
  riskWatch: string[];
  strengthsToAmplify: string[];
  managerConversationPrompts: string[];
};

export type FinancialPlanPayload = {
  monthlyNetIncome?: number;
  householdNotes?: string;
  goal?: string;
};

export type FinancialBucket = {
  label: string;
  amount: number;
  guidance: string;
};

export type FinancialPlanResponse = {
  monthlyNetIncome: number | null;
  buckets: FinancialBucket[];
  actions: string[];
  warning: string;
};
