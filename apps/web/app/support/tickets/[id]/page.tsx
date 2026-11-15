"use client";
import Link from "next/link";
import { useState } from "react";
import RecordWorkspace from "@/components/RecordWorkspace";
import { apiFetch } from "@/lib/api";
export default function Page({ params: { id } }: { params: { id: string } }) {
  const [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [note, setNote] = useState(""),
    [action, setAction] = useState("claim");
  return (
    <RecordWorkspace
      title="Your support request"
      description="Messages saved to this request. No generated support responses."
      endpoint={`/support/tickets/${id}`}
    >
      {(data, reload) => (
        <>
          <Link className="text-link" href="/support/requests">All support requests</Link>
          <section className="card">
            <h2>{data.subject}</h2>
            <p>{data.message}</p>
            <p>Status: {data.status}</p>
          </section>
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
            try { await apiFetch(`/support/tickets/${id}/workflow`, {method:"POST",body:JSON.stringify({action:data.status === "resolved" ? "reopen" : action,note,version:data.version})});setNote("");reload(); }
            catch(e) {setError(e instanceof Error ? e.message : "Unable to update request.");}
            finally {setBusy(false);}
          }}>
            <h2>{data.status === "resolved" ? "Reopen request" : "Support workflow"}</h2>
            {data.status !== "resolved" && <label>Action<select className="input" value={action} onChange={e=>setAction(e.target.value)}>
              <option value="claim">Claim request</option><option value="waiting_customer">Waiting for customer</option><option value="waiting_provider">Waiting for provider</option><option value="resolve">Resolve request</option>
            </select></label>}
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
        </>
      )}
    </RecordWorkspace>
  );
}
