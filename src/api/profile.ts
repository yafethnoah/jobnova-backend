import { apiRequest } from "@/src/api/client";
import { env } from "@/src/lib/env";
import { mockProfileApi } from "@/src/mocks/mockProfileApi";
import type { UserProfile } from "@/src/features/profile/profile.types";

type UpdateProfilePayload = Partial<Pick<UserProfile, "fullName" | "targetRole" | "location" | "summary">>;

export const profileApi = {
  getMe(token: string | null) { return env.useMockApi ? mockProfileApi.getMe() : apiRequest<UserProfile>("/users/me", { token }); },
  updateMe(token: string | null, payload: UpdateProfilePayload) { return env.useMockApi ? mockProfileApi.updateMe(payload) : apiRequest<UserProfile>("/users/me", { method: "PUT", token, body: payload }); }
};
