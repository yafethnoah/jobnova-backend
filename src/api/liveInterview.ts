import { env } from '@/src/lib/env';
import { optionalAuthApiRequest, optionalAuthFormRequest } from '@/src/api/client';
import { mockLiveInterviewApi } from '@/src/mocks/mockLiveInterviewApi';
import type {
  LiveInterviewTurnResponse,
  VoiceInterviewReport,
  VoiceInterviewSetup,
} from '@/src/features/interview/liveInterview.types';

type StartResponse = {
  sessionId: string;
  firstQuestion: string;
  totalQuestions: number;
  audioUrl?: string | null;
  voiceName?: string | null;
  recruiterVoice?: string | null;
};

const fallbackSessionMap = new Map<string, string>();
const fallbackSetupMap = new Map<string, VoiceInterviewSetup>();

async function startLocalFallback(payload: VoiceInterviewSetup, sessionAlias?: string): Promise<StartResponse> {
  const mock = await mockLiveInterviewApi.start(payload);
  fallbackSessionMap.set(sessionAlias || mock.sessionId, mock.sessionId);
  fallbackSetupMap.set(sessionAlias || mock.sessionId, payload);
  return mock;
}

export const liveInterviewApi = {
  async start(token: string | null, payload: VoiceInterviewSetup) {
    if (env.useMockApi) return startLocalFallback(payload);

    try {
      const response = await optionalAuthApiRequest<StartResponse>('/api/interview/live/start', token, {
        method: 'POST',
        body: payload,
        timeoutMs: 30000,
      });
      fallbackSetupMap.set(response.sessionId, payload);
      return response;
    } catch (error) {
      console.warn('Live interview start failed, using local recruiter simulation fallback.', error);
      return startLocalFallback(payload);
    }
  },

  async respond(
    token: string | null,
    sessionId: string,
    payload: {
      answerText?: string;
      audioUri?: string;
      audioMimeType?: string;
      recruiterVoice?: string;
    }
  ) {
    const mappedSessionId = fallbackSessionMap.get(sessionId);
    if (env.useMockApi || mappedSessionId) {
      return mockLiveInterviewApi.respond(mappedSessionId || sessionId, payload);
    }

    const formData = new FormData();

    if (payload.answerText?.trim()) {
      formData.append('answerText', payload.answerText.trim());
    }

    if (payload.recruiterVoice?.trim()) {
      formData.append('recruiterVoice', payload.recruiterVoice.trim());
    }

    if (payload.audioUri) {
      formData.append(
        'audio',
        {
          uri: payload.audioUri,
          name: `voice-${Date.now()}.m4a`,
          type: payload.audioMimeType || 'audio/m4a',
        } as any
      );
    }

    try {
      return await optionalAuthFormRequest<LiveInterviewTurnResponse>(
        `/api/interview/live/respond/${encodeURIComponent(sessionId)}`,
        formData,
        token,
        60000
      );
    } catch (error) {
      console.warn('Live interview respond failed, switching to local recruiter simulation fallback.', error);
      const setup = fallbackSetupMap.get(sessionId) || {
        targetRole: 'Target role',
        interviewType: 'behavioral',
        difficulty: 'medium',
        coachTone: 'realistic',
        recruiterVoice: 'verse',
        speakerMode: 'auto',
        microphoneMode: 'voice_preferred',
        recordingQuality: 'high',
      } as VoiceInterviewSetup;
      const localSessionId = fallbackSessionMap.get(sessionId) || (await startLocalFallback(setup, sessionId)).sessionId;
      return mockLiveInterviewApi.respond(localSessionId, payload);
    }
  },

  async complete(token: string | null, sessionId: string, payload: VoiceInterviewSetup) {
    const mappedSessionId = fallbackSessionMap.get(sessionId);
    if (env.useMockApi || mappedSessionId) return mockLiveInterviewApi.complete(mappedSessionId || sessionId, payload);

    try {
      return await optionalAuthApiRequest<VoiceInterviewReport>(
        '/api/interview/live/complete',
        token,
        {
          method: 'POST',
          body: {
            sessionId,
            ...payload,
          },
          timeoutMs: 45000,
        }
      );
    } catch (error) {
      console.warn('Live interview complete failed, using local recruiter simulation fallback.', error);
      const localSessionId = fallbackSessionMap.get(sessionId) || (await startLocalFallback(payload, sessionId)).sessionId;
      return mockLiveInterviewApi.complete(localSessionId, payload);
    }
  },
};
