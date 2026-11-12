/**
 * API base handling:
 * - In browser: NEXT_PUBLIC_API_BASE (e.g. http://localhost:5000/api/v1 or /api/v1 for same-origin proxy)
 * - On server (SSR): same, but fallback to http://localhost:5000/api/v1 for local dev
 * - In production with same-origin reverse proxy, set NEXT_PUBLIC_API_BASE=/api/v1 and NEXT_PUBLIC_API_PROXY_TARGET
 */
export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  (typeof window === "undefined"
    ? process.env.API_PROXY_TARGET
      ? `${process.env.API_PROXY_TARGET}/api/v1`
      : "http://localhost:5000/api/v1"
    : "/api/v1");

export type ApiError = {
  code: string;
  message: string;
  request_id: string;
  retry_after_seconds?: number;
};

let refreshInFlight: Promise<boolean> | null = null;
async function refreshSession() {
  const refresh_token = localStorage.getItem("smartclamp_refresh_token");
  if (!refresh_token) return false;
  try {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token }),
    });
    if (!response.ok) return false;
    const data = await response.json();
    if (!data.access_token || !data.refresh_token) return false;
    localStorage.setItem("smartclamp_token", data.access_token);
    localStorage.setItem("smartclamp_refresh_token", data.refresh_token);
    localStorage.setItem("smartclamp_role", data.role);
    return true;
  } catch {
    return false;
  }
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  const url = `${API_BASE}${path}`;
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("smartclamp_token")
      : null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init.headers as Record<string, string>) || {}),
  };
  if (
    init.method &&
    !["GET", "HEAD"].includes(init.method.toUpperCase()) &&
    !headers["Idempotency-Key"]
  )
    headers["Idempotency-Key"] = crypto.randomUUID();
  if (token && !headers["Authorization"])
    headers["Authorization"] = `Bearer ${token}`;
  let res = await fetch(url, {
    ...init,
    headers,
    cache: "no-store",
  });
  if (
    res.status === 401 &&
    token &&
    !path.startsWith("/auth/") &&
    typeof window !== "undefined"
  ) {
    if (!refreshInFlight)
      refreshInFlight = refreshSession().finally(() => {
        refreshInFlight = null;
      });
    if (await refreshInFlight) {
      headers.Authorization = `Bearer ${localStorage.getItem("smartclamp_token")}`;
      res = await fetch(url, { ...init, headers, cache: "no-store" });
    }
  }
  if (!res.ok) {
    let body: any = {};
    try {
      body = await res.json();
    } catch {}
    const err: any = new Error(body.message || `API ${res.status}`);
    err.status = res.status;
    err.body = body;
    err.request_id = res.headers.get("X-Request-Id") || body.request_id;
    throw err;
  }
  if (res.status === 204) return null;
  // Some endpoints return empty 202 with JSON
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function formatNaira(kobo: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
  }).format(kobo / 100);
}
export function formatKwh(mwh: number) {
  return (mwh / 1000000).toFixed(3) + " kWh";
}

export const STATES = {
  stale: { label: "Stale", class: "badge-stale" },
  offline: { label: "Offline", class: "badge-offline" },
  unknown: { label: "Unknown", class: "badge-unknown" },
  verified: { label: "Verified", class: "badge-verified" },
};

// Auth helpers
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("smartclamp_token");
}
export function getRole(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("smartclamp_role");
}
export async function logout() {
  if (typeof window === "undefined") return;
  try {
    await apiFetch("/auth/logout", { method: "POST" });
  } catch {}
  sessionStorage.clear();
  localStorage.removeItem("smartclamp_refresh_token");
  localStorage.removeItem("smartclamp_token");
  localStorage.removeItem("smartclamp_role");
  location.href = "/login";
}
export function requireToken(): string {
  const t = getToken();
  if (!t) throw new Error("Not authenticated");
  return t;
}
