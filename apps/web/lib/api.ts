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

import { getAccessToken, refreshSession, tokenNeedsRefresh, clearSession, hasSession } from "./session";
function sessionError(unavailable: boolean) {
  const error: any = new Error(unavailable ? "Your sign-in could not be refreshed. Your session is retained; reconnect and retry." : "Please log in to continue.");
  error.status = unavailable ? 503 : 401; return error;
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  const url = `${API_BASE}${path}`;
  const browser = typeof window !== "undefined";
  const authPath = ["/auth/login", "/auth/signup", "/auth/verify", "/auth/refresh", "/auth/recovery", "/auth/recovery/phone", "/auth/recovery/complete", "/auth/options", "/auth/oauth/start", "/auth/oauth/exchange"].includes(path);
  const publicPath = path.startsWith("/public/") || path === "/meters/validate";
  if (browser && !authPath && !publicPath && hasSession() && localStorage.getItem("smartclamp_refresh_token") && tokenNeedsRefresh()) {
    const state = await refreshSession(API_BASE);
    if (state === "invalid") { clearSession(); throw sessionError(false); }
    if (state === "unavailable") throw sessionError(true);
  }
  const token = getAccessToken();
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (init.method && !["GET", "HEAD"].includes(init.method.toUpperCase()) && !headers.has("Idempotency-Key")) headers.set("Idempotency-Key", crypto.randomUUID());
  if (token && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
  let res = await fetch(url, {
    ...init,
    headers,
    cache: "no-store",
  });
  if (res.status === 401 && token && !authPath && !publicPath && browser) {
    const state = await refreshSession(API_BASE);
    if (state === "refreshed") {
      headers.set("Authorization", `Bearer ${getAccessToken()}`);
      res = await fetch(url, { ...init, headers, cache: "no-store" });
    } else if (state === "invalid") { clearSession(); throw sessionError(false); }
    else throw sessionError(true);
  }
  if (res.status === 401 && !authPath && !publicPath && browser) clearSession();
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
    const registration=await navigator.serviceWorker?.getRegistration('/');
    const subscription=await registration?.pushManager.getSubscription();
    if(subscription){
      await fetch(`${API_BASE}/users/me/push-subscriptions`,{method:'DELETE',headers:{'Content-Type':'application/json','Authorization':`Bearer ${getAccessToken()}`},body:JSON.stringify({endpoint:subscription.endpoint}),signal:AbortSignal.timeout(2000)}).catch(()=>{});
      await Promise.race([subscription.unsubscribe(),new Promise(resolve=>setTimeout(resolve,2000))]);
    }
  } catch {}
  try {
    await apiFetch("/auth/logout", { method: "POST",signal:AbortSignal.timeout(5000) });
  } catch {}
  sessionStorage.clear();
  clearSession();
  location.href = "/login";
}
export function requireToken(): string {
  const t = getToken();
  if (!t) throw new Error("Not authenticated");
  return t;
}
