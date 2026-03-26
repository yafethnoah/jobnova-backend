import { apiRequest, ApiRequestError } from "@/src/api/client";

export type CoachSessionPayload = {
  topic?: string;
  message?: string;
  context?: Record<string, unknown>;
};

export const coachApi = {
  async createSession(token: string, payload: CoachSessionPayload) {
    try {
      return await apiRequest("/coach/session", {
        method: "POST",
        token,
        body: payload,
        disableApiPrefixFallback: true,
      });
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 404) {
        return {
          ok: false,
          fallback: true,
          message: "Coach session route is not available yet.",
        };
      }

      throw error;
    }
  },
};