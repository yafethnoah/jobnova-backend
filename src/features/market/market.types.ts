export type MarketInsightsPayload = {
  role?: string;
  location?: string;
  profileSummary?: string;
};

export type MarketInsightsResponse = {
  role: string;
  location: string;
  demandLevel: 'low' | 'medium' | 'high' | string;
  salaryBand: string;
  highSignalSkills: string[];
  marketSignals: string[];
  nextMoves: string[];
};
