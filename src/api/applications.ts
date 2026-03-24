import { apiRequest } from "@/src/api/client";
import { env } from "@/src/lib/env";
import { mockApplicationsApi } from "@/src/mocks/mockApplicationsApi";
import type { CreateJobApplicationPayload, JobApplication } from "@/src/features/tracker/tracker.types";

export const applicationsApi = {
  list(token: string | null) { return env.useMockApi ? mockApplicationsApi.list() : apiRequest<JobApplication[]>("/applications", { token }); },
  getById(token: string | null, id: string) { return env.useMockApi ? mockApplicationsApi.getById(id) : apiRequest<JobApplication>(`/applications/${id}`, { token }); },
  create(token: string | null, payload: CreateJobApplicationPayload) { return env.useMockApi ? mockApplicationsApi.create(payload) : apiRequest<JobApplication>("/applications", { method: "POST", token, body: payload }); },
  update(token: string | null, id: string, payload: Partial<CreateJobApplicationPayload>) { return env.useMockApi ? mockApplicationsApi.update(id, payload) : apiRequest<JobApplication>(`/applications/${id}`, { method: "PATCH", token, body: payload }); },
  remove(token: string | null, id: string) { return env.useMockApi ? mockApplicationsApi.remove(id) : apiRequest<{ success: true }>(`/applications/${id}`, { method: "DELETE", token }); }
};
