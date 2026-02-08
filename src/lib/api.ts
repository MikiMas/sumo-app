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

const apiTimeoutRaw = Number(process.env.EXPO_PUBLIC_API_TIMEOUT_MS ?? 12000);
const apiTimeoutMs = Number.isFinite(apiTimeoutRaw) && apiTimeoutRaw > 0 ? apiTimeoutRaw : 12000;

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

  const url = buildUrl(path);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), apiTimeoutMs);

  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method ?? "GET",
      headers,
      body,
      signal: controller.signal
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.toLowerCase().includes("abort")) {
      throw new Error(`REQUEST_TIMEOUT_${apiTimeoutMs}MS`);
    }
    throw new Error(`NETWORK_ERROR: ${message}`);
  } finally {
    clearTimeout(timeout);
  }

  const text = await response.text();
  let payload: T & ApiErrorBody = {} as T & ApiErrorBody;
  if (text) {
    try {
      payload = JSON.parse(text) as T & ApiErrorBody;
    } catch {
      if (!response.ok) {
        const preview = text.trim().slice(0, 120);
        throw new Error(
          `HTTP_${response.status} ${url}: respuesta no JSON del servidor${preview ? ` (${preview})` : ""}`
        );
      }
      const preview = text.trim().slice(0, 120);
      throw new Error(
        `Respuesta invalida del servidor en ${url} (no es JSON)${preview ? ` (${preview})` : ""}`
      );
    }
  }

  if (!response.ok) {
    const message = payload.error ?? payload.message ?? `HTTP_${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}
