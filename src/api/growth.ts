import { env } from '@/src/lib/env';
import { optionalAuthApiRequest } from '@/src/api/client';
import { mockGrowthApi } from '@/src/mocks/mockGrowthApi';
import type { FinancialPlanPayload, FinancialPlanResponse, GrowthPlanPayload, GrowthPlanResponse } from '@/src/features/growth/growth.types';

export const growthApi = {
  getPlan(token: string | null, payload: GrowthPlanPayload) {
    return env.useMockApi
      ? mockGrowthApi.getPlan(payload)
      : optionalAuthApiRequest<GrowthPlanResponse>('/growth/plan', token, { method: 'POST', body: payload, timeoutMs: 30000 });
  },
  getFinancialPlan(token: string | null, payload: FinancialPlanPayload) {
    return env.useMockApi
      ? mockGrowthApi.getFinancialPlan(payload)
      : optionalAuthApiRequest<FinancialPlanResponse>('/growth/financial-plan', token, { method: 'POST', body: payload, timeoutMs: 30000 });
  }
};
