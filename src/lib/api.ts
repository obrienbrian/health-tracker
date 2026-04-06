const API_BASE = "/api";

let token: string | null = localStorage.getItem("healthtracker_token");

export function setToken(newToken: string | null) {
  token = newToken;
  if (newToken) {
    localStorage.setItem("healthtracker_token", newToken);
  } else {
    localStorage.removeItem("healthtracker_token");
  }
}

export function getToken(): string | null {
  return token;
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) ?? {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }

  return data as T;
}
