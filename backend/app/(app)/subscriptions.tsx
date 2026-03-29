import { Text, View } from 'react-native';
import { AppButton } from '@/src/components/ui/AppButton';
import { AppCard } from '@/src/components/ui/AppCard';
import { AppScreen } from '@/src/components/ui/AppScreen';
import { env } from '@/src/lib/env';
import { useSubscriptionStore } from '@/src/features/subscriptions/subscriptionStore';

const plans = [
  { key: 'weekly', name: 'Weekly Pro', price: env.subscriptionPriceWeekly || '$1.99/week', note: 'Best for short, focused job-search bursts.' },
  { key: 'monthly', name: 'Monthly Pro', price: env.subscriptionPriceMonthly || '$9.99/month', note: 'Best balance for active ATS checks, tailoring, and interview practice.' },
  { key: 'annual', name: 'Annual Pro', price: env.subscriptionPriceAnnual || '$59.99/year', note: 'Best long-run value for repeated exports and coaching.' }
] as const;

export default function SubscriptionsScreen() {
  const { selectedPlan, activePlan, isProcessing, status, statusMessage, choosePlan, completeCheckout, restorePurchases } = useSubscriptionStore();
  const selected = plans.find((plan) => plan.key === selectedPlan) || plans[1];

  return (
    <AppScreen>
      <Text style={{ fontSize: 30, fontWeight: '800', color: '#FFFFFF' }}>Subscriptions</Text>
      <Text style={{ color: '#C8D3F5', lineHeight: 22 }}>
        Choose a plan inside the app. This screen no longer fakes successful purchases locally, so subscription state stays trustworthy while you connect native StoreKit billing.
      </Text>
      {activePlan ? (
        <AppCard>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>Active plan</Text>
          <Text style={{ marginTop: 8, color: '#34D399' }}>{plans.find((plan) => plan.key === activePlan)?.name || 'Pro plan active'}</Text>
        </AppCard>
      ) : null}

      <AppCard>
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>Subscription status</Text>
          <Text style={{ color: status === 'error' ? '#FCA5A5' : status === 'active' ? '#34D399' : '#C8D3F5', lineHeight: 22 }}>{statusMessage}</Text>
        </View>
      </AppCard>

      {plans.map((plan) => (
        <AppCard key={plan.key}>
          <View style={{ gap: 10 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>{plan.name}</Text>
            <Text style={{ color: '#C8D3F5' }}>{plan.price}</Text>
            <Text style={{ color: '#C8D3F5', lineHeight: 22 }}>{plan.note}</Text>
            <AppButton
              label={selectedPlan === plan.key ? `Selected: ${plan.name}` : `Choose ${plan.name}`}
              variant={selectedPlan === plan.key ? 'primary' : 'secondary'}
              onPress={() => choosePlan(plan.key)}
            />
          </View>
        </AppCard>
      ))}
      <AppButton
        label={isProcessing ? 'Processing...' : `Continue with ${selected.name}`}
        onPress={() => void completeCheckout()}
        disabled={isProcessing}
      />
      <AppButton
        label={isProcessing ? 'Checking purchases...' : 'Restore purchases'}
        variant="secondary"
        onPress={() => void restorePurchases()}
        disabled={isProcessing}
      />
      <AppCard>
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>Privacy note</Text>
          <Text style={{ color: '#C8D3F5', lineHeight: 22 }}>
            Prices remain visible, but the app no longer exposes fake purchase success. Keep billing inside the app once your StoreKit products, server receipt validation, and live entitlement sync are fully configured.
          </Text>
        </View>
      </AppCard>
    </AppScreen>
  );
}
