import { mockDelay } from "@/src/lib/mockDelay";
import { mockProfile } from "@/src/mocks/mockData";
import type { UserProfile } from "@/src/features/profile/profile.types";

type UpdateProfilePayload = Partial<Pick<UserProfile, "fullName" | "targetRole" | "location" | "summary">>;

export const mockProfileApi = {
  async getMe(): Promise<UserProfile> { await mockDelay(); return { ...mockProfile }; },
  async updateMe(payload: UpdateProfilePayload): Promise<UserProfile> { await mockDelay(); Object.assign(mockProfile, payload); return { ...mockProfile }; }
};
