import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { AppButton } from '@/src/components/ui/AppButton';
import { AppCard } from '@/src/components/ui/AppCard';
import { AppScreen } from '@/src/components/ui/AppScreen';
import { useCachedJson } from '@/src/hooks/useCachedJson';
import { INTERVIEW_HISTORY_CACHE_KEY, LIVE_INTERVIEW_REPORT_CACHE_KEY } from '@/src/features/interview/interview.cache';
import type { VoiceInterviewReport } from '@/src/features/interview/liveInterview.types';

export default function InterviewScreen() {
  const { data: history } = useCachedJson<Array<{ role: string; completedAt: string; average: number }>>(INTERVIEW_HISTORY_CACHE_KEY);
  const { data: latestVoice } = useCachedJson<VoiceInterviewReport>(LIVE_INTERVIEW_REPORT_CACHE_KEY);

  return (
    <AppScreen>
      <Text style={{ fontSize: 30, fontWeight: '800', color: '#FFFFFF' }}>Interview Coach</Text>
      <Text style={{ fontSize: 16, color: '#96A7DE', lineHeight: 24 }}>
        Practice is clearer in V12: one lane for structured text coaching, one lane for realistic voice rehearsal.
      </Text>

      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>Practice lanes</Text>
        <View style={{ marginTop: 12, gap: 10 }}>
          <Text style={{ color: '#C8D3F5', lineHeight: 22 }}>Text practice helps the user tighten structure, examples, and answer quality across a five-question role-based session.</Text>
          <Text style={{ color: '#C8D3F5', lineHeight: 22 }}>Voice practice simulates a live recruiter conversation and generates a written report, transcript, and improvement guidance.</Text>
        </View>
      </AppCard>

      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>Recent activity</Text>
        <Text style={{ marginTop: 10, color: '#C8D3F5' }}>{history?.length ? `${history.length} saved text practice session${history.length === 1 ? '' : 's'}` : 'No saved text practice sessions yet.'}</Text>
        <Text style={{ marginTop: 8, color: '#C8D3F5' }}>Voice report: {latestVoice ? 'Available' : 'Not generated yet'}</Text>
      </AppCard>

      <AppButton label="Start structured practice session" onPress={() => router.push('/(app)/interview/session')} />
      <AppButton label="Start live voice interview" variant="secondary" onPress={() => router.push('/(app)/interview/live-lobby')} />
      <AppButton label="Open last voice report" variant="secondary" onPress={() => router.push('/(app)/interview/live-report')} />
    </AppScreen>
  );
}
