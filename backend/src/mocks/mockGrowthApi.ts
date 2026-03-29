import type { FinancialPlanPayload, FinancialPlanResponse, GrowthPlanPayload, GrowthPlanResponse } from '@/src/features/growth/growth.types';

export const mockGrowthApi = {
  async getPlan(payload: GrowthPlanPayload): Promise<GrowthPlanResponse> {
    return {
      focusRole: payload.role || payload.targetRole || 'HR Coordinator',
      first90Days: [
        'Clarify success with your manager during week one and keep written notes.',
        'Create two quick wins that improve response time, organization, or communication quality.',
        'Ask for structured feedback before day 45 and turn it into visible action.'
      ],
      nextYearRoadmap: [
        'Strengthen systems fluency and process documentation.',
        'Take on one cross-functional responsibility to increase visibility.',
        'Prepare a promotion story using measurable outcomes.'
      ],
      riskWatch: payload.risks?.length ? payload.risks : ['limited local proof points', 'uneven follow-up rhythm'],
      strengthsToAmplify: payload.strengths?.length ? payload.strengths : ['professional maturity', 'transferable stakeholder skills'],
      managerConversationPrompts: [
        'What outcomes matter most in the next 90 days?',
        'Where can I create value fastest?',
        'What would great performance look like by the end of the quarter?'
      ]
    };
  },
  async getFinancialPlan(payload: FinancialPlanPayload): Promise<FinancialPlanResponse> {
    const income = payload.monthlyNetIncome ?? 3600;
    return {
      monthlyNetIncome: income,
      buckets: [
        { label: 'Essentials', amount: Math.round(income * 0.55), guidance: 'Rent, food, phone, transit, and fixed needs.' },
        { label: 'Savings buffer', amount: Math.round(income * 0.15), guidance: 'Keep emergency progress visible every month.' },
        { label: 'Career growth', amount: Math.round(income * 0.1), guidance: 'Credentials, networking, and learning tools.' },
        { label: 'Flexible spending', amount: Math.round(income * 0.2), guidance: 'Use intentionally so pressure stays manageable.' }
      ],
      actions: [
        'Automate savings immediately after payday.',
        'Protect a small career-growth budget every month.',
        'Review recurring subscriptions and cut one low-value cost.'
      ],
      warning: 'Financial stability supports job-search resilience. Small consistent habits matter more than perfect plans.'
    };
  }
};
