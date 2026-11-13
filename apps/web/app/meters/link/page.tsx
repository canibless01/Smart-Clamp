"use client";
import { useState, useEffect } from "react";
import AppShell from "@/components/AppShell";
import { apiFetch } from "@/lib/api";
export default function Page() {
  const [meter, setMeter] = useState(""),
    [providers, setProviders] = useState<any[]>([]),
    [service, setService] = useState(""),
    [busy, setBusy] = useState(false),
    [result, setResult] = useState<any>(null),
    [error, setError] = useState("");
  useEffect(() => {
    apiFetch("/public/electricity-providers")
      .then((d) => {
        setProviders(d.items);
        if (d.items.length === 1) setService(d.items[0].id);
      })
      .catch((e) => setError(e.message));
  }, []);
  return (
    <AppShell>
      <h1>Link your meter account</h1>
      <p>
        Account validation is separate from an optical reader connection. It
        does not supply live balance or usage history.
      </p>
      <form
        className="resource-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            setResult(
              await apiFetch("/meters/link", {
                method: "POST",
                body: JSON.stringify({
                  meter_number: meter,
                  service_id: service,
                }),
              }),
            );
          } catch (e) {
            setError(e instanceof Error ? e.message : "Unable to link.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Electricity provider
          <select
            className="input"
            required
            value={service}
            onChange={(e) => setService(e.target.value)}
          >
            <option value="">Choose a provider</option>
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Meter number
          <input
            className="input"
            required
            inputMode="numeric"
            pattern="[0-9]{6,20}"
            value={meter}
            onChange={(e) => setMeter(e.target.value)}
          />
        </label>
        <button className="btn btn-primary" disabled={busy || !service}>
          {busy ? "Validating…" : "Validate and save account"}
        </button>
      </form>
      {error && (
        <p className="error-panel" role="alert">
          {error}
        </p>
      )}
      {result && (
        <section className="card" role="status">
          <h2>Meter account saved</h2>
          <p>{result.connection_status}</p>
          <p>Account reference for installation support: {result.id}</p>
          <a className="btn btn-primary" href="/billing">Buy electricity for this meter</a>
          <a className="btn btn-secondary" href="/ir-reader/setup">
            Explore reader installation
          </a>
        </section>
      )}
    </AppShell>
  );
}
