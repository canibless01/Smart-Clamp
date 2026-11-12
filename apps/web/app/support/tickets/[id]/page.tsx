"use client";
import { useState } from "react";
import RecordWorkspace from "@/components/RecordWorkspace";
import { apiFetch } from "@/lib/api";
export default function Page({ params: { id } }: { params: { id: string } }) {
  const [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <RecordWorkspace
      title="Your support request"
      description="Messages saved to this request. No generated support responses."
      endpoint={`/support/tickets/${id}`}
    >
      {(data, reload) => (
        <>
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
          <form
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
          </form>
        </>
      )}
    </RecordWorkspace>
  );
}
