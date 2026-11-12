"use client";
import RecordWorkspace from "@/components/RecordWorkspace";
import { apiFetch } from "@/lib/api";
import { useState } from "react";
export default function Page({ params }: { params: { id: string } }) {
  const [label, setLabel] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [invite, setInvite] = useState<any>(null);
  return (
    <RecordWorkspace
      title="Your rooms"
      role="landlord"
      description="Add rooms, connect their SmartClamps and invite residents."
      endpoint={`/buildings/${params.id}/rooms`}
    >
      {(data, reload) => (
        <>
          <form
            className="resource-form"
            onSubmit={async (e) => {
              e.preventDefault();
              setError("");
              setBusy(true);
              try {
                await apiFetch(`/buildings/${params.id}/rooms`, {
                  method: "POST",
                  body: JSON.stringify({ label }),
                });
                setLabel("");
                reload();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Unable to save.");
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Room name
              <input
                className="input"
                value={label}
                required
                maxLength={150}
                onChange={(e) => setLabel(e.target.value)}
              />
            </label>
            <button className="btn btn-primary" disabled={busy}>
              {busy ? "Saving…" : "Add room"}
            </button>
          </form>
          {error && (
            <div className="error-panel" role="alert">
              {error}
            </div>
          )}
          {invite && (
            <section className="card" aria-live="polite">
              <h2>Resident invitation</h2>
              <p>
                Share this private link with the resident. It can be used once,
                before {new Date(invite.expires_at).toLocaleDateString()}.
              </p>
              <a className="text-link" href={invite.invite_link}>
                {typeof location !== "undefined" ? location.origin : ""}
                {invite.invite_link}
              </a>
            </section>
          )}
          <div className="resource-list">
            {data.items.length ? (
              data.items.map((room: any) => (
                <section className="card" key={room.id}>
                  <h2>{room.label}</h2>
                  <p>
                    {room.tenant_name
                      ? `Resident: ${room.tenant_name}`
                      : "No resident linked yet."}
                  </p>
                  <div className="resource-actions">
                    {!room.tenant_id && (
                      <button
                        className="btn btn-secondary"
                        disabled={busy}
                        onClick={async () => {
                          setBusy(true);
                          setError("");
                          try {
                            setInvite(
                              await apiFetch(`/rooms/${room.id}/invitations`, {
                                method: "POST",
                                body: "{}",
                              }),
                            );
                          } catch (e) {
                            setError(
                              e instanceof Error
                                ? e.message
                                : "Unable to create invitation.",
                            );
                          } finally {
                            setBusy(false);
                          }
                        }}
                      >
                        Create resident invitation
                      </button>
                    )}
                    <a
                      className="btn btn-secondary"
                      href={
                        room.device_id
                          ? `/devices/${room.device_id}`
                          : `/devices/link?room_id=${room.id}`
                      }
                    >
                      {room.device_id ? "View SmartClamp" : "Link SmartClamp"}
                    </a>
                  </div>
                </section>
              ))
            ) : (
              <p>No rooms yet. Add your first room above.</p>
            )}
          </div>
          <a className="text-link" href="/dashboard/landlord">
            Back to buildings
          </a>
        </>
      )}
    </RecordWorkspace>
  );
}
