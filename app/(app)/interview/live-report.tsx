import { useEffect } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { Text, View } from 'react-native';
import { AppCard } from '@/src/components/ui/AppCard';
import { AppScreen } from '@/src/components/ui/AppScreen';
import { LoadingView } from '@/src/components/ui/LoadingView';
import { ErrorState } from '@/src/components/ui/ErrorState';
import { useAuth } from '@/src/features/auth/useAuth';
import { liveInterviewApi } from '@/src/api/liveInterview';
import { saveJson } from '@/src/lib/localCache';
import { LIVE_INTERVIEW_REPORT_CACHE_KEY } from '@/src/features/interview/interview.cache';
import type { VoiceInterviewReport } from '@/src/features/interview/liveInterview.types';

export default function LiveInterviewReportScreen() {
  const { accessToken } = useAuth();
  const params = useLocalSearchParams<{ sessionId: string; targetRole: string; companyName?: string; interviewType: any; difficulty: any; coachTone: any }>();
  const mutation = useMutation({
    mutationFn: () => liveInterviewApi.complete(accessToken, params.sessionId, {
      targetRole: String(params.targetRole || ''),
      companyName: params.companyName ? String(params.companyName) : undefined,
      interviewType: (params.interviewType as any) || 'behavioral',
      difficulty: (params.difficulty as any) || 'medium',
      coachTone: (params.coachTone as any) || 'realistic'
    }),
    onSuccess: async (data) => saveJson(LIVE_INTERVIEW_REPORT_CACHE_KEY, data)
  });

  const { mutate } = mutation;

  useEffect(() => {
    mutate();
  }, [mutate]);

  if (mutation.isPending) return <LoadingView label="Generating written outcome report..." />;
  if (mutation.isError) return <AppScreen><ErrorState title="Could not generate report" message={mutation.error instanceof Error ? mutation.error.message : 'Unknown error'} /></AppScreen>;
  if (!mutation.data) return null;

  return <ReportView data={mutation.data} />;
}

function ReportView({ data }: { data: VoiceInterviewReport }) {
  return (
    <AppScreen>
      <Text style={{ fontSize: 30, fontWeight: '800', color: '#FFFFFF' }}>Written outcome report</Text>
      <Text style={{ fontSize: 16, lineHeight: 24, color: '#96A7DE' }}>
        This is the written coaching layer from the voice interview training: summary, strengths, improvements, transcript, stronger answer, and next practice steps.
      </Text>
      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>Overall summary</Text>
        <Text style={{ marginTop: 10, lineHeight: 24, color: '#C8D3F5' }}>{data.summary}</Text>
      </AppCard>
      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>Scores</Text>
        <View style={{ marginTop: 10, gap: 8 }}>
          <Text style={{ color: '#C8D3F5' }}>Clarity: {data.scores.clarity}/100</Text>
          <Text style={{ color: '#C8D3F5' }}>Relevance: {data.scores.relevance}/100</Text>
          <Text style={{ color: '#C8D3F5' }}>STAR: {data.scores.star}/100</Text>
          <Text style={{ color: '#C8D3F5' }}>Confidence: {data.scores.confidence}/100</Text>
          <Text style={{ color: '#C8D3F5' }}>Filler words detected: {data.fillerWordCount}</Text>
        </View>
      </AppCard>
      <ListCard title="Strengths" items={data.strengths} />
      <ListCard title="Improvement areas" items={data.improvementAreas} />
      <ListCard title="Personalized tips" items={data.personalizedTips} />
      <ListCard title="Next practice plan" items={data.nextPracticePlan} />
      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>Suggested stronger answer</Text>
        <Text style={{ marginTop: 10, lineHeight: 24, color: '#C8D3F5' }}>{data.suggestedImprovedAnswer}</Text>
      </AppCard>
      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>Transcript</Text>
        <View style={{ marginTop: 10, gap: 10 }}>{data.transcript.map((turn, index) => <Text key={index} style={{ color: turn.speaker === 'coach' ? '#2EA4FF' : '#C8D3F5', lineHeight: 24 }}>{turn.speaker === 'coach' ? 'Coach' : 'You'}: {turn.text}</Text>)}</View>
      </AppCard>
    </AppScreen>
  );
}

function ListCard({ title, items }: { title: string; items: string[] }) {
  return (
    <AppCard>
      <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>{title}</Text>
      <View style={{ marginTop: 10, gap: 8 }}>{items.map((item, index) => <Text key={index} style={{ color: '#C8D3F5', lineHeight: 24 }}>• {item}</Text>)}</View>
    </AppCard>
  );
}
