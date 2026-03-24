import { useState } from "react";
import { interviewV7Api } from "@/src/api/interviewV7";

type TranscriptItem = { id: string; speaker: "ai" | "user"; text: string };

export function useRealtimeInterview(token: string | null = null) {
  const [status, setStatus] = useState<"idle" | "connecting" | "live" | "ended" | "error">("idle");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);

  async function startSession(payload: { role: string; level: string; mode: string }) {
    setStatus("connecting");
    try {
      const session = await interviewV7Api.createSession(token, payload);
      setSessionId(session.sessionId);
      setTranscript([
        {
          id: "ai-1",
          speaker: "ai",
          text: `Welcome to your ${payload.role} voice interview.`
        },
        {
          id: "ai-2",
          speaker: "ai",
          text: "Tell me about yourself and the value you bring to this role."
        }
      ]);
      setStatus("live");
    } catch {
      setStatus("error");
    }
  }

  async function endSession() {
    if (!sessionId) return null;
    try {
      const feedback = await interviewV7Api.endSession(token, sessionId);
      setStatus("ended");
      return feedback;
    } catch {
      setStatus("error");
      return null;
    }
  }

  return { status, transcript, startSession, endSession, sessionId, setTranscript };
}
