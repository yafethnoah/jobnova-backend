import { useState } from "react";
import { createRealtimeInterviewSession, getInterviewFeedback } from "@/src/api/interviewV7";

export function useRealtimeInterview() {
  const [status, setStatus] = useState<"idle" | "connecting" | "live" | "ended" | "error">("idle");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<{ id: string; speaker: "ai" | "user"; text: string }[]>([]);

  async function startSession(payload: { role: string; level: string; mode: string }) {
    setStatus("connecting");
    try {
      const session = await createRealtimeInterviewSession(payload);
      setSessionId(session.sessionId);
      setTranscript([
        { id: "ai-1", speaker: "ai", text: `Welcome to your ${payload.role} voice interview.` },
        { id: "ai-2", speaker: "ai", text: "Tell me about yourself and the value you bring to this role." }
      ]);
      setStatus("live");
    } catch {
      setStatus("error");
    }
  }

  async function endSession() {
    if (!sessionId) return;
    await getInterviewFeedback(sessionId);
    setStatus("ended");
  }

  return { status, transcript, startSession, endSession, sessionId, setTranscript };
}
