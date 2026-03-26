import * as FileSystem from 'expo-file-system';

import { optionalAuthApiRequest, optionalAuthFormRequest } from '@/src/api/client';
import { env } from '@/src/lib/env';
import { mockResumeApi } from '@/src/mocks/mockResumeApi';
import type {
  AtsCheckPayload,
  AtsCheckResponse,
  ResumeRewritePayload,
  ResumeRewriteResponse,
  ResumeUploadResponse
} from '@/src/features/resume/resume.types';

function inferMimeType(fileName = '', mimeType?: string | null) {
  if (mimeType && mimeType !== 'application/octet-stream') return mimeType;
  const lower = String(fileName || '').toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (lower.endsWith('.doc')) return 'application/msword';
  if (lower.endsWith('.txt') || lower.endsWith('.md')) return 'text/plain';
  return 'application/octet-stream';
}

async function readSimpleLocalText(file: { uri: string; name: string }): Promise<string> {
  const lower = String(file.name || '').toLowerCase();
  if (!(lower.endsWith('.txt') || lower.endsWith('.md'))) return '';
  try {
    return (await FileSystem.readAsStringAsync(file.uri)).trim();
  } catch {
    return '';
  }
}

export const resumeApi = {
  async rewrite(token: string | null, payload: ResumeRewritePayload) {
    if (env.useMockApi) return mockResumeApi.rewrite(payload);
    try {
      return await optionalAuthApiRequest<ResumeRewriteResponse>('/resume/rewrite', token, { method: 'POST', body: payload, timeoutMs: 60000 });
    } catch (error) {
      throw error instanceof Error
        ? error
        : new Error('Live resume rewrite is unavailable right now. Please try again after the backend is healthy.');
    }
  },
  async atsCheck(token: string | null, payload: AtsCheckPayload) {
    if (env.useMockApi) return mockResumeApi.atsCheck(payload);
    try {
      return await optionalAuthApiRequest<AtsCheckResponse>('/resume/ats-check', token, { method: 'POST', body: payload, timeoutMs: 45000 });
    } catch (error) {
      throw error instanceof Error
        ? error
        : new Error('Live ATS analysis is unavailable right now. Please try again after the backend is healthy.');
    }
  },
  async latestUpload(token: string | null) {
    if (env.useMockApi) return null;
    try {
      return await optionalAuthApiRequest<ResumeUploadResponse | null>('/resume/latest-upload', token, { timeoutMs: 5000 });
    } catch {
      return null;
    }
  },
  async upload(token: string | null, file: { uri: string; name: string; mimeType?: string | null }) {
    if (env.useMockApi) {
      const extractedText = await readSimpleLocalText(file);
      return {
        ok: true,
        message: extractedText
          ? 'Local text file attached and extracted successfully.'
          : 'This preview environment cannot fully parse PDF or DOCX on device yet. Paste your resume text or attach a TXT export for the strongest comparison.',
        fileName: file.name,
        uploadedFileName: file.name,
        extractedText
      } satisfies ResumeUploadResponse;
    }
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: inferMimeType(file.name, file.mimeType)
    } as unknown as Blob);
    try {
      return await optionalAuthFormRequest<ResumeUploadResponse>('/resume/upload', formData, token, 45000);
    } catch (error) {
      const extractedText = await readSimpleLocalText(file);
      if (extractedText) {
        return {
          ok: true,
          message: 'Live upload failed, but JobNova safely recovered the attached plain-text file locally. Review the extracted text before analysis.',
          fileName: file.name,
          uploadedFileName: file.name,
          extractedText
        } satisfies ResumeUploadResponse;
      }
      throw error instanceof Error
        ? error
        : new Error('Live resume upload failed. Upload again when the backend is healthy, or paste the resume text manually.');
    }
  }
};
