import { env } from '@/src/lib/env';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type RequestOptions = {
  method?: HttpMethod;
  token?: string | null;
  body?: unknown;
  timeoutMs?: number;
  headers?: Record<string, string>;
};

const API_BASE_URL = env.apiBaseUrl.replace(/\/+$/, '');

let accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

function normalizeArgs(
  arg1?: HttpMethod | RequestOptions | string | null,
  arg2?: unknown,
  defaultRequireAuth = true,
): { options: RequestOptions; requireAuth: boolean } {
  if (typeof arg1 === 'string' && ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(arg1)) {
    return {
      options: {
        method: arg1 as HttpMethod,
        body: arg2,
      },
      requireAuth: defaultRequireAuth,
    };
  }

  if (arg1 && typeof arg1 === 'object' && !Array.isArray(arg1)) {
    return {
      options: arg1 as RequestOptions,
      requireAuth: defaultRequireAuth,
    };
  }

  if (typeof arg1 === 'string' || arg1 === null) {
    return {
      options: typeof arg2 === 'object' && arg2 ? { ...(arg2 as RequestOptions), token: arg1 } : { token: arg1 },
      requireAuth: false,
    };
  }

  return { options: {}, requireAuth: defaultRequireAuth };
}

async function requestJson<T>(url: string, options: RequestOptions = {}, requireAuth = true): Promise<T> {
  const controller = new AbortController();
  const timeoutMs = Number(options.timeoutMs || 30000);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const token = options.token ?? accessToken;
  if (requireAuth && token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (!options.body || options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  try {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: options.method || 'GET',
      headers,
      body: options.body !== undefined && !(options.body instanceof FormData) ? JSON.stringify(options.body) : (options.body as BodyInit | undefined),
      signal: controller.signal,
    });

    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();
    const data = contentType.includes('application/json') ? (text ? JSON.parse(text) : {}) : { raw: text };

    if (response.status === 401) {
      return { error: 'unauthorized', status: 401 } as T;
    }

    if (!response.ok) {
      const message = (data as any)?.message || (data as any)?.error || `Request failed with status ${response.status}`;
      throw new Error(message);
    }

    return data as T;
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error('Request timed out.');
    }
    if (error instanceof SyntaxError) {
      throw new Error('Server returned invalid JSON.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function apiRequest<T>(url: string, arg1?: HttpMethod | RequestOptions, arg2?: unknown) {
  const { options, requireAuth } = normalizeArgs(arg1 as any, arg2, true);
  return requestJson<T>(url, options, requireAuth);
}

export function publicApiRequest<T>(url: string, arg1?: HttpMethod | RequestOptions, arg2?: unknown) {
  const { options } = normalizeArgs(arg1 as any, arg2, false);
  return requestJson<T>(url, options, false);
}

export function optionalAuthApiRequest<T>(url: string, tokenOrOptions?: string | null | RequestOptions, maybeOptions?: RequestOptions) {
  const { options } = normalizeArgs(tokenOrOptions as any, maybeOptions, false);
  return requestJson<T>(url, options, false);
}

export function optionalAuthFormRequest<T>(url: string, formData: FormData, token?: string | null, timeoutMs = 30000) {
  return requestJson<T>(url, { method: 'POST', body: formData, token, timeoutMs }, false);
}
