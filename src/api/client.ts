const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL?.trim().replace(/\/+$/, "") || "";

let accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const getClientAccessToken = () => accessToken;

type RequestMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type RequestOptions = {
  method?: RequestMethod;
  body?: unknown;
  requireAuth?: boolean;
  isFormData?: boolean;
  tokenOverride?: string | null;
  timeoutMs?: number;
};

type UnauthorizedResponse = {
  error: "unauthorized";
  status: 401;
};

function isRequestMethod(value: unknown): value is RequestMethod {
  return value === "GET" || value === "POST" || value === "PUT" || value === "PATCH" || value === "DELETE";
}

async function safeParseResponse(res: Response) {
  const contentType = res.headers.get("content-type") || "";
  const rawText = await res.text();

  if (!rawText) {
    return { data: null, rawText: "" };
  }

  if (contentType.includes("application/json")) {
    try {
      return {
        data: JSON.parse(rawText),
        rawText,
      };
    } catch {
      throw new Error("Server returned invalid JSON.");
    }
  }

  return {
    data: null,
    rawText,
  };
}

async function request<T = any>(
  path: string,
  {
    method = "GET",
    body,
    requireAuth = true,
    isFormData = false,
    tokenOverride,
    timeoutMs = 30000,
  }: RequestOptions = {}
): Promise<T | UnauthorizedResponse> {
  if (!API_BASE_URL) {
    throw new Error("Missing EXPO_PUBLIC_API_BASE_URL in .env");
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${API_BASE_URL}${normalizedPath}`;

  const headers: Record<string, string> = {};
  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  const resolvedToken = tokenOverride ?? accessToken;

  if (requireAuth) {
    if (!resolvedToken) {
      return { error: "unauthorized", status: 401 };
    }
    headers["Authorization"] = `Bearer ${resolvedToken}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method,
      headers,
      signal: controller.signal,
      body:
        body == null
          ? undefined
          : isFormData
          ? (body as BodyInit)
          : JSON.stringify(body),
    });

    const { data, rawText } = await safeParseResponse(response);

    if (response.status === 401) {
      return { error: "unauthorized", status: 401 };
    }

    if (!response.ok) {
      if (data && typeof data === "object" && "message" in data) {
        throw new Error(String((data as { message?: unknown }).message ?? "Request failed"));
      }

      if (rawText) {
        if (rawText.trim().startsWith("<")) {
          throw new Error(
            `Server returned HTML instead of JSON (${response.status}). Check EXPO_PUBLIC_API_BASE_URL and backend route.`
          );
        }
        throw new Error(rawText);
      }

      throw new Error(`Request failed with status ${response.status}`);
    }

    return data as T;
  } catch (error: any) {
    if (error?.name === "AbortError") {
      throw new Error("Request timed out. Please try again.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function apiRequest<T = any>(
  path: string,
  method: RequestMethod = "GET",
  body?: unknown
) {
  return request<T>(path, { method, body, requireAuth: true });
}

export function publicApiRequest<T = any>(
  path: string,
  method: RequestMethod = "GET",
  body?: unknown
) {
  return request<T>(path, { method, body, requireAuth: false });
}

// Supports BOTH call styles:
// 1) optionalAuthApiRequest(path, "POST", body)
// 2) optionalAuthApiRequest(path, token, { method, body, timeoutMs })
export function optionalAuthApiRequest<T = any>(
  path: string,
  arg2?: string,
  arg3?: unknown
) {
  if (isRequestMethod(arg2)) {
    return request<T>(path, {
      method: arg2,
      body: arg3,
      requireAuth: Boolean(accessToken),
    });
  }

  const token = arg2 ?? accessToken;
  const options = (arg3 ?? {}) as {
    method?: RequestMethod;
    body?: unknown;
    timeoutMs?: number;
  };

  return request<T>(path, {
    method: options.method ?? "GET",
    body: options.body,
    timeoutMs: options.timeoutMs ?? 30000,
    requireAuth: Boolean(token),
    tokenOverride: token,
  });
}

export function formApiRequest<T = any>(
  path: string,
  method: RequestMethod = "POST",
  formData?: FormData
) {
  return request<T>(path, {
    method,
    body: formData,
    requireAuth: true,
    isFormData: true,
  });
}

// Supports existing usage:
// optionalAuthFormRequest(path, formData, token?, timeoutMs?)
export function optionalAuthFormRequest<T = any>(
  path: string,
  formData?: FormData,
  token?: string | null,
  timeoutMs = 30000
) {
  return request<T>(path, {
    method: "POST",
    body: formData,
    requireAuth: Boolean(token ?? accessToken),
    tokenOverride: token ?? accessToken,
    isFormData: true,
    timeoutMs,
  });
}