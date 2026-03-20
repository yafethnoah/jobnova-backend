import { env } from '@/src/lib/env';
import { optionalAuthApiRequest } from '@/src/api/client';
import { mockJobReadyApi } from '@/src/mocks/mockJobReadyApi';
import type { JobReadyInput, JobReadyPackage, ExportArtifact } from '@/src/features/resume/jobReady.types';

export const jobReadyApi = {
  async generate(token: string | null, payload: JobReadyInput) {
    if (env.useMockApi) return mockJobReadyApi.generate(payload);
    try {
      return await optionalAuthApiRequest<JobReadyPackage>('/assets/job-ready-package', token, { method: 'POST', body: payload, timeoutMs: 90000 });
    } catch (error) {
      throw error instanceof Error
        ? error
        : new Error('Live package generation is unavailable right now. Please retry when the backend is healthy.');
    }
  },
  async history(token: string | null) {
    if (env.useMockApi) return [] as JobReadyPackage[];
    try {
      return await optionalAuthApiRequest<JobReadyPackage[]>('/assets/job-ready-package/history', token, { timeoutMs: 12000 });
    } catch {
      return [] as JobReadyPackage[];
    }
  },
  async exportLibrary(token: string | null) {
    if (env.useMockApi) return [] as ExportArtifact[];
    try {
      return await optionalAuthApiRequest<ExportArtifact[]>('/assets/export-library', token, { timeoutMs: 12000 });
    } catch {
      return [] as ExportArtifact[];
    }
  }
};
