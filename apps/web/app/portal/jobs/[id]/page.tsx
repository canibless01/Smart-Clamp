"use client";
import { useState } from "react";
import RecordWorkspace, { RecordTable } from "@/components/RecordWorkspace";
import { apiFetch } from "@/lib/api";

const labels: Record<string, string> = {
  assign: "Assign installer", start: "Start work", fail_diagnostics: "Record failed diagnostics",
  submit: "Submit for review", rma: "Request replacement review", close: "Close field work", reopen: "Reopen work",
};
export default function Page({ params }: { params: { id: string } }) {
  const [action, setAction] = useState("");
  const [assignee, setAssignee] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  return <RecordWorkspace title="Field work order" description="Assignment, diagnostic notes and review history." endpoint={`/jobs/${params.id}`}>
    {(data, reload) => {
      const selected = data.allowed_actions.includes(action) ? action : data.allowed_actions[0] || "";
      return <>
        <section className="card">
          <p className="eyebrow">{data.job.kind} · {data.job.priority}</p>
          <h2>{data.job.status.replace(/_/g, " ")}</h2>
          <p>Work order: {data.job.id}</p>
          <p>Assigned installer: {data.job.assignee_id || "Awaiting assignment"}</p>
          {data.device && <>
            <p>Device: {data.device.id} · {data.device.profile.replace(/_/g, " ")}</p>
            <p>Installation: {data.device.install_state} · Calibration: {data.device.calibration_status}</p>
            <p>Last contact: {data.device.last_seen_at ? new Date(data.device.last_seen_at).toLocaleString("en-NG", { timeZone: "Africa/Lagos" }) : "Never connected"}</p>
          </>}
          <p className="quiet-note">Submitting or closing field work records a review step. It does not qualify sensors, commission a relay, confirm a physical repair or authorize an installer payout. Installation commissioning still requires a qualified hardware process.</p>
        </section>
        {notice && <p role="status">{notice}</p>}
        {!!selected && <section className="card" style={{ marginTop: 24 }}>
          <form className="resource-form" onSubmit={async e => {
            e.preventDefault(); setBusy(true); setError(""); setNotice("");
            try {
              await apiFetch(`/jobs/${params.id}/actions`, { method: "POST", body: JSON.stringify({
                action: selected, expected_version: data.job.version, note,
                ...(selected === "assign" ? { assignee_id: assignee } : {}),
              }) });
              setNote(""); setNotice("Work order updated. Its history and in-app notifications have been saved."); reload();
            } catch (e) { setError(e instanceof Error ? e.message : "Unable to update work order."); }
            finally { setBusy(false); }
          }}>
            <h2>Update work order</h2>
            <label htmlFor="job-action">Action</label><select id="job-action" className="input" value={selected} onChange={e => setAction(e.target.value)}>
              {data.allowed_actions.map((a: string) => <option key={a} value={a}>{labels[a]}</option>)}
            </select>
            {selected === "assign" && <label>Installer account ID<input className="input" required value={assignee} onChange={e => setAssignee(e.target.value)} /></label>}
            <label>Work and diagnostic notes<textarea className="input" required minLength={10} maxLength={4000} rows={5} value={note} onChange={e => setNote(e.target.value)} /></label>
            {error && <p role="alert">{error} Refresh the order if another person has updated it. Your notes are preserved.</p>}
            <button className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : labels[selected]}</button>
          </form>
        </section>}
        <section className="card" style={{ marginTop: 24 }}>
          <h2>Recorded history</h2>
          <RecordTable items={data.events} columns={[
            { key: "action", label: "Action", render: r => r.action.replace(/_/g, " ") },
            { key: "to_status", label: "Result", render: r => r.to_status.replace(/_/g, " ") },
            { key: "note", label: "Notes" },
            { key: "created_at", label: "Recorded (Lagos)", render: r => new Date(r.created_at).toLocaleString("en-NG", { timeZone: "Africa/Lagos" }) },
          ]} />
        </section>
      </>;
    }}
  </RecordWorkspace>;
}
