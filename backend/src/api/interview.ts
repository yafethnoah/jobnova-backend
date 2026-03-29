import { apiRequest } from '@/src/api/client';
import { env } from '@/src/lib/env';
import { mockInterviewApi } from '@/src/mocks/mockInterviewApi';
import type {
  InterviewFeedbackPayload,
  InterviewFeedbackResponse,
  InterviewQuestionResponse
} from '@/src/features/interview/interview.types';

export const interviewApi = {
  getQuestion(token: string | null, role: string, index = 0) {
    return env.useMockApi
      ? mockInterviewApi.getQuestion(role, index)
      : apiRequest<InterviewQuestionResponse>('/interview/question', { method: 'POST', token, body: { role, index } });
  },
  getFeedback(token: string | null, payload: InterviewFeedbackPayload) {
    return env.useMockApi
      ? mockInterviewApi.getFeedback(payload)
      : apiRequest<InterviewFeedbackResponse>('/interview/feedback', { method: 'POST', token, body: payload });
  }
};
