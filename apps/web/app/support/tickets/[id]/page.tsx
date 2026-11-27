"use client";
import ShortId from "@/components/ShortId";
import Link from "next/link";
import { useState } from "react";
import RecordWorkspace from "@/components/RecordWorkspace";
import { apiFetch } from "@/lib/api";
export default function Page({ params: { id } }: { params: { id: string } }) {
  const [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [note, setNote] = useState(""),
    [action, setAction] = useState("claim"),
    [assignee,setAssignee] = useState("");
  return (
    <RecordWorkspace
      title="Your support request"
      description="Messages saved to this request. No generated support responses."
      endpoint={`/support/tickets/${id}`}
    >
      {(data, reload) => (
        <div className="resource-list">
          <Link className="text-link" href="/support/requests">All support requests</Link>
          <section className="card">
            <h2>{data.subject}</h2>
            <p>{data.message}</p>
            <p>Status: {data.status}</p><p>{data.assigned_to_me ? "You own this request" : data.assigned_to ? "Assigned to a support colleague" : "Unassigned"}</p>
          </section>
          {data.signal_review&&<section className="card"><h2>Signal investigation</h2><p>This request references a signed device signal. It does not establish theft.</p><details><summary>Source evidence</summary><p>{data.signal_review.kind} · reported {data.signal_review.active?'active':'cleared'} · clock {data.signal_review.clock_quality}</p><p>Key epoch {data.signal_review.key_epoch} · sequence {data.signal_review.seq}</p><p>Payload SHA-256: <ShortId value={data.signal_review.signed_payload_sha256}/></p></details>{data.signal_review.job_id?<p>Inspection: {(data.signal_review.inspection_status||'pending').replace(/_/g,' ')}. Field work and conclusions are recorded separately.</p>:data.can_manage&&data.assigned_to_me&&data.status!=='resolved'?<button type="button" className="btn btn-secondary" disabled={busy} onClick={async()=>{setBusy(true);setError('');try{await apiFetch(`/support/tickets/${id}/inspection`,{method:'POST',body:'{}'});reload();}catch(e){setError(e instanceof Error?e.message:'Inspection was not requested.');}finally{setBusy(false);}}}>Request field inspection</button>:<p>A support reviewer must claim this request before arranging an inspection.</p>}</section>}
          <div className="resource-list">
            {data.messages.map((m: any, i: number) => (
              <article className="card" key={i}>
                <p>{m.message}</p>
                <time>{new Date(m.created_at).toLocaleString()}</time>
              </article>
            ))}
          </div>
          {(data.can_manage || data.status === "resolved") && <form className="resource-form" onSubmit={async e => {
            e.preventDefault();setBusy(true);setError("");
            try { await apiFetch(`/support/tickets/${id}/workflow`, {method:"POST",body:JSON.stringify({action:data.status === "resolved" ? "reopen" : action,note,version:data.version,...(action==='assign'?{assignee_id:assignee}:{})})});setNote("");reload(); }
            catch(e) {setError(e instanceof Error ? e.message : "Unable to update request.");}
            finally {setBusy(false);}
          }}>
            <h2>{data.status === "resolved" ? "Reopen request" : "Support workflow"}</h2>
            {data.status !== "resolved" && <label>Action<select className="input" value={action} onChange={e=>setAction(e.target.value)}>
              <option value="claim">Claim request</option>{data.can_assign && <option value="assign">Assign to colleague</option>}{(data.assigned_to_me || data.can_assign) && <option value="release">Release to queue</option>}<option value="waiting_customer">Waiting for customer</option><option value="waiting_provider">Waiting for provider</option><option value="resolve">Resolve request</option>
            </select></label>}
            {data.status !== "resolved" && action==='assign' && data.can_assign && <label>Assign to reviewer<select className="input" required value={assignee} onChange={e=>setAssignee(e.target.value)}><option value="">Choose an eligible colleague</option>{data.responders.map((u:any)=><option key={u.id} value={u.id}>{u.full_name} · {u.id.slice(0,8)}</option>)}</select></label>}
            <label>{data.status === "resolved" ? "Reason for reopening" : "Update for the customer"}<textarea className="input" required maxLength={4000} value={note} onChange={e=>setNote(e.target.value)} /></label>
            <button className="btn btn-secondary" disabled={busy}>Save request update</button>
          </form>}
          {data.status !== "resolved" && <form
            className="resource-form"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                await apiFetch(`/support/tickets/${id}/messages`, {
                  method: "POST",
                  body: JSON.stringify({ message }),
                });
                setMessage("");
                reload();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Unable to save.");
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Reply
              <textarea
                className="input"
                required
                maxLength={4000}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </label>
            {error && <p role="alert">{error}</p>}
            <button className="btn btn-primary" disabled={busy}>
              {busy ? "Sending…" : "Send reply"}
            </button>
          </form>}
          {data.status === "resolved" && error && <p role="alert">{error}</p>}
        </div>
      )}
    </RecordWorkspace>
  );
}
