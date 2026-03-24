import { env } from '@/src/lib/env';
import { optionalAuthApiRequest } from '@/src/api/client';
import { mockCoachApi } from '@/src/mocks/mockCoachApi';
import type { CoachSessionPayload, CoachSessionResponse } from '@/src/features/coach/coach.types';

export const coachApi = {
  createSession(token: string | null, payload: CoachSessionPayload) {
    return env.useMockApi
      ? mockCoachApi.createSession(payload)
      : optionalAuthApiRequest<CoachSessionResponse>('/coach/session', token, { method: 'POST', body: payload, timeoutMs: 30000 });
  }
};
