"use client";
import { useState, useEffect } from "react";
import PublicShell from "@/components/PublicShell";
import { apiFetch } from "@/lib/api";
export default function Page() {
  const [ready, setReady] = useState(false),
    [phone, setPhone] = useState(""),
    [code, setCode] = useState(""),
    [password, setPassword] = useState(""),
    [stage, setStage] = useState("request"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => setReady(true), []);
  return (
    <PublicShell>
      <div className="container marketing-page" style={{ maxWidth: 600 }}>
        <h1>Recover your account</h1>
        <p>
          Verify the phone registered to your account before choosing a new
          password.
        </p>
        {stage === "done" ? (
          <p role="status">
            Your password was updated. Log in with your new password.
          </p>
        ) : (
          <form
            className="resource-form"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                if (stage === "request") {
                  await apiFetch("/auth/recovery/phone", {
                    method: "POST",
                    body: JSON.stringify({ phone }),
                  });
                  setStage("verify");
                } else {
                  await apiFetch("/auth/recovery/complete", {
                    method: "POST",
                    body: JSON.stringify({ phone, code, password }),
                  });
                  setPassword("");
                  setCode("");
                  setStage("done");
                }
              } catch (e) {
                setError(
                  e instanceof Error
                    ? e.message
                    : "Unable to complete recovery.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Phone number
              <input
                className="input"
                type="tel"
                required
                autoComplete="tel"
                value={phone}
                disabled={!ready || stage !== "request"}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+2348012345678"
              />
            </label>
            {stage === "verify" && (
              <>
                <label>
                  Verification code
                  <input
                    className="input"
                    required
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </label>
                <label>
                  New password
                  <input
                    className="input"
                    required
                    minLength={8}
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </label>
              </>
            )}
            {error && (
              <p role="alert" className="error-panel">
                {error}
              </p>
            )}
            <button className="btn btn-primary" disabled={!ready || busy}>
              {busy
                ? "Please wait…"
                : stage === "request"
                  ? "Send phone verification code"
                  : "Verify and update password"}
            </button>
          </form>
        )}
        <div className="resource-actions">
          <a className="btn btn-secondary" href="/login">
            Back to log in
          </a>
          <a className="text-link" href="/support">
            Account help
          </a>
        </div>
      </div>
    </PublicShell>
  );
}
