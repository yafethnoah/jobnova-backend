import { useEffect, useMemo, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { AudioModule, createAudioPlayer, RecordingPresets, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
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
import type { LiveInterviewTurnResponse, MicrophoneMode, RecruiterVoice, SpeakerMode, RecordingQuality } from '@/src/features/interview/liveInterview.types';

const RECORDING_OPTIONS = {
  standard: {
    extension: '.m4a',
    sampleRate: 22050,
    numberOfChannels: 1,
    bitRate: 64000,
    android: {
      extension: '.m4a',
      outputFormat: 'mpeg4',
      audioEncoder: 'aac'
    },
    ios: {
      outputFormat: 'aac',
      audioQuality: 'medium',
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false
    },
    web: { mimeType: 'audio/webm', bitsPerSecond: 64000 }
  },
  high: RecordingPresets.HIGH_QUALITY
} as const;

export default function LiveInterviewSessionScreen() {
  const params = useLocalSearchParams<{
    sessionId: string;
    firstQuestion: string;
    totalQuestions: string;
    targetRole: string;
    companyName?: string;
    interviewType: string;
    difficulty: string;
    coachTone: string;
    audioUrl?: string;
    recruiterVoice?: string;
    speakerMode?: string;
    microphoneMode?: string;
    recordingQuality?: string;
  }>();
  const { accessToken } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [manualAnswer, setManualAnswer] = useState('');
  const [turns, setTurns] = useState<LiveInterviewTurnResponse[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(String(params.firstQuestion || 'Tell me about yourself.'));
  const [lastTranscript, setLastTranscript] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [speakerMode, setSpeakerMode] = useState<SpeakerMode>((String(params.speakerMode || 'auto') as SpeakerMode) || 'auto');
  const [microphoneMode, setMicrophoneMode] = useState<MicrophoneMode>((String(params.microphoneMode || 'voice_preferred') as MicrophoneMode) || 'voice_preferred');
  const [recordingQuality, setRecordingQuality] = useState<RecordingQuality>((String(params.recordingQuality || 'high') as RecordingQuality) || 'high');
  const [recruiterVoice, setRecruiterVoice] = useState<RecruiterVoice>((String(params.recruiterVoice || 'verse') as RecruiterVoice) || 'verse');
  const [showTranscript, setShowTranscript] = useState(false);
  const playerRef = useRef<any>(null);
  const recorder = useAudioRecorder(RECORDING_OPTIONS[recordingQuality] as any);

  const totalQuestions = Number(params.totalQuestions || 5);
  const currentNumber = Math.min(turns.length + 1, totalQuestions);
  const liveComplete = useMemo(() => turns[turns.length - 1]?.isComplete || false, [turns]);
  const showManualInput = microphoneMode !== 'voice_only';

  async function stopAllAudio() {
    try {
      Speech.stop();
      playerRef.current?.pause?.();
      playerRef.current?.remove?.();
      playerRef.current = null;
    } catch {}
  }

  async function speakLocally(text?: string | null) {
    if (!text || !voiceEnabled) return;
    try {
      Speech.stop();
      Speech.speak(text, { rate: 0.97, pitch: 1.0, language: 'en-CA' });
    } catch {}
  }

  async function playCoachVoice(audioUrl?: string | null, fallbackText?: string | null) {
    if (!voiceEnabled) return;
    const fullUrl = audioUrl ? (audioUrl.startsWith('http') ? audioUrl : `${env.apiBaseUrl}${audioUrl}`) : null;
    if (speakerMode === 'device_voice') {
      await speakLocally(fallbackText);
      return;
    }
    if (fullUrl) {
      try {
        await stopAllAudio();
        await setAudioModeAsync({
          allowsRecording: false,
          playsInSilentMode: true,
          shouldPlayInBackground: false,
          interruptionMode: 'duckOthers'
        } as any);
        const player = createAudioPlayer(fullUrl);
        playerRef.current = player;
        player.play();
        return;
      } catch {}
    }
    if (speakerMode !== 'ai_voice') await speakLocally(fallbackText);
  }

  useEffect(() => {
    void playCoachVoice(String(params.audioUrl || ''), currentQuestion);
    return () => {
      void stopAllAudio();
    };
  }, []);

  const respondMutation = useMutation({
    mutationFn: (payload: { answerText?: string; audioUri?: string; audioMimeType?: string }) =>
      liveInterviewApi.respond(accessToken, String(params.sessionId), { ...payload, recruiterVoice }),
    onSuccess: async (data) => {
      setTurns((prev) => [...prev, data]);
      setLastTranscript(data.transcribedText);
      if (data.nextQuestion) setCurrentQuestion(data.nextQuestion);
      setManualAnswer('');
      const spokenText = [data.coachReply, data.nextQuestion].filter(Boolean).join(' ');
      await playCoachVoice(data.audioUrl, spokenText);
      if (data.isComplete) {
        router.replace({
          pathname: '/(app)/interview/live-report',
          params: {
            sessionId: String(params.sessionId),
            targetRole: String(params.targetRole || ''),
            companyName: String(params.companyName || ''),
            interviewType: String(params.interviewType || 'behavioral'),
            difficulty: String(params.difficulty || 'medium'),
            coachTone: String(params.coachTone || 'realistic')
          }
        });
      }
    }
  });

  async function beginRecording() {
    const permission = await AudioModule.requestRecordingPermissionsAsync();
    if (!permission.granted) throw new Error('Microphone permission is required for voice training.');
    await stopAllAudio();
    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: 'duckOthers'
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
      interruptionMode: 'duckOthers'
    } as any);
    if (uri) respondMutation.mutate({ audioUri: uri, audioMimeType: 'audio/m4a' });
  }

  function submitManual() {
    if (!manualAnswer.trim()) return;
    respondMutation.mutate({ answerText: manualAnswer.trim() });
  }

  const latestTurn = turns[turns.length - 1];

  return (
    <AppScreen>
      <Text style={{ fontSize: 30, fontWeight: '800', color: '#FFFFFF' }}>Recruiter voice interview</Text>
      <Text style={{ fontSize: 16, lineHeight: 24, color: '#96A7DE' }}>
        The interviewer speaks first, you answer by microphone, and the coach replies like a recruiter. Text remains only as transcript and fallback, not as the main personality of the session.
      </Text>

      <AppCard>
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#6366F1' }}>Question {currentNumber} of {totalQuestions}</Text>
        <Text style={{ marginTop: 10, fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>{currentQuestion}</Text>
        <View style={{ marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Badge label={`Voice ${recruiterVoice}`} />
          <Badge label={`Speaker ${speakerMode.replace('_', ' ')}`} />
          <Badge label={`Mic ${microphoneMode.replace('_', ' ')}`} />
          <Badge label={`Quality ${recordingQuality}`} />
        </View>
      </AppCard>

      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: '800', color: '#FFFFFF' }}>Microphone options</Text>
        <View style={{ marginTop: 12, gap: 12 }}>
          <SelectionChips
            label="Answer mode"
            value={microphoneMode}
            onChange={(value) => setMicrophoneMode(value as MicrophoneMode)}
            options={[
              { label: 'Voice preferred', value: 'voice_preferred' },
              { label: 'Voice only', value: 'voice_only' },
              { label: 'Text fallback', value: 'text_fallback' }
            ]}
          />
          <SelectionChips
            label="Recording quality"
            value={recordingQuality}
            onChange={(value) => setRecordingQuality(value as RecordingQuality)}
            options={[
              { label: 'Standard', value: 'standard' },
              { label: 'High', value: 'high' }
            ]}
          />
          <AppButton
            label={isRecording ? 'Stop recording and send' : 'Record answer now'}
            onPress={() => (isRecording ? stopRecording() : beginRecording())}
            disabled={respondMutation.isPending || liveComplete}
          />
        </View>
      </AppCard>

      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: '800', color: '#FFFFFF' }}>Speaker options</Text>
        <View style={{ marginTop: 12, gap: 12 }}>
          <SelectionChips
            label="Playback"
            value={speakerMode}
            onChange={(value) => setSpeakerMode(value as SpeakerMode)}
            options={[
              { label: 'Auto', value: 'auto' },
              { label: 'AI voice', value: 'ai_voice' },
              { label: 'Device voice', value: 'device_voice' }
            ]}
          />
          <SelectionChips
            label="Recruiter voice"
            value={recruiterVoice}
            onChange={(value) => setRecruiterVoice(value as RecruiterVoice)}
            options={[
              { label: 'Verse', value: 'verse' },
              { label: 'Alloy', value: 'alloy' },
              { label: 'Sage', value: 'sage' },
              { label: 'Ash', value: 'ash' }
            ]}
          />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <AppButton label={voiceEnabled ? 'Voice on' : 'Voice off'} variant="secondary" onPress={() => setVoiceEnabled((prev) => !prev)} />
            </View>
            <View style={{ flex: 1 }}>
              <AppButton label="Replay recruiter" variant="secondary" onPress={() => playCoachVoice(latestTurn?.audioUrl || String(params.audioUrl || ''), latestTurn ? [latestTurn.coachReply, latestTurn.nextQuestion].filter(Boolean).join(' ') : currentQuestion)} />
            </View>
          </View>
        </View>
      </AppCard>

      {showManualInput ? (
        <AppCard>
          <View style={{ gap: 12 }}>
            <AppInput label="Typed fallback" value={manualAnswer} onChangeText={setManualAnswer} placeholder="Type here only when you need fallback access" multiline autoCapitalize="sentences" />
            <AppButton label={respondMutation.isPending ? 'Analyzing response...' : 'Submit typed answer'} variant="secondary" onPress={submitManual} disabled={respondMutation.isPending || !manualAnswer.trim() || liveComplete} />
          </View>
        </AppCard>
      ) : null}

      {respondMutation.isError ? <ErrorState title="Could not process your answer" message={respondMutation.error instanceof Error ? respondMutation.error.message : 'Unknown error'} /> : null}

      {latestTurn ? (
        <AppCard>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>Recruiter coaching snapshot</Text>
          <Text style={{ marginTop: 10, color: '#2EA4FF', lineHeight: 24 }}>{latestTurn.coachReply}</Text>
          <View style={{ marginTop: 12, gap: 6 }}>
            <Text style={{ color: '#C8D3F5' }}>Clarity: {latestTurn.feedback.clarity}/10</Text>
            <Text style={{ color: '#C8D3F5' }}>Structure: {latestTurn.feedback.structure}/10</Text>
            <Text style={{ color: '#C8D3F5' }}>Relevance: {latestTurn.feedback.relevance}/10</Text>
          </View>
          <Text style={{ marginTop: 12, color: '#C8D3F5', lineHeight: 24 }}>{latestTurn.feedback.strength}</Text>
        </AppCard>
      ) : null}

      <Pressable onPress={() => setShowTranscript((prev) => !prev)} style={{ paddingVertical: 4 }}>
        <Text style={{ color: '#96A7DE', fontSize: 14, fontWeight: '700' }}>{showTranscript ? 'Hide transcript details' : 'Show transcript and fallback text'}</Text>
      </Pressable>

      {showTranscript && (lastTranscript || latestTurn?.feedback.strongerSampleAnswer) ? (
        <AppCard>
          {lastTranscript ? (
            <>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>Latest transcript</Text>
              <Text style={{ marginTop: 10, color: '#C8D3F5', lineHeight: 24 }}>{lastTranscript}</Text>
            </>
          ) : null}
          {latestTurn?.feedback.strongerSampleAnswer ? (
            <>
              <Text style={{ marginTop: 14, fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>Stronger sample answer</Text>
              <Text style={{ marginTop: 10, color: '#C8D3F5', lineHeight: 24 }}>{latestTurn.feedback.strongerSampleAnswer}</Text>
            </>
          ) : null}
        </AppCard>
      ) : null}
    </AppScreen>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border }}>
      <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}
