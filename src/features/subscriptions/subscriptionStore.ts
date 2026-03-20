import { create } from 'zustand';
import { openManageSubscriptions } from '@/src/lib/openExternalLink';
import { env } from '@/src/lib/env';

type PlanKey = 'weekly' | 'monthly' | 'annual' | null;
type SubscriptionStatus = 'idle' | 'unavailable' | 'active' | 'restoring' | 'error';

type SubscriptionState = {
  selectedPlan: PlanKey;
  activePlan: PlanKey;
  isProcessing: boolean;
  status: SubscriptionStatus;
  statusMessage: string;
  choosePlan: (plan: Exclude<PlanKey, null>) => void;
  completeCheckout: () => Promise<void>;
  restorePurchases: () => Promise<void>;
};

const NATIVE_BILLING_READY = false;
const BILLING_NOT_READY_MESSAGE = 'Native in-app purchase wiring still needs your live App Store products and receipt validation. This build no longer simulates payment locally.';

export const useSubscriptionStore = create<SubscriptionState>((set) => ({
  selectedPlan: 'monthly',
  activePlan: null,
  isProcessing: false,
  status: 'idle',
  statusMessage: 'Select a plan to prepare your in-app subscription flow.',
  choosePlan: (plan) => set({ selectedPlan: plan, status: 'idle', statusMessage: `Selected ${plan} plan.` }),
  completeCheckout: async () => {
    set({ isProcessing: true, status: 'idle', statusMessage: 'Preparing checkout…' });
    try {
      if (!NATIVE_BILLING_READY) {
        set({
          isProcessing: false,
          status: 'unavailable',
          statusMessage: BILLING_NOT_READY_MESSAGE
        });
        return;
      }
    } catch (error) {
      set({
        isProcessing: false,
        status: 'error',
        statusMessage: error instanceof Error ? error.message : 'Could not start the subscription flow.'
      });
    }
  },
  restorePurchases: async () => {
    set({ isProcessing: true, status: 'restoring', statusMessage: 'Opening subscription management…' });
    try {
      if (env.subscriptionManageUrl) {
        await openManageSubscriptions(env.subscriptionManageUrl);
      }
      set({
        isProcessing: false,
        status: 'unavailable',
        statusMessage: 'Use the App Store subscription screen to restore active purchases after native billing is connected.'
      });
    } catch (error) {
      set({
        isProcessing: false,
        status: 'error',
        statusMessage: error instanceof Error ? error.message : 'Could not open subscription management.'
      });
    }
  }
}));
