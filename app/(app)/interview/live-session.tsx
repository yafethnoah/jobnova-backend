import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';

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
import { env } from '@/src/lib/env';

type TurnCard = {
  question: string;
  answer: string;
  coachReply: string;
  nextQuestion: string | null;
  audioUrl?: string | null;
  scores: { clarity: number; structure: number; relevance: number };
  improvements: string[];
  confidenceHint?: string;
};

function resolveAudioUrl(url?: string | null) {
  const value = String(url || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return `${env.apiBaseUrl}${value.startsWith('/') ? value : `/${value}`}`;
}

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
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPreparingRecorder, setIsPreparingRecorder] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);

  const soundRef = useRef<Audio.Sound | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);

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

  const stopPlayback = useCallback(async () => {
    Speech.stop();
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch (_) {}
      soundRef.current = null;
    }
    setIsPlayingAudio(false);
  }, []);

  const speakRecruiter = useCallback(async (text: string, audioUrl?: string | null) => {
    const message = String(text || '').trim();
    const resolvedAudioUrl = resolveAudioUrl(audioUrl);

    await stopPlayback();

    if (setup.speakerMode !== 'device_voice' && resolvedAudioUrl) {
      try {
        setIsPlayingAudio(true);
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          allowsRecordingIOS: false,
        });
        const { sound } = await Audio.Sound.createAsync(
          { uri: resolvedAudioUrl },
          { shouldPlay: true },
          (status) => {
            if (!status.isLoaded) return;
            if (status.didJustFinish) {
              setIsPlayingAudio(false);
            }
          }
        );
        soundRef.current = sound;
        return;
      } catch (error) {
        console.log('AI audio playback failed, using device speech fallback.', error);
      }
    }

    if (message && setup.speakerMode !== 'ai_voice') {
      setIsPlayingAudio(true);
      Speech.speak(message, {
        language: 'en-US',
        pitch: 1.0,
        rate: 0.95,
        onDone: () => setIsPlayingAudio(false),
        onStopped: () => setIsPlayingAudio(false),
        onError: () => setIsPlayingAudio(false),
      });
    }
  }, [setup.speakerMode, stopPlayback]);

  useEffect(() => {
    return () => {
      stopPlayback();
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => undefined);
        recordingRef.current = null;
      }
    };
  }, [stopPlayback]);

  useEffect(() => {
    const introText = currentQuestion;
    if (!introText) return;
    const timer = setTimeout(() => {
      speakRecruiter(introText, latestAudioUrl).catch(() => undefined);
    }, 350);
    return () => clearTimeout(timer);
  }, [currentQuestion, latestAudioUrl, speakRecruiter]);

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

  const respondMutation = useMutation({
    mutationFn: (payload: { answerText?: string; audioUri?: string; audioMimeType?: string }) =>
      liveInterviewApi.respond(accessToken, String(params.sessionId || ''), {
        ...payload,
        recruiterVoice: setup.recruiterVoice,
      }),
    onSuccess: async (data: any) => {
      const nextTurn: TurnCard = {
        question: currentQuestion,
        answer: String(data.transcribedText || data.answerText || answerText || '').trim(),
        coachReply: String(data.coachReply || ''),
        nextQuestion: data.nextQuestion ? String(data.nextQuestion) : null,
        audioUrl: typeof data.audioUrl === 'string' ? data.audioUrl : '',
        scores: {
          clarity: Number(data.feedback?.clarity || 0),
          structure: Number(data.feedback?.structure || 0),
          relevance: Number(data.feedback?.relevance || 0),
        },
        improvements: Array.isArray(data.feedback?.improvements) ? data.feedback.improvements.map(String) : [],
        confidenceHint: typeof data.feedback?.confidenceHint === 'string' ? data.feedback.confidenceHint : '',
      };

      setTurns((prev) => [...prev, nextTurn]);
      setAnswerText('');
      setLatestAudioUrl(typeof data.audioUrl === 'string' ? data.audioUrl : '');

      const spokenFollowUp = [String(data.coachReply || '').trim(), String(data.nextQuestion || '').trim()].filter(Boolean).join(' ');

      if (data.isComplete) {
        await speakRecruiter(spokenFollowUp || 'Great work. I am generating your interview report now.', data.audioUrl);
        completeMutation.mutate();
        return;
      }

      setCurrentQuestion(String(data.nextQuestion || ''));
      await speakRecruiter(spokenFollowUp || String(data.nextQuestion || ''), data.audioUrl);
    },
  });

  const startRecording = useCallback(async () => {
    try {
      setRecordingError(null);
      setIsPreparingRecorder(true);
      await stopPlayback();
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        setRecordingError('Microphone permission is required for live voice interviews.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      const options = setup.recordingQuality === 'high'
        ? Audio.RecordingOptionsPresets.HIGH_QUALITY
        : Audio.RecordingOptionsPresets.LOW_QUALITY;

      const { recording } = await Audio.Recording.createAsync(options);
      recordingRef.current = recording;
      setIsRecording(true);
    } catch (error) {
      console.error(error);
      setRecordingError(error instanceof Error ? error.message : 'Could not start microphone recording.');
    } finally {
      setIsPreparingRecorder(false);
    }
  }, [setup.recordingQuality, stopPlayback]);

  const stopRecordingAndSubmit = useCallback(async () => {
    const currentRecording = recordingRef.current;
    if (!currentRecording) return;

    try {
      setRecordingError(null);
      setIsRecording(false);
      await currentRecording.stopAndUnloadAsync();
      const uri = currentRecording.getURI();
      recordingRef.current = null;

      if (!uri) {
        throw new Error('Recording file was not created.');
      }

      respondMutation.mutate({
        audioUri: uri,
        audioMimeType: Platform.OS === 'ios' ? 'audio/x-m4a' : 'audio/m4a',
      });
    } catch (error) {
      console.error(error);
      setRecordingError(error instanceof Error ? error.message : 'Could not finish the recording.');
    } finally {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      }).catch(() => undefined);
    }
  }, [respondMutation]);

  const submitTypedAnswer = useCallback(() => {
    if (!answerText.trim()) return;
    respondMutation.mutate({ answerText: answerText.trim() });
  }, [answerText, respondMutation]);

  if (completeMutation.isPending) {
    return <LoadingView label='Generating your recruiter-style interview report...' />;
  }

  const latestTurn = turns.length ? turns[turns.length - 1] : null;
  const typedModeEnabled = setup.microphoneMode !== 'voice_only';
  const voiceModeEnabled = setup.microphoneMode !== 'text_fallback';

  return (
    <AppScreen scroll={false}>
      <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 30, fontWeight: '800', color: colors.text }}>Live AI interview coach</Text>
        <Text style={{ fontSize: 16, lineHeight: 24, color: colors.muted }}>
          This session is designed to feel like a real recruiter screen: the question is spoken, your answer can be typed or recorded, and every turn returns direct coaching plus the next question.
        </Text>

        <AppCard>
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <StatusChip label={setup.targetRole || 'Target role missing'} tone='primary' />
              <StatusChip label={`Question ${progressLabel}`} tone='neutral' />
              <StatusChip label={setup.recruiterVoice || 'verse'} tone='success' />
              <StatusChip label={isPlayingAudio ? 'Recruiter speaking' : 'Recruiter ready'} tone={isPlayingAudio ? 'success' : 'neutral'} />
              <StatusChip label={voiceModeEnabled ? 'Mic enabled' : 'Text only'} tone={voiceModeEnabled ? 'success' : 'warning'} />
            </View>
            <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>Current recruiter question</Text>
            <Text style={{ color: colors.text, lineHeight: 26, fontSize: 17 }}>{currentQuestion}</Text>
            <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
              <AppButton label={isPlayingAudio ? 'Stop voice' : 'Replay recruiter'} variant='secondary' onPress={() => isPlayingAudio ? stopPlayback() : speakRecruiter(currentQuestion, latestAudioUrl)} />
              {voiceModeEnabled ? (
                <AppButton
                  label={isRecording ? 'Stop and send recording' : isPreparingRecorder ? 'Preparing mic...' : 'Record answer'}
                  onPress={() => (isRecording ? stopRecordingAndSubmit() : startRecording())}
                  disabled={isPreparingRecorder || respondMutation.isPending || completeMutation.isPending}
                />
              ) : null}
            </View>
            {recordingError ? <Text style={{ color: '#F7A6A6', lineHeight: 22 }}>{recordingError}</Text> : null}
          </View>
        </AppCard>

        {typedModeEnabled ? (
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
                label={respondMutation.isPending ? 'Sending answer...' : 'Submit typed answer'}
                onPress={submitTypedAnswer}
                disabled={respondMutation.isPending || completeMutation.isPending || !answerText.trim()}
              />
            </View>
          </AppCard>
        ) : null}

        <AppCard>
          <View style={{ gap: 10 }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>Session controls</Text>
            <AppButton label='Exit session' variant='secondary' onPress={() => {
              if (isRecording) {
                Alert.alert('Recording in progress', 'Stop the recording before exiting the session.');
                return;
              }
              router.back();
            }} disabled={respondMutation.isPending || completeMutation.isPending} />
          </View>
        </AppCard>

        {respondMutation.isError ? (
          <ErrorState
            title='Could not process answer'
            message={respondMutation.error instanceof Error ? respondMutation.error.message : 'The recruiter could not process this answer. Try again or switch to typed answer.'}
          />
        ) : null}

        {latestTurn ? (
          <AppCard>
            <View style={{ gap: 12 }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>Latest recruiter feedback</Text>
              <Text style={{ color: colors.muted, lineHeight: 22 }}>{latestTurn.coachReply}</Text>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                <StatusChip label={`Clarity ${latestTurn.scores.clarity}/10`} tone='primary' />
                <StatusChip label={`Structure ${latestTurn.scores.structure}/10`} tone='warning' />
                <StatusChip label={`Relevance ${latestTurn.scores.relevance}/10`} tone='success' />
              </View>
              {latestTurn.confidenceHint ? <Text style={{ color: colors.muted, lineHeight: 22 }}>Confidence cue: {latestTurn.confidenceHint}</Text> : null}
              {latestTurn.improvements?.length ? (
                <View style={{ gap: 6 }}>
                  {latestTurn.improvements.slice(0, 3).map((item, index) => (
                    <Text key={`${index}-${item}`} style={{ color: '#C8D3F5', lineHeight: 22 }}>• {item}</Text>
                  ))}
                </View>
              ) : null}
            </View>
          </AppCard>
        ) : null}

        {turns.length ? (
          <AppCard>
            <View style={{ gap: 12 }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>Conversation timeline</Text>
              {turns.map((turn, index) => (
                <View key={`${index}-${turn.question}`} style={{ gap: 8, paddingBottom: 12, borderBottomWidth: index === turns.length - 1 ? 0 : 1, borderBottomColor: '#223252' }}>
                  <Text style={{ color: colors.primarySoft, fontWeight: '800' }}>Recruiter</Text>
                  <Text style={{ color: colors.text, lineHeight: 22 }}>{turn.question}</Text>
                  <Text style={{ color: colors.primarySoft, fontWeight: '800', marginTop: 4 }}>You</Text>
                  <Text style={{ color: colors.muted, lineHeight: 22 }}>{turn.answer}</Text>
                </View>
              ))}
            </View>
          </AppCard>
        ) : null}
      </ScrollView>
    </AppScreen>
  );
}
