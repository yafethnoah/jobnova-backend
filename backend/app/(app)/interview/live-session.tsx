import { useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { Text, View } from 'react-native';

import { AppButton } from '@/src/components/ui/AppButton';
import { AppCard } from '@/src/components/ui/AppCard';
import { AppInput } from '@/src/components/ui/AppInput';
import { AppScreen } from '@/src/components/ui/AppScreen';
import { ErrorState } from '@/src/components/ui/ErrorState';
import { StatusChip } from '@/src/components/ui/StatusChip';
import { LoadingView } from '@/src/components/ui/LoadingView';
import { liveInterviewApi } from '@/src/api/liveInterview';
import { useAuth } from '@/src/features/auth/useAuth';
import { saveJson } from '@/src/lib/localCache';
import { LIVE_INTERVIEW_REPORT_CACHE_KEY } from '@/src/features/interview/interview.cache';
import type { VoiceInterviewSetup } from '@/src/features/interview/liveInterview.types';
import { colors } from '@/src/constants/colors';

type TurnCard = {
  question: string;
  answer: string;
  coachReply: string;
  nextQuestion: string | null;
  scores: { clarity: number; structure: number; relevance: number };
};

export default function LiveInterviewSessionScreen() {
  const { accessToken } = useAuth();
  const params = useLocalSearchParams<{
    sessionId: string;
    firstQuestion: string;
    totalQuestions: string;
    targetRole: string;
    companyName?: string;
    interviewType?: string;
    difficulty?: string;
    coachTone?: string;
    recruiterVoice?: string;
    speakerMode?: string;
    microphoneMode?: string;
    recordingQuality?: string;
    audioUrl?: string;
  }>();

  const [answerText, setAnswerText] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState(String(params.firstQuestion || ''));
  const [turns, setTurns] = useState<TurnCard[]>([]);
  const [latestAudioUrl, setLatestAudioUrl] = useState<string>(String(params.audioUrl || ''));

  const totalQuestions = Number(params.totalQuestions || 5);
  const completedTurns = turns.length;
  const progressLabel = `${Math.min(completedTurns + 1, totalQuestions)} / ${totalQuestions}`;

  const setup = useMemo<VoiceInterviewSetup>(() => ({
    targetRole: String(params.targetRole || ''),
    companyName: params.companyName ? String(params.companyName) : undefined,
    interviewType: (params.interviewType as any) || 'behavioral',
    difficulty: (params.difficulty as any) || 'medium',
    coachTone: (params.coachTone as any) || 'realistic',
    recruiterVoice: (params.recruiterVoice as any) || 'verse',
    speakerMode: (params.speakerMode as any) || 'auto',
    microphoneMode: (params.microphoneMode as any) || 'voice_preferred',
    recordingQuality: (params.recordingQuality as any) || 'high',
  }), [params]);

  const respondMutation = useMutation({
    mutationFn: () =>
      liveInterviewApi.respond(accessToken, String(params.sessionId || ''), {
        answerText: answerText.trim(),
        recruiterVoice: setup.recruiterVoice,
      }),
    onSuccess: (data: any) => {
      const nextTurn: TurnCard = {
        question: currentQuestion,
        answer: answerText.trim(),
        coachReply: String(data.coachReply || ''),
        nextQuestion: data.nextQuestion ? String(data.nextQuestion) : null,
        scores: {
          clarity: Number(data.feedback?.clarity || 0),
          structure: Number(data.feedback?.structure || 0),
          relevance: Number(data.feedback?.relevance || 0),
        },
      };

      setTurns((prev) => [...prev, nextTurn]);
      setAnswerText('');
      setLatestAudioUrl(typeof data.audioUrl === 'string' ? data.audioUrl : '');

      if (data.isComplete) {
        completeMutation.mutate();
        return;
      }

      setCurrentQuestion(String(data.nextQuestion || ''));
    },
  });

  const completeMutation = useMutation({
    mutationFn: () => liveInterviewApi.complete(accessToken, String(params.sessionId || ''), setup),
    onSuccess: async (data) => {
      await saveJson(LIVE_INTERVIEW_REPORT_CACHE_KEY, data);
      router.replace({
        pathname: '/(app)/interview/live-report',
        params: {
          sessionId: String(params.sessionId || ''),
          targetRole: setup.targetRole,
          companyName: setup.companyName || '',
          interviewType: setup.interviewType,
          difficulty: setup.difficulty,
          coachTone: setup.coachTone,
        },
      });
    },
  });

  if (completeMutation.isPending) {
    return <LoadingView label='Generating your recruiter-style interview report...' />;
  }

  return (
    <AppScreen>
      <Text style={{ fontSize: 30, fontWeight: '800', color: colors.text }}>Live recruiter interview</Text>
      <Text style={{ fontSize: 16, lineHeight: 24, color: colors.muted }}>
        This flow keeps the interview structured, realistic, and recruiter-style. For the most human sound, keep live API mode on and make sure your backend has an OpenAI API key configured.
      </Text>

      <AppCard>
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <StatusChip label={setup.targetRole || 'Target role missing'} tone='primary' />
            <StatusChip label={`Question ${progressLabel}`} tone='neutral' />
            <StatusChip label={setup.recruiterVoice || 'verse'} tone='success' />
            <StatusChip label={latestAudioUrl ? 'AI voice ready' : 'Audio optional'} tone={latestAudioUrl ? 'success' : 'warning'} />
          </View>
          <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>Current question</Text>
          <Text style={{ color: colors.text, lineHeight: 26, fontSize: 17 }}>{currentQuestion}</Text>
          {latestAudioUrl ? (
            <Text style={{ color: colors.primarySoft, lineHeight: 22 }}>
              Recruiter audio was generated on the backend for this turn. If you want automatic playback next, wire this screen to your preferred audio player.
            </Text>
          ) : null}
        </View>
      </AppCard>

      <AppCard>
        <View style={{ gap: 16 }}>
          <AppInput
            label='Your answer'
            value={answerText}
            onChangeText={setAnswerText}
            placeholder='Answer as if you were speaking to a real recruiter.'
            multiline
            autoCapitalize='sentences'
          />
          <AppButton
            label={respondMutation.isPending ? 'Sending answer...' : 'Submit answer'}
            onPress={() => answerText.trim() && respondMutation.mutate()}
            disabled={respondMutation.isPending || completeMutation.isPending || !answerText.trim()}
          />
          <AppButton label='Exit session' variant='secondary' onPress={() => router.back()} disabled={respondMutation.isPending || completeMutation.isPending} />
        </View>
      </AppCard>

      {respondMutation.isError ? (
        <ErrorState
          title='Could not process answer'
          message={respondMutation.error instanceof Error ? respondMutation.error.message : 'Unknown error'}
        />
      ) : null}

      {turns.length ? (
        <AppCard>
          <View style={{ gap: 12 }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>Latest recruiter feedback</Text>
            {(() => {
              const latest = turns[turns.length - 1];
              return (
                <>
                  <Text style={{ color: colors.muted, lineHeight: 22 }}>{latest.coachReply}</Text>
                  <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                    <StatusChip label={`Clarity ${latest.scores.clarity}/10`} tone='primary' />
                    <StatusChip label={`Structure ${latest.scores.structure}/10`} tone='warning' />
                    <StatusChip label={`Relevance ${latest.scores.relevance}/10`} tone='success' />
                  </View>
                </>
              );
            })()}
          </View>
        </AppCard>
      ) : null}
    </AppScreen>
  );
}
