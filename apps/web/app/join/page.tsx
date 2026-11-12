"use client";
import { useEffect, useState } from "react";
import PublicShell from "@/components/PublicShell";
import { apiFetch } from "@/lib/api";
export default function Page() {
  const [token, setToken] = useState(""),
    [signedIn, setSignedIn] = useState(false),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState(false);
  useEffect(() => {
    const invited = new URLSearchParams(location.search).get("token") || "";
    setToken(invited);
    if (invited) sessionStorage.setItem("smartclamp_invitation", invited);
    setSignedIn(!!localStorage.getItem("smartclamp_token"));
  }, []);
  return (
    <PublicShell>
      <div className="container marketing-page">
        <h1>Your room invitation</h1>
        <p>
          Accept to view the SmartClamp assigned to your room. Earlier
          residents’ readings remain private.
        </p>
        {!signedIn ? (
          <>
            <p>
              Log in with your tenant account, then return to this invitation.
            </p>
            <a className="btn btn-primary" href="/login">
              Log in
            </a>
            <a className="btn btn-secondary" href="/signup?setup=tenant">
              Create a tenant account
            </a>
          </>
        ) : done ? (
          <>
            <p role="status">You have joined your room.</p>
            <a className="btn btn-primary" href="/dashboard/tenant">
              Open my dashboard
            </a>
          </>
        ) : (
          <button
            className="btn btn-primary"
            disabled={!token || busy}
            onClick={async () => {
              setBusy(true);
              setStatus("");
              try {
                await apiFetch("/invitations/accept", {
                  method: "POST",
                  body: JSON.stringify({ token }),
                });
                setDone(true);
                sessionStorage.removeItem("smartclamp_invitation");
                history.replaceState(null, "", "/join");
              } catch (e) {
                setStatus(e instanceof Error ? e.message : "Unable to accept.");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Joining…" : "Join my room"}
          </button>
        )}
        {status && <p role="alert">{status}</p>}
      </div>
    </PublicShell>
  );
}
