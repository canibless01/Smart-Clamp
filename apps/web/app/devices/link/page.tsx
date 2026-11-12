"use client";
import { useState, useEffect } from "react";
import AppShell from "@/components/AppShell";
import { apiFetch } from "@/lib/api";
export default function Page() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const [code, setCode] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [result, setResult] = useState<any>(null);
  return (
    <AppShell>
      <h1>Link your SmartClamp</h1>
      <p>
        Use the single-use claim code supplied with your device or by your
        installer. This links the account; it does not bypass installation or
        calibration.
      </p>
      <form
        className="resource-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            const room_id = new URLSearchParams(location.search).get("room_id");
            setResult(
              await apiFetch("/devices/claim", {
                method: "POST",
                body: JSON.stringify({
                  claim_code: code.trim(),
                  ...(room_id ? { room_id } : {}),
                }),
              }),
            );
            setCode("");
          } catch (e) {
            setError(e instanceof Error ? e.message : "Unable to link.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Device claim code
          <input
            className="input"
            disabled={!ready}
            required
            autoComplete="off"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </label>
        {!result && (
          <button className="btn btn-primary" disabled={!ready || busy}>
            {busy ? "Linking…" : "Link SmartClamp"}
          </button>
        )}
      </form>
      {error && (
        <p role="alert" className="error-panel">
          {error}
        </p>
      )}
      {result && (
        <section className="card" role="status">
          <h2>SmartClamp linked</h2>
          <p>{result.message}</p>
          <a className="btn btn-primary" href={`/devices/${result.device_id}`}>
            View device
          </a>
        </section>
      )}
    </AppShell>
  );
}
