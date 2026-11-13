"use client";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { hasSession, loginPath, roleHome, subject } from "@/lib/session";
export function useWorkspaceSession() {
  const [status, setStatus] = useState<"checking" | "authenticated" | "unavailable">("checking");
  const [role, setRole] = useState("");
  const verify = useCallback(async () => {
    setStatus("checking");
    if (!hasSession()) { location.replace(loginPath()); return; }
    try {
      const context = await apiFetch("/users/me/context"); const actual = context.authorized_context?.role;
      if (!actual || !roleHome[actual]) throw new Error("Your account needs a supported workspace.");
      const path = location.pathname;
      const expected = path.match(/^\/dashboard\/(tenant|homeowner|landlord|utility)(\/|$)/)?.[1];
      if ((expected && actual !== (expected === "utility" ? "nepa_staff" : expected)) || (path.startsWith("/ops") && !actual.startsWith("internal_")) || (path.startsWith("/admin") && actual !== "internal_superadmin")) {
        location.replace(roleHome[actual]); return;
      }
      setRole(actual); setStatus("authenticated");
    } catch (e: any) {
      if (e.body?.code === 'profile_required') location.replace('/account/complete-profile?next='+encodeURIComponent(location.pathname+location.search));
      else if (e.status === 401) location.replace(loginPath());
      else setStatus("unavailable");
    }
  }, []);
  useEffect(() => { void verify(); }, [verify]);
  useEffect(() => {
    const ended = () => location.replace(loginPath());
    const changed = (e: StorageEvent) => {
      if (e.key !== "smartclamp_token") return;
      if (!e.newValue) ended();
      else if (subject(e.oldValue) !== subject(e.newValue)) location.reload();
    };
    window.addEventListener("smartclamp:session-ended", ended); window.addEventListener("storage", changed);
    const resumed = () => { if (document.visibilityState === "visible" && !hasSession()) ended(); };
    document.addEventListener("visibilitychange", resumed);
    return () => { window.removeEventListener("smartclamp:session-ended", ended); window.removeEventListener("storage", changed); document.removeEventListener("visibilitychange", resumed); };
  }, []);
  return { status, role, retry: verify };
}
