import type { CoachSessionPayload, CoachSessionResponse } from '@/src/features/coach/coach.types';

export const mockCoachApi = {
  async createSession(payload: CoachSessionPayload): Promise<CoachSessionResponse> {
    return {
      phase: payload.phase || 'during',
      goal: payload.goal || 'win interviews for a stable role',
      diagnosis: 'Your strongest move is to stop spreading effort too widely and align each application, resume, and interview story to one target role.',
      priorities: [
        'Choose one target role for the next 7 days.',
        'Tailor one resume version with stronger evidence and keyword alignment.',
        'Practice one interview answer using a clear STAR structure.'
      ],
      encouragement: 'Momentum grows when each next step is specific enough to finish today.',
      nextAction: 'Complete one tailored application, one follow-up, and one interview answer practice today.'
    };
  }
};
