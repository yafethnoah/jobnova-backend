import { env } from '@/src/lib/env';
import { apiRequest } from '@/src/api/client';
import { mockLinkedinApi } from '@/src/mocks/mockLinkedinApi';
import type { LinkedInOptimizationResult } from '@/src/features/profile/linkedin.types';

export const linkedinApi = {
  optimize(token: string | null, payload: { url: string; targetRole?: string; jobDescription?: string; jobPostingUrl?: string; resumeText?: string }) {
    return env.useMockApi ? mockLinkedinApi.optimize(payload) : apiRequest<LinkedInOptimizationResult>('/linkedin/optimize', { method: 'POST', token, body: payload });
  }
};
