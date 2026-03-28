const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || "").replace(/\/+$/, "");

let accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

async function request(
  url: string,
  method: HttpMethod = "GET",
  body?: unknown,
  requireAuth: boolean = true
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (requireAuth && accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${url}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();

  if (!contentType.includes("application/json")) {
    throw new Error(
      `Server returned HTML instead of JSON (${response.status}). Check EXPO_PUBLIC_API_BASE_URL and backend route.`
    );
  }

  let data: any;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error("Server returned invalid JSON.");
  }

  if (response.status === 401) {
    return { error: "unauthorized", status: 401 } as const;
  }

  if (!response.ok) {
    throw new Error(data?.message || `Request failed with status ${response.status}`);
  }

  return data;
}

export const apiRequest = (
  url: string,
  method?: HttpMethod,
  body?: unknown
) => request(url, method, body, true);

export const publicApiRequest = (
  url: string,
  method?: HttpMethod,
  body?: unknown
) => request(url, method, body, false);

export const optionalAuthApiRequest = (
  url: string,
  method?: HttpMethod,
  body?: unknown
) => request(url, method, body, false);