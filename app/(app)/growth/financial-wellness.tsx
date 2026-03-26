import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { AppScreen } from '@/src/components/ui/AppScreen';
import { AppCard } from '@/src/components/ui/AppCard';
import { useAuth } from '@/src/features/auth/useAuth';
import { growthApi } from '@/src/api/growth';

export default function FinancialWellnessScreen() {
  const { accessToken } = useAuth();
  const income = 3600;
  const planQuery = useQuery({
    queryKey: ['financial-plan', income],
    queryFn: () => growthApi.getFinancialPlan(accessToken, {
      monthlyNetIncome: income,
      goal: 'stay stable while growing professionally'
    })
  });

  const total = useMemo(() => (planQuery.data?.buckets || []).reduce((sum, item) => sum + Number(item.amount || 0), 0), [planQuery.data]);

  return (
    <AppScreen>
      <AppCard>
        <Text style={{ fontSize: 28, fontWeight: '900', color: '#F8FAFF' }}>Financial Wellness</Text>
        <Text style={{ marginTop: 10, color: '#B8C4E4', lineHeight: 22 }}>
          A stable career is easier to build when your money plan protects focus, not just survival.
        </Text>
      </AppCard>

      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: '800', color: '#F8FAFF' }}>Monthly plan snapshot</Text>
        <Text style={{ marginTop: 10, color: '#B8C4E4' }}>Net income used in this sample: ${planQuery.data?.monthlyNetIncome ?? income}</Text>
        <Text style={{ marginTop: 4, color: '#8FA1CC' }}>Allocated across buckets: ${total}</Text>
      </AppCard>

      {(planQuery.data?.buckets || []).map((bucket) => (
        <AppCard key={bucket.label}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: '#F8FAFF' }}>{bucket.label}</Text>
          <Text style={{ marginTop: 8, fontSize: 24, fontWeight: '900', color: '#6F86FF' }}>${bucket.amount}</Text>
          <Text style={{ marginTop: 8, color: '#B8C4E4', lineHeight: 22 }}>{bucket.guidance}</Text>
        </AppCard>
      ))}

      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: '800', color: '#F8FAFF' }}>Action guide</Text>
        <View style={{ marginTop: 12, gap: 10 }}>
          {(planQuery.data?.actions || []).map((item, index) => (
            <Text key={`${item}-${index}`} style={{ color: '#B8C4E4', lineHeight: 22 }}>{index + 1}. {item}</Text>
          ))}
          <Text style={{ color: '#FBBF24', lineHeight: 22 }}>{planQuery.data?.warning || ''}</Text>
        </View>
      </AppCard>
    </AppScreen>
  );
}
