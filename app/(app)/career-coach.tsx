import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { AppScreen } from '@/src/components/ui/AppScreen';
import { AppCard } from '@/src/components/ui/AppCard';
import { AppButton } from '@/src/components/ui/AppButton';
import { StatusChip } from '@/src/components/ui/StatusChip';
import { useAuth } from '@/src/features/auth/useAuth';
import { useProfile } from '@/src/hooks/useProfile';
import { coachApi } from '@/src/api/coach';

const phaseOptions = [
  { value: 'before', label: 'Before applying' },
  { value: 'during', label: 'During the search' },
  { value: 'after', label: 'After getting hired' }
] as const;

export default function CareerCoachScreen() {
  const { accessToken } = useAuth();
  const profile = useProfile();
  const [phase, setPhase] = useState<'before' | 'during' | 'after'>('during');

  const goal = useMemo(() => {
    if (phase === 'before') return 'clarify direction and become employer-ready';
    if (phase === 'after') return 'perform strongly and build long-term stability';
    return 'win interviews for a stable role';
  }, [phase]);

  const sessionQuery = useQuery({
    queryKey: ['coach-session', phase, profile.data?.targetRole, profile.data?.summary],
    queryFn: () => coachApi.createSession(accessToken, {
      phase,
      goal,
      targetRole: profile.data?.targetRole,
      notes: profile.data?.summary
    })
  });

  const session = sessionQuery.data;

  return (
    <AppScreen>
      <AppCard>
        <Text style={{ fontSize: 28, fontWeight: '900', color: '#F8FAFF' }}>AI Career Coach</Text>
        <Text style={{ marginTop: 10, color: '#B8C4E4', lineHeight: 22 }}>
          JobNova now coaches the full journey: prepare, compete, then thrive after getting hired.
        </Text>
      </AppCard>

      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: '800', color: '#F8FAFF' }}>Choose your phase</Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          {phaseOptions.map((item) => (
            <StatusChip key={item.value} label={item.label} tone={item.value === phase ? 'primary' : 'neutral'} />
          ))}
        </View>
        <View style={{ marginTop: 12, gap: 10 }}>
          {phaseOptions.map((item) => (
            <AppButton key={item.value} label={item.label} variant={item.value === phase ? 'primary' : 'secondary'} onPress={() => setPhase(item.value)} />
          ))}
        </View>
      </AppCard>

      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: '800', color: '#F8FAFF' }}>Diagnosis</Text>
        <Text style={{ marginTop: 10, color: '#B8C4E4', lineHeight: 22 }}>
          {sessionQuery.isLoading ? 'Thinking through your next best move...' : session?.diagnosis || 'No coaching session yet.'}
        </Text>
      </AppCard>

      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: '800', color: '#F8FAFF' }}>Priority moves</Text>
        <View style={{ marginTop: 12, gap: 10 }}>
          {(session?.priorities || []).map((item, index) => (
            <Text key={`${item}-${index}`} style={{ color: '#B8C4E4', lineHeight: 22 }}>{index + 1}. {item}</Text>
          ))}
        </View>
      </AppCard>

      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: '800', color: '#F8FAFF' }}>Immediate action</Text>
        <Text style={{ marginTop: 10, color: '#F8FAFF', lineHeight: 22 }}>{session?.nextAction || 'Loading next action...'}</Text>
        <Text style={{ marginTop: 10, color: '#B8C4E4', lineHeight: 22 }}>{session?.encouragement || ''}</Text>
      </AppCard>

      <View style={{ gap: 10 }}>
        <AppButton label="Open growth plan" onPress={() => router.push('/(app)/growth')} />
        <AppButton label="Open market intelligence" variant="secondary" onPress={() => router.push('/(app)/resources')} />
      </View>
    </AppScreen>
  );
}
