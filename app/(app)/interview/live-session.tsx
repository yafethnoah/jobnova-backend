import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import {
  AudioModule,
  createAudioPlayer,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
import * as Speech from 'expo-speech';
import { Pressable, Text, View } from 'react-native';

import { AppButton } from '@/src/components/ui/AppButton';
import { AppCard } from '@/src/components/ui/AppCard';
import { AppInput } from '@/src/components/ui/AppInput';
import { AppScreen } from '@/src/components/ui/AppScreen';
import { ErrorState } from '@/src/components/ui/ErrorState';
import { SelectionChips } from '@/src/components/ui/SelectionChips';
import { colors } from '@/src/constants/colors';
import { useAuth } from '@/src/features/auth/useAuth';
import { liveInterviewApi } from '@/src/api/liveInterview';
import { env } from '@/src/lib/env';

type MicrophoneMode = 'voice_preferred' | 'voice_only' | 'text_fallback';
type SpeakerMode = 'ai_voice' | 'auto' | 'device_voice' | 'muted';
type RecordingQuality = 'standard' | 'high';
type RecruiterVoice = 'verse' | 'alloy' | 'nova';

type LiveInterviewFeedback = {
  clarity: number;
  structure: number;
  relevance: number;
  strength: string;
  strongerSampleAnswer?: string;
};

type LiveInterviewTurnResponse = {
  coachReply: string;
  nextQuestion?: string;
  audioUrl?: string | null;
  transcribedText: string;
  isComplete?: boolean;
  feedback: LiveInterviewFeedback;
};

const API_BASE_URL = env.apiBaseUrl;

const RECORDING_OPTIONS = {
  standard: RecordingPresets.LOW_QUALITY,
  high: RecordingPresets.HIGH_QUALITY,
} as const;

function getAudioMimeType() {
  return 'audio/mp4';
}

function resolveAudioUrl(audioUrl?: string | null) {
  if (!audioUrl) return null;
  if (audioUrl.startsWith('http://') || audioUrl.startsWith('https://')) {
    return audioUrl;
  }
  return `${API_BASE_URL}${audioUrl}`;
}

export default function LiveInterviewSessionScreen() {
  const params = useLocalSearchParams<{
    sessionId?: string;
    firstQuestion?: string;
    totalQuestions?: string;
    targetRole?: string;
    companyName?: string;
    interviewType?: string;
    difficulty?: string;
    coachTone?: string;
    audioUrl?: string;
    recruiterVoice?: string;
    speakerMode?: string;
    microphoneMode?: string;
    recordingQuality?: string;
  }>();

  const { accessToken } = useAuth();

  const [isSessionStarted, setIsSessionStarted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [manualAnswer, setManualAnswer] = useState('');
  const [turns, setTurns] = useState<LiveInterviewTurnResponse[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [lastTranscript, setLastTranscript] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [showTranscript, setShowTranscript] = useState(false);

  const [speakerMode, setSpeakerMode] = useState<SpeakerMode>(
    (String(params.speakerMode || 'ai_voice') as SpeakerMode) || 'ai_voice'
  );
  const [microphoneMode, setMicrophoneMode] = useState<MicrophoneMode>(
    (String(params.microphoneMode || 'voice_preferred') as MicrophoneMode) ||
      'voice_preferred'
  );
  const [recordingQuality, setRecordingQuality] = useState<RecordingQuality>(
    (String(params.recordingQuality || 'high') as RecordingQuality) || 'high'
  );
  const [recruiterVoice, setRecruiterVoice] = useState<RecruiterVoice>(
    (String(params.recruiterVoice || 'verse') as RecruiterVoice) || 'verse'
  );

  const playerRef = useRef<any>(null);
  const recorder = useAudioRecorder(RECORDING_OPTIONS[recordingQuality]);

  const totalQuestions = Number(params.totalQuestions || 5);
  const currentNumber = Math.min(turns.length + 1, totalQuestions);
  const latestTurn = turns[turns.length - 1];
  const liveComplete = useMemo(() => Boolean(latestTurn?.isComplete), [latestTurn]);
  const showManualInput = microphoneMode !== 'voice_only';

  const stopAllAudio = useCallback(async () => {
    try {
      Speech.stop();
    } catch {}

    try {
      playerRef.current?.pause?.();
      playerRef.current?.remove?.();
      playerRef.current = null;
    } catch {}
  }, []);

  const speakLocally = useCallback(
    async (text?: string | null) => {
      if (!text || !voiceEnabled || speakerMode === 'muted') return;

      try {
        Speech.stop();
        Speech.speak(text, {
          rate: 0.96,
          pitch: 1,
          language: 'en-CA',
        });
      } catch {}
    },
    [speakerMode, voiceEnabled]
  );

  const playCoachVoice = useCallback(
    async (audioUrl?: string | null, fallbackText?: string | null) => {
      if (!voiceEnabled || speakerMode === 'muted') return;

      if (speakerMode === 'device_voice') {
        await speakLocally(fallbackText);
        return;
      }

      const fullUrl = resolveAudioUrl(audioUrl);

      if (fullUrl) {
        try {
          await stopAllAudio();

          await setAudioModeAsync({
            allowsRecording: false,
            playsInSilentMode: true,
            shouldPlayInBackground: false,
            interruptionMode: 'duckOthers',
          } as any);

          const player = createAudioPlayer(fullUrl);
          playerRef.current = player;

          try {
            player.volume = 1;
          } catch {}

          try {
            player.playbackRate = 1;
          } catch {}

          player.play();
          return;
        } catch {
          if (speakerMode === 'ai_voice') return;
        }
      }

      if (speakerMode !== 'ai_voice') {
        await speakLocally(fallbackText);
      }
    },
    [speakerMode, speakLocally, stopAllAudio, voiceEnabled]
  );

  const startInterview = useCallback(async () => {
    const firstQuestion = String(
      params.firstQuestion || 'Tell me about yourself and your professional background.'
    );

    setCurrentQuestion(firstQuestion);
    await playCoachVoice(String(params.audioUrl || ''), firstQuestion);
  }, [params.audioUrl, params.firstQuestion, playCoachVoice]);

  useEffect(() => {
    return () => {
      void stopAllAudio();
    };
  }, [stopAllAudio]);

  const respondMutation = useMutation({
    mutationFn: (payload: {
      answerText?: string;
      audioUri?: string;
      audioMimeType?: string;
    }) => {
      const sessionId = String(params.sessionId || '');
      return liveInterviewApi.respond(accessToken, sessionId, {
        ...payload,
        recruiterVoice,
      });
    },
    onSuccess: async (data: LiveInterviewTurnResponse) => {
      setTurns((prev) => [...prev, data]);
      setLastTranscript(data.transcribedText || '');
      if (data.nextQuestion) {
        setCurrentQuestion(data.nextQuestion);
      }
      setManualAnswer('');

      const spokenText = [data.coachReply, data.nextQuestion]
        .filter(Boolean)
        .join(' ');

      await playCoachVoice(data.audioUrl, spokenText);

      if (data.isComplete) {
        router.replace({
          pathname: '/(app)/interview/live-report',
          params: {
            sessionId: String(params.sessionId || ''),
            targetRole: String(params.targetRole || ''),
            companyName: String(params.companyName || ''),
            interviewType: String(params.interviewType || 'behavioral'),
            difficulty: String(params.difficulty || 'medium'),
            coachTone: String(params.coachTone || 'realistic'),
          },
        });
      }
    },
  });

  async function beginRecording() {
    const permission = await AudioModule.requestRecordingPermissionsAsync();

    if (!permission.granted) {
      throw new Error('Microphone permission is required for voice training.');
    }

    await stopAllAudio();

    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: 'duckOthers',
    } as any);

    await recorder.prepareToRecordAsync();
    recorder.record();
    setIsRecording(true);
  }

  async function stopRecording() {
    if (!isRecording) return;

    await recorder.stop();
    const uri = recorder.uri;
    setIsRecording(false);

    await setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: 'duckOthers',
    } as any);

    if (uri) {
      respondMutation.mutate({
        audioUri: uri,
        audioMimeType: getAudioMimeType(),
      });
    }
  }

  function submitManual() {
    if (!manualAnswer.trim()) return;

    respondMutation.mutate({
      answerText: manualAnswer.trim(),
    });
  }

  if (!isSessionStarted) {
    return (
      <AppScreen>
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            gap: 18,
          }}
        >
          <AppCard>
            <Text style={{ fontSize: 30, fontWeight: '800', color: '#FFFFFF' }}>
              Ready for your live interview?
            </Text>

            <Text
              style={{
                marginTop: 10,
                fontSize: 16,
                lineHeight: 24,
                color: '#96A7DE',
              }}
            >
              The recruiter will ask the first question out loud. Then you can
              answer by voice, replay the recruiter, or use typed fallback if needed.
            </Text>

            <View
              style={{
                marginTop: 16,
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <Badge label={`Voice ${recruiterVoice}`} />
              <Badge label={`Playback ${speakerMode.replace('_', ' ')}`} />
              <Badge label={`Mic ${microphoneMode.replace('_', ' ')}`} />
              <Badge label={`Quality ${recordingQuality}`} />
            </View>

            <View style={{ marginTop: 18 }}>
              <AppButton
                label="Start interview"
                onPress={async () => {
                  setIsSessionStarted(true);
                  await startInterview();
                }}
              />
            </View>
          </AppCard>
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <Text style={{ fontSize: 30, fontWeight: '800', color: '#FFFFFF' }}>
        Recruiter voice interview
      </Text>

      <Text style={{ fontSize: 16, lineHeight: 24, color: '#96A7DE' }}>
        Practice with a recruiter-style voice flow using higher-quality microphone
        capture and more natural AI voice playback.
      </Text>

      <AppCard>
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#6366F1' }}>
          Question {currentNumber} of {totalQuestions}
        </Text>

        <Text
          style={{
            marginTop: 10,
            fontSize: 18,
            fontWeight: '700',
            color: '#FFFFFF',
          }}
        >
          {currentQuestion || 'Preparing your first question...'}
        </Text>

        <View
          style={{
            marginTop: 14,
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <Badge label={`Voice ${recruiterVoice}`} />
          <Badge label={`Playback ${speakerMode.replace('_', ' ')}`} />
          <Badge label={`Mic ${microphoneMode.replace('_', ' ')}`} />
          <Badge label={`Quality ${recordingQuality}`} />
        </View>
      </AppCard>

      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: '800', color: '#FFFFFF' }}>
          Microphone options
        </Text>

        <View style={{ marginTop: 12, gap: 12 }}>
          <SelectionChips
            label="Answer mode"
            value={microphoneMode}
            onChange={(value) => setMicrophoneMode(value as MicrophoneMode)}
            options={[
              { label: 'Voice preferred', value: 'voice_preferred' },
              { label: 'Voice only', value: 'voice_only' },
              { label: 'Text fallback', value: 'text_fallback' },
            ]}
          />

          <SelectionChips
            label="Recording quality"
            value={recordingQuality}
            onChange={(value) => setRecordingQuality(value as RecordingQuality)}
            options={[
              { label: 'Standard', value: 'standard' },
              { label: 'High', value: 'high' },
            ]}
          />

          <AppButton
            label={isRecording ? 'Stop recording and send' : 'Record answer now'}
            onPress={() => {
              if (isRecording) {
                void stopRecording();
              } else {
                void beginRecording();
              }
            }}
            disabled={respondMutation.isPending || liveComplete}
          />
        </View>
      </AppCard>

      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: '800', color: '#FFFFFF' }}>
          Speaker options
        </Text>

        <View style={{ marginTop: 12, gap: 12 }}>
          <SelectionChips
            label="Playback"
            value={speakerMode}
            onChange={(value) => setSpeakerMode(value as SpeakerMode)}
            options={[
              { label: 'AI voice', value: 'ai_voice' },
              { label: 'Auto', value: 'auto' },
              { label: 'Device voice', value: 'device_voice' },
              { label: 'Muted', value: 'muted' },
            ]}
          />

          <SelectionChips
            label="Recruiter voice"
            value={recruiterVoice}
            onChange={(value) => setRecruiterVoice(value as RecruiterVoice)}
            options={[
              { label: 'Verse', value: 'verse' },
              { label: 'Alloy', value: 'alloy' },
              { label: 'Nova', value: 'nova' },
            ]}
          />

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <AppButton
                label={voiceEnabled ? 'Voice on' : 'Voice off'}
                variant="secondary"
                onPress={() => setVoiceEnabled((prev) => !prev)}
              />
            </View>

            <View style={{ flex: 1 }}>
              <AppButton
                label="Replay recruiter"
                variant="secondary"
                onPress={() =>
                  void playCoachVoice(
                    latestTurn?.audioUrl || String(params.audioUrl || ''),
                    latestTurn
                      ? [latestTurn.coachReply, latestTurn.nextQuestion]
                          .filter(Boolean)
                          .join(' ')
                      : currentQuestion
                  )
                }
              />
            </View>
          </View>
        </View>
      </AppCard>

      {showManualInput ? (
        <AppCard>
          <View style={{ gap: 12 }}>
            <AppInput
              label="Typed fallback"
              value={manualAnswer}
              onChangeText={setManualAnswer}
              placeholder="Type here if voice input is unavailable"
              multiline
              autoCapitalize="sentences"
            />

            <AppButton
              label={
                respondMutation.isPending
                  ? 'Analyzing response...'
                  : 'Submit typed answer'
              }
              variant="secondary"
              onPress={submitManual}
              disabled={
                respondMutation.isPending || !manualAnswer.trim() || liveComplete
              }
            />
          </View>
        </AppCard>
      ) : null}

      {respondMutation.isError ? (
        <ErrorState
          title="Could not process your answer"
          message={
            respondMutation.error instanceof Error
              ? respondMutation.error.message
              : 'Unknown error'
          }
        />
      ) : null}

      {latestTurn ? (
        <AppCard>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>
            Recruiter coaching snapshot
          </Text>

          <Text style={{ marginTop: 10, color: '#2EA4FF', lineHeight: 24 }}>
            {latestTurn.coachReply}
          </Text>

          <View style={{ marginTop: 12, gap: 6 }}>
            <Text style={{ color: '#C8D3F5' }}>
              Clarity: {latestTurn.feedback.clarity}/10
            </Text>
            <Text style={{ color: '#C8D3F5' }}>
              Structure: {latestTurn.feedback.structure}/10
            </Text>
            <Text style={{ color: '#C8D3F5' }}>
              Relevance: {latestTurn.feedback.relevance}/10
            </Text>
          </View>

          <Text style={{ marginTop: 12, color: '#C8D3F5', lineHeight: 24 }}>
            {latestTurn.feedback.strength}
          </Text>
        </AppCard>
      ) : null}

      <Pressable
        onPress={() => setShowTranscript((prev) => !prev)}
        style={{ paddingVertical: 4 }}
      >
        <Text style={{ color: '#96A7DE', fontSize: 14, fontWeight: '700' }}>
          {showTranscript
            ? 'Hide transcript details'
            : 'Show transcript and fallback text'}
        </Text>
      </Pressable>

      {showTranscript &&
      (lastTranscript || latestTurn?.feedback.strongerSampleAnswer) ? (
        <AppCard>
          {lastTranscript ? (
            <>
              <Text
                style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}
              >
                Latest transcript
              </Text>
              <Text style={{ marginTop: 10, color: '#C8D3F5', lineHeight: 24 }}>
                {lastTranscript}
              </Text>
            </>
          ) : null}

          {latestTurn?.feedback.strongerSampleAnswer ? (
            <>
              <Text
                style={{
                  marginTop: 14,
                  fontSize: 18,
                  fontWeight: '700',
                  color: '#FFFFFF',
                }}
              >
                Stronger sample answer
              </Text>
              <Text style={{ marginTop: 10, color: '#C8D3F5', lineHeight: 24 }}>
                {latestTurn.feedback.strongerSampleAnswer}
              </Text>
            </>
          ) : null}
        </AppCard>
      ) : null}
    </AppScreen>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: colors.surfaceElevated,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Text
        style={{
          color: colors.muted,
          fontSize: 12,
          fontWeight: '700',
        }}
      >
        {label}
      </Text>
    </View>
  );
}