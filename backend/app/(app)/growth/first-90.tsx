import { Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { AppScreen } from '@/src/components/ui/AppScreen';
import { AppCard } from '@/src/components/ui/AppCard';
import { useAuth } from '@/src/features/auth/useAuth';
import { useProfile } from '@/src/hooks/useProfile';
import { growthApi } from '@/src/api/growth';

export default function First90Screen() {
  const { accessToken } = useAuth();
  const profile = useProfile();
  const planQuery = useQuery({
    queryKey: ['growth-plan-full', profile.data?.targetRole, profile.data?.summary],
    queryFn: () => growthApi.getPlan(accessToken, {
      role: profile.data?.targetRole,
      notes: profile.data?.summary
    })
  });
  const plan = planQuery.data;

  return (
    <AppScreen>
      <AppCard>
        <Text style={{ fontSize: 28, fontWeight: '900', color: '#F8FAFF' }}>First 90 Days Success Plan</Text>
        <Text style={{ marginTop: 10, color: '#B8C4E4', lineHeight: 22 }}>
          Use this after an offer, during onboarding, or even while preparing for your first role so the transition feels intentional.
        </Text>
      </AppCard>

      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: '800', color: '#F8FAFF' }}>Execution checklist</Text>
        <View style={{ marginTop: 12, gap: 10 }}>
          {(plan?.first90Days || []).map((item, index) => (
            <Text key={`${item}-${index}`} style={{ color: '#B8C4E4', lineHeight: 22 }}>{index + 1}. {item}</Text>
          ))}
        </View>
      </AppCard>

      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: '800', color: '#F8FAFF' }}>Manager conversation prompts</Text>
        <View style={{ marginTop: 12, gap: 10 }}>
          {(plan?.managerConversationPrompts || []).map((item, index) => (
            <Text key={`${item}-${index}`} style={{ color: '#B8C4E4', lineHeight: 22 }}>• {item}</Text>
          ))}
        </View>
      </AppCard>

      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: '800', color: '#F8FAFF' }}>Strengths to amplify</Text>
        <View style={{ marginTop: 12, gap: 10 }}>
          {(plan?.strengthsToAmplify || []).map((item, index) => (
            <Text key={`${item}-${index}`} style={{ color: '#B8C4E4', lineHeight: 22 }}>• {item}</Text>
          ))}
        </View>
      </AppCard>
    </AppScreen>
  );
}
