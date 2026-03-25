import { assertRuntimeEnv, env } from '@/src/lib/env';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type RequestOptions = {
  method?: HttpMethod;
  body?: unknown;
  token?: string | null;
  headers?: Record<string, string | null | undefined>;
  timeoutMs?: number;
  disableApiPrefixFallback?: boolean;
};

export class ApiRequestError extends Error {
  status?: number;
  requestId?: string;
  details?: unknown;

  constructor(
    message: string,
    init?: { status?: number; requestId?: string; details?: unknown }
  ) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = init?.status;
    this.requestId = init?.requestId;
    this.details = init?.details;
  }
}

const joinUrl = (baseUrl: string, path: string) =>
  `${baseUrl.replace(/\/+$/, '')}${path.startsWith('/') ? path : `/${path}`}`;

function prefixApiPath(path: string): string {
  if (!path.startsWith('/')) return `/api/${path}`;
  if (path.startsWith('/api/')) return path;
  if (path === '/api') return path;
  return `/api${path}`;
}

function ensureApiBaseUrl(): string {
  assertRuntimeEnv();
  if (!env.apiBaseUrl) {
    throw new Error(
      'EXPO_PUBLIC_API_BASE_URL is missing. Add your backend URL before using live features.'
    );
  }
  return env.apiBaseUrl;
}

function sanitizeHeaders(
  headers?: Record<string, string | null | undefined>
): Record<string, string> {
  return Object.entries(headers || {}).reduce<Record<string, string>>(
    (acc, [key, value]) => {
      if (!key || value == null) return acc;
      acc[key] = String(value);
      return acc;
    },
    {}
  );
}

async function parseErrorResponse(response: Response): Promise<ApiRequestError> {
  const contentType = response.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');
  let payload: any = null;

  try {
    payload = isJson ? await response.json() : await response.text();
  } catch {
    payload = null;
  }

  const message =
    typeof payload === 'string'
      ? payload
      : payload?.message || payload?.error || `Request failed with status ${response.status}`;

  return new ApiRequestError(message, {
    status: response.status,
    requestId: payload?.requestId,
    details: payload?.details,
  });
}

async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');

  if (!response.ok) throw await parseErrorResponse(response);
  if (!isJson) return {} as T;

  return response.json() as Promise<T>;
}

async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs = 12000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function apiRequestOnce<T>(
  baseUrl: string,
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const headers = sanitizeHeaders({
    'Content-Type': 'application/json',
    ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    ...(options.headers || {}),
  });

  const response = await fetchWithTimeout(
    joinUrl(baseUrl, path),
    {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    },
    options.timeoutMs
  );

  return parseResponse<T>(response);
}

function shouldRetryWithApiPrefix(
  path: string,
  error: unknown,
  disableFallback?: boolean
): boolean {
  if (disableFallback) return false;
  if (path.startsWith('/api/')) return false;
  return error instanceof ApiRequestError && error.status === 404;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const baseUrl = ensureApiBaseUrl();

  try {
    return await apiRequestOnce<T>(baseUrl, path, options);
  } catch (error) {
    if (shouldRetryWithApiPrefix(path, error, options.disableApiPrefixFallback)) {
      return apiRequestOnce<T>(baseUrl, prefixApiPath(path), {
        ...options,
        disableApiPrefixFallback: true,
      });
    }
    throw error;
  }
}