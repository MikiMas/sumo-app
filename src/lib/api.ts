import { env } from "@/lib/env";
import { getStoredAccessToken } from "@/lib/authStorage";

type ApiRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  auth?: boolean;
  token?: string | null;
};

type ApiErrorBody = {
  error?: string;
  message?: string;
};

function ensureApiBaseUrl(): string {
  if (!env.apiBaseUrl) {
    throw new Error("Falta EXPO_PUBLIC_API_URL en el entorno.");
  }

  return env.apiBaseUrl;
}

function buildUrl(path: string): string {
  const base = ensureApiBaseUrl();
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const url = buildUrl(path);

  const headers: Record<string, string> = {
    Accept: "application/json"
  };

  let body: string | undefined;
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  if (options.auth) {
    const token = options.token ?? (await getStoredAccessToken());
    if (!token) {
      throw new Error("UNAUTHORIZED");
    }
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers,
    body
  });

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as T & ApiErrorBody) : ({} as T & ApiErrorBody);

  if (!response.ok) {
    const message = payload.error ?? payload.message ?? `HTTP_${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}
