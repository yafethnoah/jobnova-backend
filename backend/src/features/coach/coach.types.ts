export type CoachSessionPayload = {
  phase?: 'before' | 'during' | 'after' | string;
  goal?: string;
  currentChallenge?: string;
  targetRole?: string;
  notes?: string;
};

export type CoachSessionResponse = {
  phase: string;
  goal: string;
  diagnosis: string;
  priorities: string[];
  encouragement: string;
  nextAction: string;
};
