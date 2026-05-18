const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api/v1";
import { getStoredAuth } from "@/lib/auth";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `Erro HTTP ${response.status}`;
    if (response.status === 403) {
      message = "Sem permissao para executar esta acao. Entre novamente com um usuario administrador ou operador.";
    }
    try {
      const payload = await response.json();
      if (payload?.message) {
        message = payload.message;
      } else if (payload?.error) {
        message = payload.error;
      }
    } catch {
      // noop
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: buildHeaders(),
  });
  return parseResponse<T>(response);
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: buildHeaders(),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return parseResponse<T>(response);
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "PUT",
    headers: buildHeaders(),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return parseResponse<T>(response);
}

export async function apiDelete(path: string): Promise<void> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "DELETE",
    headers: buildHeaders(),
  });
  return parseResponse<void>(response);
}

export async function apiPostForm<T>(path: string, body: FormData): Promise<T> {
  const headers: Record<string, string> = {};
  const auth = getStoredAuth();
  if (auth?.token) {
    headers.Authorization = auth.token;
  }
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body,
  });
  return parseResponse<T>(response);
}

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

function buildHeaders(): HeadersInit {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const auth = getStoredAuth();
  if (auth?.token) {
    headers.Authorization = auth.token;
  }
  return headers;
}
