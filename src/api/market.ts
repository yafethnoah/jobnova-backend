import { env } from '@/src/lib/env';
import { optionalAuthApiRequest } from '@/src/api/client';
import { mockMarketApi } from '@/src/mocks/mockMarketApi';
import type { MarketInsightsPayload, MarketInsightsResponse } from '@/src/features/market/market.types';

export const marketApi = {
  getInsights(token: string | null, payload: MarketInsightsPayload) {
    return env.useMockApi
      ? mockMarketApi.getInsights(payload)
      : optionalAuthApiRequest<MarketInsightsResponse>('/market/insights', token, { method: 'POST', body: payload, timeoutMs: 30000 });
  }
};
