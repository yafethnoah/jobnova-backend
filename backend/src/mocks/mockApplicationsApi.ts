import { mockDelay } from "@/src/lib/mockDelay";
import { mockApplications } from "@/src/mocks/mockData";
import type { CreateJobApplicationPayload, JobApplication } from "@/src/features/tracker/tracker.types";

export const mockApplicationsApi = {
  async list(): Promise<JobApplication[]> { await mockDelay(); return [...mockApplications]; },
  async getById(id: string): Promise<JobApplication> { await mockDelay(); const item = mockApplications.find((app) => app.id === id); if (!item) throw new Error("Application not found."); return { ...item }; },
  async create(payload: CreateJobApplicationPayload): Promise<JobApplication> { await mockDelay(); const item: JobApplication = { id: `app-${Date.now()}`, ...payload }; mockApplications.unshift(item); return item; },
  async update(id: string, payload: Partial<CreateJobApplicationPayload>): Promise<JobApplication> { await mockDelay(); const index = mockApplications.findIndex((app) => app.id === id); if (index === -1) throw new Error("Application not found."); mockApplications[index] = { ...mockApplications[index], ...payload }; return { ...mockApplications[index] }; },
  async remove(id: string): Promise<{ success: true }> { await mockDelay(); const index = mockApplications.findIndex((app) => app.id === id); if (index === -1) throw new Error("Application not found."); mockApplications.splice(index, 1); return { success: true }; }
};
