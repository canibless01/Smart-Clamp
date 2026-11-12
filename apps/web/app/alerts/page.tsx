"use client";
import RecordWorkspace from "@/components/RecordWorkspace";
export default function Page() {
  return (
    <RecordWorkspace
      title="Notifications"
      description="Events recorded for your account. Connectivity loss alone does not establish a power outage or tampering."
      endpoint="/alerts"
    >
      {(data) => (
        <div className="resource-list">
          {data.items.length ? (
            data.items.map((r: any) => (
              <article className="card" key={r.id}>
                <h2>{r.template_key.replace(/\./g, " ")}</h2>
                <p>
                  {r.payload?.message || "An event was recorded for review."}
                </p>
                <time dateTime={r.created_at}>
                  {new Date(r.created_at).toLocaleString()}
                </time>
                <div className="resource-actions">
                  <a className="btn btn-secondary" href="/support">
                    Get help with this event
                  </a>
                </div>
              </article>
            ))
          ) : (
            <div className="workspace-empty">
              <h2>No notifications yet.</h2>
              <p>
                Device and payment events will appear here when they are
                recorded.
              </p>
            </div>
          )}
        </div>
      )}
    </RecordWorkspace>
  );
}
