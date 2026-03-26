import { env } from "@/src/lib/env";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type RequestOptions = {
  method?: HttpMethod;
  body?: unknown;
  token?: string | null;
  headers?: Record<string, string | null | undefined>;
  timeoutMs?: number;
  disableApiPrefixFallback?: boolean;
};

type ApiErrorPayload = {
  message?: string;
  error?: string;
  requestId?: string;
  details?: unknown;
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
    this.name = "ApiRequestError";
    this.status = init?.status;
    this.requestId = init?.requestId;
    this.details = init?.details;
  }
}

function joinUrl(baseUrl: string, path: string) {
  const cleanBase = baseUrl.replace(/\/+$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
}

function prefixApiPath(path: string) {
  if (!path.startsWith("/")) return `/api/${path}`;
  if (path.startsWith("/api/")) return path;
  if (path === "/api") return path;
  return `/api${path}`;
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

function sanitizeBody(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeBody);
  }

  if (value && typeof value === "object" && !(value instanceof FormData)) {
    return Object.entries(value as Record<string, unknown>).reduce<
      Record<string, unknown>
    >((acc, [key, entry]) => {
      if (!key || entry === undefined) return acc;
      acc[key] = sanitizeBody(entry);
      return acc;
    }, {});
  }

  return value;
}

function buildNetworkError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error ?? "");

  if (/aborted|timed out/i.test(message)) {
    return new Error(
      "The request timed out. Check the backend URL, your network connection, or the server logs."
    );
  }

  if (/network request failed|failed to fetch|load failed/i.test(message)) {
    return new Error(
      "Could not reach the backend. Verify EXPO_PUBLIC_API_BASE_URL, confirm the server is running, and check device network access."
    );
  }

  return error instanceof Error ? error : new Error(message || "Request failed.");
}

function cleanHtmlErrorMessage(payload: string, status: number): string {
  const match = payload.match(/<pre>(.*?)<\/pre>/is);
  const extracted = (match?.[1] || payload)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (/Cannot POST/i.test(extracted) || /Cannot GET/i.test(extracted)) {
    return `The backend route was not found (${extracted}). Confirm the backend is updated and EXPO_PUBLIC_API_BASE_URL points to the API server.`;
  }

  return extracted || `Request failed with status ${status}`;
}

async function parseErrorResponse(response: Response): Promise<ApiRequestError> {
  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  let payload: ApiErrorPayload | string | null = null;

  try {
    payload = isJson ? await response.json() : await response.text();
  } catch {
    payload = null;
  }

  const message =
    typeof payload === "string"
      ? cleanHtmlErrorMessage(payload, response.status)
      : payload?.message ||
        payload?.error ||
        `Request failed with status ${response.status}`;

  return new ApiRequestError(message, {
    status: response.status,
    requestId: typeof payload === "object" ? payload?.requestId : undefined,
    details:
      typeof payload === "object"
        ? payload?.details
        : typeof payload === "string"
          ? payload
          : undefined,
  });
}

async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");

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
  } catch (error) {
    throw buildNetworkError(error);
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
    "Content-Type": "application/json",
    ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    ...(options.headers || {}),
  });

  const body =
    options.body !== undefined
      ? JSON.stringify(sanitizeBody(options.body))
      : undefined;

  const url = joinUrl(baseUrl, path);

  console.log("[API REQUEST]", {
    method: options.method ?? "GET",
    url,
    hasToken: Boolean(options.token),
  });

  const response = await fetchWithTimeout(
    url,
    {
      method: options.method ?? "GET",
      headers,
      body,
    },
    options.timeoutMs
  );

  const parsed = await parseResponse<T>(response);

  console.log("[API RESPONSE]", {
    url,
    status: response.status,
    ok: response.ok,
    data: parsed,
  });

  return parsed;
}

async function apiFormRequestOnce<T>(
  baseUrl: string,
  path: string,
  formData: FormData,
  token?: string | null,
  timeoutMs = 30000
): Promise<T> {
  const headers = sanitizeHeaders(
    token ? { Authorization: `Bearer ${token}` } : undefined
  );

  const url = joinUrl(baseUrl, path);

  console.log("[API REQUEST]", {
    method: "POST",
    url,
    hasToken: Boolean(token),
    formData: true,
  });

  const response = await fetchWithTimeout(
    url,
    {
      method: "POST",
      headers,
      body: formData,
    },
    timeoutMs
  );

  const parsed = await parseResponse<T>(response);

  console.log("[API RESPONSE]", {
    url,
    status: response.status,
    ok: response.ok,
    data: parsed,
  });

  return parsed;
}

function shouldRetryWithApiPrefix(
  path: string,
  error: unknown,
  disableFallback?: boolean
): boolean {
  if (disableFallback) return false;
  if (path.startsWith("/api/")) return false;
  if (!(error instanceof ApiRequestError)) return false;
  if (error.status !== 404) return false;

  return /route was not found|cannot post|cannot get|request failed with status 404/i.test(
    error.message
  );
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  if (!env.apiBaseUrl) {
    throw new Error("EXPO_PUBLIC_API_BASE_URL is missing.");
  }

  try {
    return await apiRequestOnce<T>(env.apiBaseUrl, path, options);
  } catch (error) {
    if (shouldRetryWithApiPrefix(path, error, options.disableApiPrefixFallback)) {
      return apiRequestOnce<T>(env.apiBaseUrl, prefixApiPath(path), {
        ...options,
        disableApiPrefixFallback: true,
      });
    }

    throw error;
  }
}

export async function apiFormRequest<T>(
  path: string,
  formData: FormData,
  token?: string | null,
  timeoutMs = 30000
): Promise<T> {
  if (!env.apiBaseUrl) {
    throw new Error("EXPO_PUBLIC_API_BASE_URL is missing.");
  }

  try {
    return await apiFormRequestOnce<T>(
      env.apiBaseUrl,
      path,
      formData,
      token || null,
      timeoutMs
    );
  } catch (error) {
    if (shouldRetryWithApiPrefix(path, error, false)) {
      return apiFormRequestOnce<T>(
        env.apiBaseUrl,
        prefixApiPath(path),
        formData,
        token || null,
        timeoutMs
      );
    }

    throw error;
  }
}

const isUnauthorizedError = (error: unknown) =>
  (error instanceof ApiRequestError && error.status === 401) ||
  /unauthorized|sign in again|401|token/i.test(
    error instanceof Error ? error.message : String(error ?? "")
  );

export async function optionalAuthApiRequest<T>(
  path: string,
  token: string | null | undefined,
  options: Omit<RequestOptions, "token"> = {}
): Promise<T> {
  try {
    return await apiRequest<T>(path, { ...options, token: token || null });
  } catch (error) {
    if (token && isUnauthorizedError(error)) {
      return apiRequest<T>(path, { ...options, token: null });
    }
    throw error;
  }
}

export async function optionalAuthFormRequest<T>(
  path: string,
  formData: FormData,
  token?: string | null,
  timeoutMs = 30000
): Promise<T> {
  try {
    return await apiFormRequest<T>(path, formData, token || null, timeoutMs);
  } catch (error) {
    if (token && isUnauthorizedError(error)) {
      return apiFormRequest<T>(path, formData, null, timeoutMs);
    }
    throw error;
  }
}