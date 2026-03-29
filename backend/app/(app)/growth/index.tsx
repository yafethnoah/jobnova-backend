import { Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { AppScreen } from '@/src/components/ui/AppScreen';
import { AppCard } from '@/src/components/ui/AppCard';
import { AppButton } from '@/src/components/ui/AppButton';
import { useAuth } from '@/src/features/auth/useAuth';
import { useProfile } from '@/src/hooks/useProfile';
import { growthApi } from '@/src/api/growth';

export default function GrowthHubScreen() {
  const { accessToken } = useAuth();
  const profile = useProfile();
  const planQuery = useQuery({
    queryKey: ['growth-plan', profile.data?.targetRole, profile.data?.summary],
    queryFn: () => growthApi.getPlan(accessToken, {
      role: profile.data?.targetRole,
      notes: profile.data?.summary
    })
  });

  const plan = planQuery.data;

  return (
    <AppScreen>
      <AppCard>
        <Text style={{ fontSize: 28, fontWeight: '900', color: '#F8FAFF' }}>Growth Hub</Text>
        <Text style={{ marginTop: 10, color: '#B8C4E4', lineHeight: 22 }}>
          This section helps JobNova grow with the user after the first job offer so the app feels like a long-term career guide.
        </Text>
      </AppCard>

      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: '800', color: '#F8FAFF' }}>First 90 days</Text>
        <View style={{ marginTop: 12, gap: 10 }}>
          {(plan?.first90Days || []).slice(0, 3).map((item, index) => (
            <Text key={`${item}-${index}`} style={{ color: '#B8C4E4', lineHeight: 22 }}>{index + 1}. {item}</Text>
          ))}
        </View>
      </AppCard>

      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: '800', color: '#F8FAFF' }}>Next-year roadmap</Text>
        <View style={{ marginTop: 12, gap: 10 }}>
          {(plan?.nextYearRoadmap || []).slice(0, 3).map((item, index) => (
            <Text key={`${item}-${index}`} style={{ color: '#B8C4E4', lineHeight: 22 }}>{index + 1}. {item}</Text>
          ))}
        </View>
      </AppCard>

      <View style={{ gap: 10 }}>
        <AppButton label="Open full 90-day plan" onPress={() => router.push('/(app)/growth/first-90')} />
        <AppButton label="Open financial wellness" variant="secondary" onPress={() => router.push('/(app)/growth/financial-wellness')} />
      </View>
    </AppScreen>
  );
}
