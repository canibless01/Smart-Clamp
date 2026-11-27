"use client";
import {useState} from "react";
import ReportSharingQr from "./ReportSharingQr";
import Icon from "./Icon";
import { RecordTable } from "./RecordWorkspace";
import { formatKwh } from "@/lib/api";
export default function MeasurementReport({ data,sharePath }: { data: any;sharePath?:string }) {
  const [showQr,setShowQr]=useState(false);
  const s = data.snapshot;
  function downloadEvidence(){const payload={schema_version:1,environment:data.environment,id:data.id,snapshot:s,canonical_base64:data.canonical_base64,sha256:data.sha256,signature:data.signature,key_id:data.key_id,public_key_pem:data.public_key_pem,issued_at:data.issued_at,qualification:data.qualification};const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download=`smartclamp-${data.id}-signed.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  return <div className="measurement-report">
    <div className="resource-actions report-controls"><button className="btn btn-secondary" onClick={()=>window.print()}>Print / save PDF</button><button className="btn btn-secondary" onClick={downloadEvidence}>Download signed evidence</button>{sharePath&&!data.revoked&&<button className="btn btn-secondary" aria-expanded={showQr} onClick={()=>setShowQr(value=>!value)}>{showQr?'Hide sharing QR':'Show sharing QR'}</button>}</div>
    <section className="card">
      <div className="report-heading"><h2>Issued measurement snapshot</h2><span className={"report-seal "+(data.signature_valid?"is-verified":"is-unverified")} role="img" aria-label={data.signature_valid?"Stored snapshot signature verified":"Signature not verified"}><Icon name={data.signature_valid?"check":"shield"} size={24}/>{data.signature_valid?"SIGNATURE VERIFIED":"UNVERIFIED"}</span></div>
      {data.environment==='isolated_qa'&&<p className="quiet-note">Isolated QA · no production hardware evidence.</p>}
      {data.environment==='unrecorded'&&<p className="quiet-note">Issuing environment was not recorded in this historical snapshot.</p>}
      <p>Period: {new Date(s.period_start).toLocaleString("en-NG", { timeZone: "Africa/Lagos" })} to {new Date(s.period_end).toLocaleString("en-NG", { timeZone: "Africa/Lagos" })} (Lagos, end exclusive).</p>
      <p>Consumption in eligible measured intervals: {s.consumption_status === "unavailable" ? "Unavailable" : formatKwh(s.measured_consumption_mwh)}</p>
      <p>{s.coverage.observation_count} observations · {s.coverage.eligible_intervals} eligible intervals · {s.coverage.requested_period_ms ? (100 * s.coverage.counter_interval_ms / s.coverage.requested_period_ms).toFixed(1) : "0"}% counter-interval coverage.</p>
      <p>{data.signature_valid ? "Stored snapshot signature verified." : "Signature verification unavailable."} {data.revoked ? "Public sharing revoked." : ""}</p>
      <p className="quiet-note">{data.qualification}</p>
      <ul>{s.limitations.map((line: string) => <li key={line}>{line}</li>)}</ul>
      <p className="report-print-proof">Report: {data.id}<br/>SHA-256: {data.sha256}<br/>Signing-key fingerprint: {data.key_id}</p>
      <details><summary>Signature and integrity reference</summary><p style={{ overflowWrap: "anywhere" }}>SHA-256: {data.sha256}</p><p style={{ overflowWrap: "anywhere" }}>Signing-key fingerprint: {data.key_id}</p><p>Report: {data.id}</p></details>
    </section>
    {showQr&&sharePath&&!data.revoked&&<ReportSharingQr path={sharePath} expiresAt={data.expires_at}/>}
    <section className="card" style={{ marginTop: 24 }}><h2>Snapshot observations</h2>
      <RecordTable items={s.readings} columns={[
        { key: "occurred_at_ms", label: "Observed (Lagos)", render: r => new Date(r.occurred_at_ms).toLocaleString("en-NG", { timeZone: "Africa/Lagos" }) },
        { key: "real_power_mw", label: "Power", render: r => r.real_power_mw == null ? "Unavailable" : `${r.real_power_mw / 1000} W` },
        { key: "quality", label: "Quality" }, { key: "clock_quality", label: "Clock confidence" },
        { key: "import_mwh", label: "Cumulative import", render: r => r.import_mwh == null ? "Unavailable" : formatKwh(r.import_mwh) },
      ]} />
    </section>
  </div>;
}
