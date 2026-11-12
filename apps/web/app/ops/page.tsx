"use client";
import RecordWorkspace, { RecordTable } from "@/components/RecordWorkspace";
import { apiFetch } from "@/lib/api";
import { useState } from "react";
export default function Page() {
  const [device, setDevice] = useState(""),
    [kind, setKind] = useState("repair"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <RecordWorkspace
      title="Operations"
      description="Fleet connectivity, installation and repair records from your database."
      endpoint="/ops/summary"
      role="internal_ops"
    >
      {(data, reload) => (
        <>
          <div className="grid-12">
            {Object.entries(data.fleet).map(([key, value]) => (
              <div className="card" style={{ gridColumn: "span 3" }} key={key}>
                <p>{key.replace(/_/g, " ")}</p>
                <strong style={{ fontSize: 30 }}>{String(value)}</strong>
              </div>
            ))}
          </div>
          <section className="card" style={{ marginTop: 24 }}>
            <h2>Work orders</h2>
            <RecordTable
              items={data.jobs}
              columns={[
                { key: "kind", label: "Work" },
                { key: "status", label: "Status" },
                { key: "device_id", label: "Device" },
                {
                  key: "opened_at",
                  label: "Opened",
                  render: (r) => new Date(r.opened_at).toLocaleString(),
                },
              ]}
            />
            <form
              className="resource-form"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setError("");
                try {
                  await apiFetch("/ops/jobs", {
                    method: "POST",
                    body: JSON.stringify({ device_id: device, kind }),
                  });
                  setDevice("");
                  reload();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Unable to save.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              <h3>Create work order</h3>
              <label>
                Device ID
                <input
                  className="input"
                  required
                  value={device}
                  onChange={(e) => setDevice(e.target.value)}
                />
              </label>
              <label>
                Work type
                <select
                  className="input"
                  value={kind}
                  onChange={(e) => setKind(e.target.value)}
                >
                  <option value="repair">Repair</option>
                  <option value="installation">Installation</option>
                  <option value="inspection">Inspection</option>
                </select>
              </label>
              {error && <p role="alert">{error}</p>}
              <button className="btn btn-primary" disabled={busy}>
                {busy ? "Saving…" : "Create work order"}
              </button>
            </form>
          </section>
          <p className="quiet-note">
            Revenue, CAC, runway and churn require configured financial inputs.
            Wallet balances are customer liabilities and are not reported as
            revenue.
          </p>
        </>
      )}
    </RecordWorkspace>
  );
}
