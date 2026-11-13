"use client";
import { useState } from "react";
import RecordWorkspace from "@/components/RecordWorkspace";
import { apiFetch } from "@/lib/api";
export default function Page() {
  const [selected, setSelected] = useState(""),
    [state, setState] = useState("off"),
    [challenge, setChallenge] = useState(""),
    [code, setCode] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [command, setCommand] = useState<any>(null);
  return (
    <RecordWorkspace
      title="Power control"
      description="Confirm a specific action using your phone. Physical protection restrictions always take precedence."
      endpoint="/users/me/context"
    >
      {(data) => {
        const devices = data.devices.filter((d: any) =>
            d.capabilities.includes("relay"),
          ),
          id = selected || devices[0]?.id,
          controls = devices.find((d: any) => d.id === id)?.controls;
        return !devices.length ? (
          <div className="workspace-empty">
            <h2>No relay-equipped device linked.</h2>
            <p>
              Monitoring hardware cannot switch power. Control requires a
              compatible installed relay and an eligible plan.
            </p>
          </div>
        ) : (
          <section className="card">
            <div className="resource-form">
              {!controls?.can_request && <p role="status">{controls?.unavailable_reason || "This device is not eligible for control yet."}</p>}
              <label>
                SmartClamp
                <select
                  className="input"
                  disabled={busy || !!challenge}
                  value={id}
                  onChange={(e) => {
                    setSelected(e.target.value);
                    setCommand(null);
                  }}
                >
                  {devices.map((d: any) => (
                    <option key={d.id} value={d.id}>
                      {d.role} · {d.id}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Requested power
                <select
                  className="input"
                  value={state}
                  disabled={busy || !!challenge}
                  onChange={(e) => {
                    setState(e.target.value);
                    setCommand(null);
                  }}
                >
                  <option value="off">Turn off</option>
                  <option value="on">Turn on</option>
                </select>
              </label>
              {!challenge ? (
                <button
                  className="btn btn-primary"
                  disabled={busy || !controls?.can_request}
                  onClick={async () => {
                    setBusy(true);
                    setMessage("");
                    try {
                      const canonical = JSON.stringify({
                        device_id: id,
                        state,
                      });
                      const hash = Array.from(
                        new Uint8Array(
                          await crypto.subtle.digest(
                            "SHA-256",
                            new TextEncoder().encode(canonical),
                          ),
                        ),
                      )
                        .map((x) => x.toString(16).padStart(2, "0"))
                        .join("");
                      const c = await apiFetch("/auth/step-up/challenges", {
                        method: "POST",
                        body: JSON.stringify({
                          scope_ids: [id],
                          operation_hash: hash,
                        }),
                      });
                      setChallenge(c.id);
                      setCommand(null);
                    } catch (e) {
                      setMessage(
                        e instanceof Error ? e.message : "Unable to send code.",
                      );
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Send confirmation code
                </button>
              ) : (
                <>
                  <label>
                    Phone confirmation code
                    <input
                      className="input"
                      autoComplete="one-time-code"
                      inputMode="numeric"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                    />
                  </label>
                  <button
                    className="btn btn-primary"
                    disabled={busy || !code}
                    onClick={async () => {
                      setBusy(true);
                      setMessage("");
                      try {
                        await apiFetch(
                          `/auth/step-up/challenges/${challenge}/verify`,
                          { method: "POST", body: JSON.stringify({ code }) },
                        );
                        const c = await apiFetch(`/devices/${id}/relay`, {
                          method: "POST",
                          body: JSON.stringify({
                            state,
                            authorization_ref: challenge,
                          }),
                        });
                        setCommand(c);
                        setChallenge("");
                        setCode("");
                      } catch (e) {
                        setMessage(
                          e instanceof Error
                            ? e.message
                            : "Unable to send command.",
                        );
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Confirm and request {state.toUpperCase()}
                  </button>
                  <button
                    className="btn btn-secondary"
                    disabled={busy}
                    onClick={() => {
                      setChallenge("");
                      setCode("");
                    }}
                  >
                    Cancel
                  </button>
                </>
              )}
              {message && (
                <p className="error-panel" role="alert">
                  {message}
                </p>
              )}
              {command && (
                <div role="status">
                  <h2>Request queued</h2>
                  <p>No physical change is confirmed yet.</p>
                  <a
                    className="btn btn-secondary"
                    href={`/devices/${id}/commands`}
                  >
                    Track command result
                  </a>
                </div>
              )}
              <p>
                Schedules and budgets remain unavailable until their execution
                and recovery workflows are implemented. An internet outage does
                not disable local voltage protection.
              </p>
            </div>
          </section>
        );
      }}
    </RecordWorkspace>
  );
}
