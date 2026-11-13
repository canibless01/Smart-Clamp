"use client";
import RecordWorkspace, { RecordTable } from "@/components/RecordWorkspace";
import { apiFetch } from "@/lib/api";
import { useState } from "react";
export default function Page() {
  const [device, setDevice] = useState(""),
    [kind, setKind] = useState("repair"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [buildingId, setBuildingId] = useState(""), [meterId, setMeterId] = useState(""), [tariffVersion, setTariffVersion] = useState(""), [billingMessage, setBillingMessage] = useState("");
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
          <div className="resource-actions"><a className="btn btn-secondary" href="/ops/firmware">Firmware updates</a></div>
          <section className="card" style={{ marginTop: 24 }}>
            <h2>Work orders</h2>
            <RecordTable
              items={data.jobs}
              columns={[
                { key: "id", label: "Work order", render: (r) => <a className="text-link" href={`/portal/jobs/${r.id}`}>Review work order</a> },
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
          <section className="card" style={{ marginTop: 24 }}>
            <h2>SMS delivery review</h2>
            <p>Unknown dispatches need provider reconciliation before any resend. Queued records may be waiting for quiet hours or provider configuration.</p>
            <RecordTable items={data.sms_delivery_issues} columns={[
              { key: "id", label: "Delivery reference" },
              { key: "template_key", label: "Event" },
              { key: "status", label: "Status" },
              { key: "last_error", label: "Review reason" },
            ]} />
          </section>
          <section className="card" style={{ marginTop: 24 }}>
            <h2>Payment recovery review</h2>
            <p>Unknown outcomes verify or requery the original transaction. They must not trigger another charge. Dead-letter records need provider reconciliation and a reviewed resolution.</p>
            <RecordTable items={data.payment_recovery_issues} columns={[
              { key: "payment_id", label: "Payment reference" }, { key: "event_type", label: "Recovery step" },
              { key: "status", label: "State" }, { key: "last_error", label: "Review reason" }, { key: "attempts", label: "Attempts" },
            ]} />
          </section>
          <section className="card" style={{ marginTop: 24 }}>
            <h2>Activate a central payment destination</h2>
            <p>The landlord validates the central meter first. Use an approved provider tariff from the database. Each room retains its own credit; this does not let a landlord resell or transfer residents’ units.</p>
            <form className="resource-form" onSubmit={async e => {
              e.preventDefault(); setBusy(true); setBillingMessage("");
              try {
                await apiFetch(`/ops/buildings/${buildingId}/payment-destination`, { method: "POST", body: JSON.stringify({ linked_meter_id: meterId, tariff_version: tariffVersion }) });
                setBillingMessage("Central destination configured. Existing empty room wallets and future room claims use this meter."); reload();
              } catch (e) { setBillingMessage(e instanceof Error ? e.message : "Unable to configure destination."); }
              finally { setBusy(false); }
            }}>
              <label>Building reference<input className="input" required value={buildingId} onChange={e => setBuildingId(e.target.value)} /></label>
              <label>Validated central meter account reference<input className="input" required value={meterId} onChange={e => setMeterId(e.target.value)} /></label>
              <label>Approved tariff version<input className="input" required value={tariffVersion} onChange={e => setTariffVersion(e.target.value)} /></label>
              <button className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : "Configure central meter"}</button>
              {billingMessage && <p role="status">{billingMessage}</p>}
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
