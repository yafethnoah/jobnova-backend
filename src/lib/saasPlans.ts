export type BillingInterval = 'weekly' | 'monthly' | 'annual';

export type SaaSPlan = {
  id: string;
  name: string;
  interval: BillingInterval;
  badge?: string;
  priceLabel: string;
  creditsLabel: string;
  features: string[];
  ctaLabel: string;
  recommended?: boolean;
};

export const saasPlans: SaaSPlan[] = [
  {
    id: 'starter-weekly',
    name: 'Starter',
    interval: 'weekly',
    badge: 'Try risk-free',
    priceLabel: '$1.99/week',
    creditsLabel: 'Ideal for active job hunts',
    features: [
      'Resume tailoring',
      'ATS score checks',
      'Cover letter generation',
      'Interview practice'
    ],
    ctaLabel: 'Start weekly'
  },
  {
    id: 'pro-monthly',
    name: 'Pro',
    interval: 'monthly',
    badge: 'Most popular',
    priceLabel: '$9.99/month',
    creditsLabel: 'Best balance for steady momentum',
    features: [
      'Unlimited resume rewrites',
      'Unlimited ATS score checks',
      'Job-ready package export',
      'Live interview mode',
      'Application tracker insights'
    ],
    ctaLabel: 'Choose monthly',
    recommended: true
  },
  {
    id: 'pro-annual',
    name: 'Pro Annual',
    interval: 'annual',
    badge: 'Best value',
    priceLabel: '$59.99/year',
    creditsLabel: 'Lowest cost for long searches',
    features: [
      'Everything in Pro',
      'Priority export generation',
      'Career path planning',
      'Premium templates',
      'Future analytics unlocks'
    ],
    ctaLabel: 'Choose annual'
  }
];
