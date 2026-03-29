import { env } from '@/src/lib/env';
import { optionalAuthApiRequest, optionalAuthFormRequest } from '@/src/api/client';
import { mockLiveInterviewApi } from '@/src/mocks/mockLiveInterviewApi';
import type { LiveInterviewTurnResponse, VoiceInterviewReport, VoiceInterviewSetup } from '@/src/features/interview/liveInterview.types';

export const liveInterviewApi = {
  start(token: string | null, payload: VoiceInterviewSetup) {
    return env.useMockApi ? mockLiveInterviewApi.start(payload) : optionalAuthApiRequest<{ sessionId: string; firstQuestion: string; totalQuestions: number; audioUrl?: string | null; voiceName?: string | null }>('/interview/live/start', token, { method: 'POST', body: payload });
  },
  async respond(token: string | null, sessionId: string, payload: { answerText?: string; audioUri?: string; audioMimeType?: string; recruiterVoice?: string }) {
    if (env.useMockApi) return mockLiveInterviewApi.respond(sessionId, payload);
    const formData = new FormData();
    formData.append('sessionId', sessionId);
    if (payload.answerText?.trim()) formData.append('answerText', payload.answerText.trim());
    if (payload.recruiterVoice) formData.append('recruiterVoice', payload.recruiterVoice);
    if (payload.audioUri) {
      formData.append('audio', {
        uri: payload.audioUri,
        name: `voice-${Date.now()}.m4a`,
        type: payload.audioMimeType || 'audio/m4a'
      } as any);
    }
    return optionalAuthFormRequest<LiveInterviewTurnResponse>('/interview/live/respond', formData, token);
  },
  complete(token: string | null, sessionId: string, payload: VoiceInterviewSetup) {
    return env.useMockApi ? mockLiveInterviewApi.complete(sessionId, payload) : optionalAuthApiRequest<VoiceInterviewReport>('/interview/live/complete', token, { method: 'POST', body: { sessionId, ...payload } });
  }
};
