import { env } from '@/src/lib/env';
import { optionalAuthApiRequest } from '@/src/api/client';
import { mockJobReadyApi } from '@/src/mocks/mockJobReadyApi';
import type {
  JobReadyInput,
  JobReadyPackage,
  ExportArtifact,
} from '@/src/features/resume/jobReady.types';

function unwrapList<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === 'object' && Array.isArray((value as any).items)) {
    return (value as any).items as T[];
  }
  return [];
}

export const jobReadyApi = {
  async generate(token: string | null, payload: JobReadyInput) {
    if (env.useMockApi) return mockJobReadyApi.generate(payload);

    const normalizedPayload = {
      ...payload,
      roleTitle: payload.targetRole?.trim() || payload.fullName?.trim() || 'Target Role',
      targetRole: payload.targetRole?.trim() || 'Target Role',
      companyName: payload.companyName?.trim() || 'Target Company',
      jobDescription: payload.jobDescription?.trim() || '',
      resumeText: payload.resumeText?.trim() || '',
      tone: 'professional',
    };

    return optionalAuthApiRequest<JobReadyPackage>(
      '/api/job-ready/job-ready-package',
      token,
      {
        method: 'POST',
        body: normalizedPayload,
        timeoutMs: 90000,
      }
    );
  },

  async history(token: string | null) {
    if (env.useMockApi) return [] as JobReadyPackage[];

    try {
      const response = await optionalAuthApiRequest<
        JobReadyPackage[] | { ok?: boolean; items?: JobReadyPackage[] }
      >('/api/job-ready/job-ready-package/history', token, {
        timeoutMs: 12000,
      });

      return unwrapList<JobReadyPackage>(response);
    } catch {
      return [] as JobReadyPackage[];
    }
  },

  async exportLibrary(token: string | null) {
    if (env.useMockApi) return [] as ExportArtifact[];

    try {
      const response = await optionalAuthApiRequest<
        ExportArtifact[] | { ok?: boolean; items?: ExportArtifact[] }
      >('/api/job-ready/export-library', token, {
        timeoutMs: 12000,
      });

      return unwrapList<ExportArtifact>(response);
    } catch {
      return [] as ExportArtifact[];
    }
  },
};
