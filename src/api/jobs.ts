import { apiRequest } from '@/src/api/client';
export type QueueMode = 'bullmq' | 'in-memory' | 'disabled';
export type BackgroundJobKind = 'ats-compare' | 'resume-rewrite' | 'application-package' | 'resume-export' | 'interview-score';
export type BackgroundJobRecord = { id: string; kind: BackgroundJobKind; status: 'queued' | 'processing' | 'completed' | 'failed'; progress: number; payload?: Record<string, unknown>; queueJobId?: string | null; queueMode?: QueueMode; errorMessage?: string | null; createdAt?: string; updatedAt?: string; };
export type BackgroundJobResult<T = unknown> = { id: string; kind: BackgroundJobKind; status: 'completed'; queueMode?: QueueMode; result: T; packageId?: string | null; };
export type QueueHealthSummary = { queueMode: QueueMode; workerEnabled: boolean; disabledReason?: string; redis?: { enabled?: boolean; ok?: boolean; mode?: string; reason?: string; message?: string }; queueDepth: number; };
export type JobsListResponse = { items: BackgroundJobRecord[]; queueMode: QueueMode; localQueueDepth: number; };
export type AutopilotPackageRecord = any;
const req = <T>(token: string | null, path: string, method: 'GET'|'POST'='GET', body?: Record<string, unknown>, timeoutMs=12000) => apiRequest<T>(path,{method,token,body,timeoutMs});
export const jobsApi = {
  enqueueAtsCompare: (token: string | null, body: Record<string, unknown>) => req<BackgroundJobRecord>(token,'/jobs/ats/compare','POST',body,15000),
  enqueueResumeRewrite: (token: string | null, body: Record<string, unknown>) => req<BackgroundJobRecord>(token,'/jobs/resume/rewrite','POST',body,15000),
  enqueueApplicationPackage: (token: string | null, body: Record<string, unknown>) => req<BackgroundJobRecord>(token,'/jobs/autopilot/package','POST',body,15000),
  enqueueResumeExport: (token: string | null, body: Record<string, unknown>) => req<BackgroundJobRecord>(token,'/jobs/export/resume','POST',body,15000),
  enqueueInterviewScore: (token: string | null, body: Record<string, unknown>) => req<BackgroundJobRecord>(token,'/jobs/interview/score','POST',body,15000),
  createAtsCompareJob(token: string | null, body: Record<string, unknown>) { return this.enqueueAtsCompare(token, body); },
  createResumeRewriteJob(token: string | null, body: Record<string, unknown>) { return this.enqueueResumeRewrite(token, body); },
  createApplicationPackageJob(token: string | null, body: Record<string, unknown>) { return this.enqueueApplicationPackage(token, body); },
  createResumeExportJob(token: string | null, body: Record<string, unknown>) { return this.enqueueResumeExport(token, body); },
  createInterviewScoreJob(token: string | null, body: Record<string, unknown>) { return this.enqueueInterviewScore(token, body); },
  list(token: string | null) { return req<JobsListResponse>(token,'/jobs'); },
  listJobs(token: string | null) { return this.list(token); },
  getStatus(token: string | null, jobId: string) { return req<BackgroundJobRecord>(token,`/jobs/${jobId}/status`); },
  getJobStatus(token: string | null, jobId: string) { return this.getStatus(token, jobId); },
  getResult<T = unknown>(token: string | null, jobId: string) { return req<BackgroundJobResult<T>>(token,`/jobs/${jobId}/result`); },
  getJobResult<T = unknown>(token: string | null, jobId: string) { return this.getResult<T>(token, jobId); },
  getQueueHealth(token: string | null) { return req<QueueHealthSummary>(token,'/jobs/queue/health'); },
  listAutopilotPackages(token: string | null) { return req<{items:any[]}>(token,'/jobs/autopilot/packages'); },
  persistPackageFromJob(token: string | null, jobId: string) { return req<any>(token,`/jobs/autopilot/packages/from-job/${jobId}`,'POST'); },
  createAutopilotPackageFromJob(token: string | null, jobId: string) { return this.persistPackageFromJob(token, jobId); },
  getAutopilotPackage(token: string | null, packageId: string) { return req<any>(token,`/jobs/autopilot/packages/${packageId}`); },
  approveAutopilotPackage(token: string | null, packageId: string) { return req<any>(token,`/jobs/autopilot/packages/${packageId}/approve`,'POST'); },
  retryPackageExport(token: string | null, packageId: string) { return req<any>(token,`/jobs/autopilot/packages/${packageId}/retry-export`,'POST'); },
  retryAutopilotPackageExport(token: string | null, packageId: string) { return this.retryPackageExport(token, packageId); }
};
