"use client";
import { useState, useEffect } from "react";
import RecordWorkspace from "@/components/RecordWorkspace";
import MeasurementReport from "@/components/MeasurementReport";
import { apiFetch } from "@/lib/api";
export default function Page() {
  const [device, setDevice] = useState(""), [start, setStart] = useState(""), [end, setEnd] = useState("");
  const [report, setReport] = useState<any>(null), [share, setShare] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [saved, setSaved] = useState<any[]>([]);
  useEffect(() => { apiFetch("/reports").then(d => setSaved(d.items)).catch(e => setError(e.message)); }, []);
  async function perform(work: () => Promise<void>) {
    setBusy(true); setError(""); try { await work(); } catch (e) { setError(e instanceof Error ? e.message : "Unable to complete report action."); } finally { setBusy(false); }
  }
  return <RecordWorkspace title="Measurement reports" description="Issue a fixed snapshot, export its readings, or share it with a revocable seven-day link." endpoint="/users/me/context">
    {(data) => <>
      {data.devices.length ? <section className="card"><form className="resource-form" onSubmit={e => { e.preventDefault(); void perform(async () => {
        const created = await apiFetch("/reports", { method: "POST", body: JSON.stringify({ device_id: device || data.devices[0].id, period_start: start, period_end: end }) });
        setShare(created.share_path); setReport(await apiFetch(`/reports/${created.id}`)); setSaved((await apiFetch("/reports")).items);
      }); }}>
        <h2>Choose a completed period</h2><p>Dates use Lagos time. The end date is exclusive; choose up to 31 completed days. Missing measurements stay unknown.</p>
        <label>SmartClamp<select className="input" value={device || data.devices[0].id} onChange={e => setDevice(e.target.value)}>{data.devices.map((d: any) => <option key={d.id} value={d.id}>{d.role} · {d.id}</option>)}</select></label>
        <label>Period start<input className="input" type="date" required value={start} onChange={e => setStart(e.target.value)} /></label>
        <label>Period end (exclusive)<input className="input" type="date" required value={end} onChange={e => setEnd(e.target.value)} /></label>
        <button className="btn btn-primary" disabled={busy}>{busy ? "Working…" : "Issue signed snapshot"}</button>
      </form></section> : <p>Link an authorized measuring device to issue a report. A meter-number lookup cannot supply measurement history.</p>}
      {error && <p role="alert" className="error-panel">{error}</p>}
      <section className="card" style={{ marginTop: 24 }}><h2>Your saved snapshots</h2><p>The sharing link is shown after issuance. You can reopen snapshots and revoke their sharing here.</p>
        {saved.length ? <div className="resource-actions">{saved.map(r => <button className="btn btn-secondary" key={r.id} disabled={busy} onClick={() => void perform(async () => { setReport(await apiFetch(`/reports/${r.id}`)); setShare(""); })}>Open {new Date(r.issued_at).toLocaleString("en-NG", { timeZone: "Africa/Lagos" })}</button>)}</div> : <p>No snapshots issued yet.</p>}
      </section>
      {report && <>
        <div className="resource-actions">
          {!report.revoked && share && <a className="btn btn-secondary" href={share}>Open seven-day sharing link</a>}
          <button className="btn btn-primary" disabled={busy} onClick={() => void perform(async () => {
            const e = await apiFetch(`/reports/${report.id}/exports`, { method: "POST", body: "{}" });
            const csv = await apiFetch(e.download_path); const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
            const a = document.createElement("a"); a.href = url; a.download = `smartclamp-${report.id}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
          })}>Download snapshot CSV</button>
          {!report.revoked && <button className="btn btn-secondary" disabled={busy} onClick={() => void perform(async () => {
            await apiFetch(`/reports/${report.id}/revoke`, { method: "POST", body: "{}" }); setReport({ ...report, revoked: true }); setShare("");
          })}>Revoke sharing link</button>}
        </div>
        <MeasurementReport data={report} />
      </>}
    </>}
  </RecordWorkspace>;
}
