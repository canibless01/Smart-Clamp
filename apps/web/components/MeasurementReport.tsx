"use client";
import { RecordTable } from "./RecordWorkspace";
import { formatKwh } from "@/lib/api";
export default function MeasurementReport({ data }: { data: any }) {
  const s = data.snapshot;
  return <>
    <section className="card">
      <h2>Issued measurement snapshot</h2>
      <p>Period: {new Date(s.period_start).toLocaleString("en-NG", { timeZone: "Africa/Lagos" })} to {new Date(s.period_end).toLocaleString("en-NG", { timeZone: "Africa/Lagos" })} (Lagos, end exclusive).</p>
      <p>Consumption in eligible measured intervals: {s.consumption_status === "unavailable" ? "Unavailable" : formatKwh(s.measured_consumption_mwh)}</p>
      <p>{s.coverage.observation_count} observations · {s.coverage.eligible_intervals} eligible intervals · {s.coverage.requested_period_ms ? (100 * s.coverage.counter_interval_ms / s.coverage.requested_period_ms).toFixed(1) : "0"}% counter-interval coverage.</p>
      <p>{data.signature_valid ? "Stored snapshot signature verified." : "Signature verification unavailable."} {data.revoked ? "Public sharing revoked." : ""}</p>
      <p className="quiet-note">{data.qualification}</p>
      <ul>{s.limitations.map((line: string) => <li key={line}>{line}</li>)}</ul>
      <details><summary>Signature and integrity reference</summary><p style={{ overflowWrap: "anywhere" }}>SHA-256: {data.sha256}</p><p style={{ overflowWrap: "anywhere" }}>Signing-key fingerprint: {data.key_id}</p><p>Report: {data.id}</p></details>
    </section>
    <section className="card" style={{ marginTop: 24 }}><h2>Snapshot observations</h2>
      <RecordTable items={s.readings} columns={[
        { key: "occurred_at_ms", label: "Observed (Lagos)", render: r => new Date(r.occurred_at_ms).toLocaleString("en-NG", { timeZone: "Africa/Lagos" }) },
        { key: "real_power_mw", label: "Power", render: r => r.real_power_mw == null ? "Unavailable" : `${r.real_power_mw / 1000} W` },
        { key: "quality", label: "Quality" }, { key: "clock_quality", label: "Clock confidence" },
        { key: "import_mwh", label: "Cumulative import", render: r => r.import_mwh == null ? "Unavailable" : formatKwh(r.import_mwh) },
      ]} />
    </section>
  </>;
}
