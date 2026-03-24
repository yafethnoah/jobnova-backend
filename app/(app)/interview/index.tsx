import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { AppButton } from '@/src/components/ui/AppButton';
import { AppCard } from '@/src/components/ui/AppCard';
import { AppScreen } from '@/src/components/ui/AppScreen';
import { StatusChip } from '@/src/components/ui/StatusChip';
import { useCachedJson } from '@/src/hooks/useCachedJson';
import { INTERVIEW_HISTORY_CACHE_KEY, LIVE_INTERVIEW_REPORT_CACHE_KEY } from '@/src/features/interview/interview.cache';
import type { VoiceInterviewReport } from '@/src/features/interview/liveInterview.types';
import { colors } from '@/src/constants/colors';

function PracticeCard({ title, detail, cta, onPress }: { title: string; detail: string; cta: string; onPress: () => void }) {
  return (
    <AppCard>
      <View style={{ gap: 12 }}>
        <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>{title}</Text>
        <Text style={{ color: colors.muted, lineHeight: 22 }}>{detail}</Text>
        <AppButton label={cta} onPress={onPress} />
      </View>
    </AppCard>
  );
}

export default function InterviewScreen() {
  const { data: history } = useCachedJson<{ role: string; completedAt: string; average: number }[]>(INTERVIEW_HISTORY_CACHE_KEY);
  const { data: latestVoice } = useCachedJson<VoiceInterviewReport>(LIVE_INTERVIEW_REPORT_CACHE_KEY);
  const latestAverage = history?.length ? Math.round(history.reduce((sum, item) => sum + item.average, 0) / history.length) : null;

  return (
    <AppScreen>
      <Text style={{ fontSize: 30, fontWeight: '800', color: colors.text }}>Practice</Text>
      <Text style={{ fontSize: 16, color: colors.muted, lineHeight: 24 }}>
        Build confidence with short structured sessions, role-focused practice, or realistic voice rehearsal before the real interview arrives.
      </Text>

      <AppCard>
        <View style={{ gap: 12 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>Your progress</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <StatusChip label={history?.length ? `${history.length} saved session${history.length === 1 ? '' : 's'}` : 'No saved sessions yet'} tone={history?.length ? 'success' : 'warning'} />
            <StatusChip label={latestAverage !== null ? `Average ${latestAverage}%` : 'No score yet'} tone={latestAverage !== null && latestAverage >= 75 ? 'success' : 'primary'} />
            <StatusChip label={latestVoice ? 'Voice report ready' : 'Voice report pending'} tone={latestVoice ? 'success' : 'neutral'} />
          </View>
          {latestVoice?.summary ? <Text style={{ color: colors.muted, lineHeight: 22 }}>{latestVoice.summary}</Text> : <Text style={{ color: colors.muted, lineHeight: 22 }}>Practice gets stronger when you review one answer, improve it, and repeat with more structure.</Text>}
        </View>
      </AppCard>

      <PracticeCard
        title="Quick practice"
        detail="Run a short five-question session to strengthen clarity, structure, and confidence without friction."
        cta="Start 5-question practice"
        onPress={() => router.push('/(app)/interview/session')}
      />

      <PracticeCard
        title="Job-specific rehearsal"
        detail="Use your active target role to practice stronger examples, better STAR stories, and clearer role alignment."
        cta="Review latest feedback"
        onPress={() => router.push('/(app)/interview/feedback')}
      />

      <PracticeCard
        title="Voice simulation"
        detail="Simulate a recruiter conversation, review the transcript, and study a stronger improved answer afterward."
        cta="Start voice simulation"
        onPress={() => router.push('/(app)/interview/live-lobby')}
      />

      <AppButton label="Open latest voice report" variant="secondary" onPress={() => router.push('/(app)/interview/live-report')} />
    </AppScreen>
  );
}
