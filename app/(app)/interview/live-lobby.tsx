import { useState } from 'react';
import { router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { Text, View } from 'react-native';

import { AppButton } from '@/src/components/ui/AppButton';
import { AppCard } from '@/src/components/ui/AppCard';
import { AppInput } from '@/src/components/ui/AppInput';
import { AppScreen } from '@/src/components/ui/AppScreen';
import { ErrorState } from '@/src/components/ui/ErrorState';
import { SelectionChips } from '@/src/components/ui/SelectionChips';
import { useAuth } from '@/src/features/auth/useAuth';
import { liveInterviewApi } from '@/src/api/liveInterview';

import type {
  CoachTone,
  Difficulty,
  InterviewType,
  MicrophoneMode,
  RecordingQuality,
  RecruiterVoice,
  SpeakerMode,
} from '@/src/features/interview/liveInterview.types';

type LiveInterviewStartResponse = {
  sessionId: string;
  firstQuestion: string;
  totalQuestions: number;
  audioUrl?: unknown;
};

export default function LiveInterviewLobbyScreen() {
  const { accessToken } = useAuth();

  const [targetRole, setTargetRole] = useState('Placement Coordinator');
  const [companyName, setCompanyName] = useState('A1 Global College');
  const [interviewType, setInterviewType] = useState<InterviewType>('behavioral');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [coachTone, setCoachTone] = useState<CoachTone>('realistic');
  const [recruiterVoice, setRecruiterVoice] = useState<RecruiterVoice>('verse');
  const [speakerMode, setSpeakerMode] = useState<SpeakerMode>('auto');
  const [microphoneMode, setMicrophoneMode] = useState<MicrophoneMode>('voice_preferred');
  const [recordingQuality, setRecordingQuality] = useState<RecordingQuality>('high');

  const mutation = useMutation({
    mutationFn: async (): Promise<LiveInterviewStartResponse> => {
      const response = await liveInterviewApi.start(accessToken, {
        targetRole,
        companyName,
        interviewType,
        difficulty,
        coachTone,
        recruiterVoice,
        speakerMode,
        microphoneMode,
        recordingQuality,
      });

      return response as LiveInterviewStartResponse;
    },
    onSuccess: (data) => {
      const safeAudioUrl = typeof data.audioUrl === 'string' ? data.audioUrl : '';

      router.push({
        pathname: '/(app)/interview/live-session',
        params: {
          sessionId: String(data.sessionId),
          firstQuestion: String(data.firstQuestion),
          totalQuestions: String(data.totalQuestions),
          targetRole: String(targetRole),
          companyName: String(companyName),
          interviewType: String(interviewType),
          difficulty: String(difficulty),
          coachTone: String(coachTone),
          recruiterVoice: String(recruiterVoice),
          speakerMode: String(speakerMode),
          microphoneMode: String(microphoneMode),
          recordingQuality: String(recordingQuality),
          audioUrl: safeAudioUrl,
        },
      });
    },
  });

  return (
    <AppScreen>
      <Text style={{ fontSize: 30, fontWeight: '800', color: '#FFFFFF' }}>
        Voice recruiter interview
      </Text>

      <Text style={{ fontSize: 16, lineHeight: 24, color: '#96A7DE' }}>
        Configure the interview once, then the coach speaks back like a recruiter.
        The flow is voice-first, with typed fallback only when you want it.
      </Text>

      <AppCard>
        <View style={{ gap: 14 }}>
          <AppInput
            label="Target role"
            value={targetRole}
            onChangeText={setTargetRole}
            placeholder="Example: Placement Coordinator"
            autoCapitalize="words"
          />

          <AppInput
            label="Company"
            value={companyName}
            onChangeText={setCompanyName}
            placeholder="Example: A1 Global College"
            autoCapitalize="words"
          />

          <SelectionChips
            label="Interview type"
            value={interviewType}
            onChange={(value) => setInterviewType(value as InterviewType)}
            options={[
              { label: 'Behavioral', value: 'behavioral' },
              { label: 'HR', value: 'hr' },
              { label: 'Technical', value: 'technical' },
              { label: 'Confidence', value: 'newcomer_confidence' },
              { label: 'Salary', value: 'salary' },
            ]}
          />

          <SelectionChips
            label="Difficulty"
            value={difficulty}
            onChange={(value) => setDifficulty(value as Difficulty)}
            options={[
              { label: 'Easy', value: 'easy' },
              { label: 'Medium', value: 'medium' },
              { label: 'Hard', value: 'hard' },
            ]}
          />

          <SelectionChips
            label="Recruiter tone"
            value={coachTone}
            onChange={(value) => setCoachTone(value as CoachTone)}
            options={[
              { label: 'Supportive', value: 'supportive' },
              { label: 'Realistic', value: 'realistic' },
              { label: 'Strict', value: 'strict' },
            ]}
          />
        </View>
      </AppCard>

      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: '800', color: '#FFFFFF' }}>
          Microphone options
        </Text>

        <Text
          style={{
            marginTop: 8,
            fontSize: 14,
            lineHeight: 22,
            color: '#96A7DE',
          }}
        >
          Choose how the user answers. Voice-first is the default so the interview
          behaves like a real conversation instead of a text box with stage fright.
        </Text>

        <View style={{ marginTop: 14, gap: 14 }}>
          <SelectionChips
            label="Answer mode"
            value={microphoneMode}
            onChange={(value) => setMicrophoneMode(value as MicrophoneMode)}
            options={[
              {
                label: 'Voice preferred',
                value: 'voice_preferred',
                sublabel: 'Record by default, keep typing available.',
              },
              {
                label: 'Voice only',
                value: 'voice_only',
                sublabel: 'Recruiter-style audio interview.',
              },
              {
                label: 'Text fallback',
                value: 'text_fallback',
                sublabel: 'Show typing area right away too.',
              },
            ]}
          />

          <SelectionChips
            label="Recording quality"
            value={recordingQuality}
            onChange={(value) => setRecordingQuality(value as RecordingQuality)}
            options={[
              {
                label: 'Standard',
                value: 'standard',
                sublabel: 'Lighter upload.',
              },
              {
                label: 'High',
                value: 'high',
                sublabel: 'Cleaner voice capture.',
              },
            ]}
          />
        </View>
      </AppCard>

      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: '800', color: '#FFFFFF' }}>
          Speaker options
        </Text>

        <Text
          style={{
            marginTop: 8,
            fontSize: 14,
            lineHeight: 22,
            color: '#96A7DE',
          }}
        >
          The coach should sound like a recruiter. Choose a voice and how playback
          should happen.
        </Text>

        <View style={{ marginTop: 14, gap: 14 }}>
          <SelectionChips
            label="Recruiter voice"
            value={recruiterVoice}
            onChange={(value) => setRecruiterVoice(value as RecruiterVoice)}
            options={[
              {
                label: 'Verse',
                value: 'verse',
                sublabel: 'Balanced and natural.',
              },
              {
                label: 'Alloy',
                value: 'alloy',
                sublabel: 'Clear and steady.',
              },
              {
                label: 'Nova',
                value: 'nova',
                sublabel: 'Warm and polished.',
              },
            ]}
          />

          <SelectionChips
            label="Playback mode"
            value={speakerMode}
            onChange={(value) => setSpeakerMode(value as SpeakerMode)}
            options={[
              {
                label: 'Auto',
                value: 'auto',
                sublabel: 'Play recruiter voice when ready.',
              },
              {
                label: 'Manual',
                value: 'manual',
                sublabel: 'Tap to play each prompt.',
              },
              {
                label: 'Muted',
                value: 'muted',
                sublabel: 'Text-only recruiter prompts.',
              },
            ]}
          />
        </View>
      </AppCard>

      {mutation.isError ? (
        <ErrorState
          title="Could not start live interview"
          message={
            mutation.error instanceof Error
              ? mutation.error.message
              : 'Unknown error'
          }
        />
      ) : null}

      <AppCard>
        <View style={{ gap: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: '#FFFFFF' }}>
            Daily Encouragement
          </Text>

          <Text style={{ fontSize: 14, lineHeight: 22, color: '#96A7DE' }}>
            Every practice round sharpens your story. Confidence grows when
            preparation becomes a habit.
          </Text>

          <AppButton
            label={mutation.isPending ? 'Starting...' : 'Start live interview'}
            onPress={() => mutation.mutate()}
            disabled={mutation.isPending || !targetRole.trim()}
          />

          <AppButton
            label="Back"
            variant="secondary"
            onPress={() => router.back()}
            disabled={mutation.isPending}
          />
        </View>
      </AppCard>
    </AppScreen>
  );
}
