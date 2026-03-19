const BASE_URL = typeof window !== "undefined" ? "" : "http://localhost:3000";

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = fetch(`${BASE_URL}/api/auth/refresh`, {
    method: "POST",
    credentials: "include",
  })
    .then((res) => res.ok)
    .finally(() => {
      isRefreshing = false;
      refreshPromise = null;
    });

  return refreshPromise;
}

async function request<T = unknown>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const opts: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  };

  if (body !== undefined) {
    opts.body = JSON.stringify(body);
  }

  let res = await fetch(`${BASE_URL}${path}`, opts);

  // Auto-refresh on 401 and retry once
  if (res.status === 401) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      res = await fetch(`${BASE_URL}${path}`, opts);
    }
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const err = new Error(data.error || `Request failed: ${res.status}`);
    (err as any).status = res.status;
    throw err;
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

async function uploadRequest<T = unknown>(
  path: string,
  formData: FormData
): Promise<T> {
  const opts: RequestInit = {
    method: "POST",
    credentials: "include",
    body: formData,
  };

  let res = await fetch(`${BASE_URL}${path}`, opts);

  if (res.status === 401) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      res = await fetch(`${BASE_URL}${path}`, opts);
    }
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const err = new Error(data.error || `Request failed: ${res.status}`);
    (err as any).status = res.status;
    throw err;
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T = unknown>(path: string) => request<T>("GET", path),
  post: <T = unknown>(path: string, body?: unknown) =>
    request<T>("POST", path, body),
  patch: <T = unknown>(path: string, body?: unknown) =>
    request<T>("PATCH", path, body),
  delete: <T = unknown>(path: string) => request<T>("DELETE", path),
  upload: <T = unknown>(path: string, formData: FormData) =>
    uploadRequest<T>(path, formData),
};
