import { optionalAuthApiRequest } from '@/src/api/client';

export type ExtractJobPostResponse = {
  url?: string;
  sourceUrl?: string;
  finalUrl?: string;
  title?: string;
  company?: string;
  location?: string;
  salary?: string;
  text: string;
  source?: string;
  extractionMethod?: string;
  confidence?: 'high' | 'medium' | 'low';
  warning?: string;
};

function normalizeJobPostingUrl(input: string): { normalizedUrl: string; inputWarning?: string } {
  const raw = String(input || '').trim();
  if (!raw) throw new Error('Please paste a full job posting URL.');

  if (/^https?:\/\//i.test(raw)) {
    return { normalizedUrl: raw };
  }

  if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(raw)) {
    return {
      normalizedUrl: `https://${raw}`,
      inputWarning: 'JobNova added https:// automatically because the pasted link did not include it.'
    };
  }

  throw new Error('Please paste the full job posting link, including https:// and the website domain.');
}

export const jobPostApi = {
  async extract(token: string | null, jobPostingUrl: string) {
    const normalizedResult = normalizeJobPostingUrl(jobPostingUrl);
    const normalized = normalizedResult.normalizedUrl;
    const data = await optionalAuthApiRequest<ExtractJobPostResponse>('/resume/extract-job-posting', token, {
      method: 'POST',
      body: { jobPostingUrl: normalized },
      timeoutMs: 30000
    });

    const warning = [normalizedResult.inputWarning, data.warning].filter(Boolean).join(' ');
    return {
      ...data,
      url: data.url || normalized,
      sourceUrl: data.sourceUrl || normalized,
      finalUrl: data.finalUrl || normalized,
      warning
    };
  }
};
