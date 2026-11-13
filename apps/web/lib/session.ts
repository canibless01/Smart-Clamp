/** Browser session lifecycle. Server-side authorization remains authoritative. */
export type RefreshResult = "refreshed" | "invalid" | "unavailable";
let refreshing: Promise<RefreshResult> | null = null;
const keys = ["smartclamp_token", "smartclamp_refresh_token", "smartclamp_role"];
export function getAccessToken() { return typeof window === "undefined" ? null : localStorage.getItem(keys[0]); }
export function hasSession() { return typeof window !== "undefined" && !!(getAccessToken() || localStorage.getItem(keys[1])); }
export function subject(token: string | null): string | null {
  if (!token) return null;
  try { const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"); return JSON.parse(atob(part)).sub || null; } catch { return null; }
}
export function tokenNeedsRefresh(token = getAccessToken()) {
  if (!token) return true;
  try { const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"); const exp = JSON.parse(atob(part)).exp; return typeof exp === "number" && exp * 1000 <= Date.now() + 60000; } catch { return false; }
}
export function storeSession(data: { access_token: string; refresh_token?: string; role?: string }) {
  localStorage.setItem(keys[0], data.access_token);
  if (data.refresh_token) localStorage.setItem(keys[1], data.refresh_token); else localStorage.removeItem(keys[1]);
  if (data.role) localStorage.setItem(keys[2], data.role); else localStorage.removeItem(keys[2]);
  window.dispatchEvent(new Event("smartclamp:session-updated"));
}
export function clearSession() {
  if (typeof window === "undefined") return;
  keys.forEach(k => localStorage.removeItem(k));
  window.dispatchEvent(new Event("smartclamp:session-ended"));
}
export function refreshSession(base: string): Promise<RefreshResult> {
  if (refreshing) return refreshing;
  const original = getAccessToken();
  const perform = async (): Promise<RefreshResult> => {
    // Another tab may have rotated both tokens while this tab waited for the lock.
    if (getAccessToken() !== original && !tokenNeedsRefresh()) return "refreshed";
    const refresh_token = localStorage.getItem(keys[1]);
    if (!refresh_token) return "invalid";
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const r = await fetch(`${base}/auth/refresh`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refresh_token }), signal: controller.signal, cache: "no-store" });
      if (r.status === 400 || r.status === 401 || r.status === 403) return "invalid";
      if (!r.ok) return "unavailable";
      const data = await r.json(); if (!data.access_token || !data.refresh_token) return "unavailable";
      storeSession(data); return "refreshed";
    } catch { return "unavailable"; }
    finally { clearTimeout(timer); }
  };
  refreshing = (typeof navigator !== "undefined" && navigator.locks ? navigator.locks.request("smartclamp-auth-refresh", perform) : perform()).finally(() => { refreshing = null; });
  return refreshing;
}
export function safeReturnPath(candidate: string | null, fallback: string) {
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//") || /[\\\r\n]/.test(candidate)) return fallback;
  const allowed = /^\/(dashboard|devices|history|billing|control|alerts|settings|reports|ops|portal|orders|disputes|join|meters|ir-reader|admin|communications)(\/|\?|$)|^\/support\/tickets\//;
  return allowed.test(candidate) ? candidate : fallback;
}
export function loginPath() {
  return `/login?next=${encodeURIComponent(location.pathname + location.search)}`;
}
export const roleHome: Record<string, string> = {
  tenant: "/dashboard/tenant", landlord: "/dashboard/landlord", homeowner: "/dashboard/homeowner", nepa_staff: "/dashboard/utility",
  installer: "/portal", agent: "/portal", referrer: "/portal", internal_ops: "/ops", internal_finance: "/ops", internal_support: "/communications", internal_engineering: "/ops", internal_superadmin: "/ops",
};
