import { apiRequest } from "@/src/api/client";

export type RealtimeSessionResponse = {
  sessionId: string;
  ephemeralKey: string;
  transport: string;
  model: string;
  note: string;
};

export type RealtimeFeedback = {
  overallScore: number;
  clarityScore: number;
  structureScore: number;
  relevanceScore: number;
  confidenceScore: number;
  strengths: string[];
  weaknesses: string[];
  improvedAnswer: string;
  nextActions: string[];
  transcript?: string;
};

export const interviewV7Api = {
  createSession(token: string | null, input: { role: string; level: string; mode: string }) {
    return apiRequest<RealtimeSessionResponse>("/interview/realtime/session", { method: "POST", token, body: input });
  },
  appendEvent(token: string | null, sessionId: string, input: { speaker: "ai" | "user"; text: string }) {
    return apiRequest<{ ok: true; count: number }>(`/interview/realtime/session/${sessionId}/event`, { method: "POST", token, body: input });
  },
  endSession(token: string | null, sessionId: string) {
    return apiRequest<RealtimeFeedback>(`/interview/realtime/session/${sessionId}/end`, { method: "POST", token });
  },
  feedback(token: string | null, sessionId: string) {
    return apiRequest<RealtimeFeedback>(`/interview/realtime/${sessionId}/feedback`, { token });
  }
};


export async function createRealtimeInterviewSession(input: { role: string; level: string; mode: string }, token: string | null = null) {
  return interviewV7Api.createSession(token, input);
}

export async function getInterviewFeedback(sessionId: string, token: string | null = null) {
  return interviewV7Api.feedback(token, sessionId);
}
