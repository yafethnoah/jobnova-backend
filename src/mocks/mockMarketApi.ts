import type { MarketInsightsPayload, MarketInsightsResponse } from '@/src/features/market/market.types';

export const mockMarketApi = {
  async getInsights(payload: MarketInsightsPayload): Promise<MarketInsightsResponse> {
    return {
      role: payload.role || 'HR Coordinator',
      location: payload.location || 'Ontario',
      demandLevel: 'medium',
      salaryBand: '$55,000–$75,000',
      highSignalSkills: ['ATS-ready resume language', 'stakeholder communication', 'Excel/reporting fluency', 'process accuracy'],
      marketSignals: [
        'Employers often reward clear evidence of outcomes over broad responsibility lists.',
        'Local tools language and role-title alignment improve interview conversion.',
        'Consistent follow-up and networking usually outperform mass applications.'
      ],
      nextMoves: [
        'Strengthen your summary with the exact role title.',
        'Add metrics to two recent bullets.',
        'Review which applications generate replies and repeat that pattern.'
      ]
    };
  }
};
