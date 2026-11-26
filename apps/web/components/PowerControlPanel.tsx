"use client";
import Icon from "@/components/Icon";
import ShortId, {shortReference} from "@/components/ShortId";
import {RelayDial,PowerSwitch} from '@/components/EnergyInstruments';
import { useState } from "react";
import { apiFetch } from "@/lib/api";
export default function PowerControlPanel({context,deviceId}:{context:any;deviceId?:string}){
  const data=context;
  const [review,setReview]=useState(false);
  const [selected, setSelected] = useState(""),
    [state, setState] = useState("off"),
    [challenge, setChallenge] = useState(""),
    [code, setCode] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [command, setCommand] = useState<any>(null);
        const devices = data.devices.filter((d: any) =>
            d.capabilities.includes("relay"),
          ),
          id = deviceId || selected || devices[0]?.id,
          controls = devices.find((d: any) => d.id === id)?.controls;
        const activeDevice=devices.find((d:any)=>d.id===id),relay=activeDevice?.relay,age=relay?.observed_at?Date.now()-Date.parse(relay.observed_at):NaN,observed=Number.isFinite(age)&&age>=0&&age<180000?relay.observed??null:null;
        const tracked=command&&relay?.latest_command?.id===command.id?relay.latest_command:command,pending=!!relay?.pending_command_id||tracked&&['pending','pending_delivery'].includes(tracked.status);
        return !devices.length ? (
          <div className="workspace-empty">
            <h2>No relay-equipped device linked.</h2>
            <p>
              Monitoring hardware cannot switch power. Control requires a
              compatible installed relay and an eligible plan.
            </p>
          </div>
        ) : (
          <section className="card power-control-panel"><h2>Room power</h2>
            <div className="resource-form">
              {!controls?.can_request && <p role="status">{controls?.unavailable_reason || "This device is not eligible for control yet."}</p>}
              {!deviceId&&<label>
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
                      {d.role} · {shortReference(d.id)}
                    </option>
                  ))}
                </select>
              </label>}
              <div className="primary-power-control"><RelayDial on={observed} pending={!!pending}/>{typeof observed==='boolean'?<PowerSwitch label="Request room power change" on={observed} disabled={busy||!!pending||!controls?.can_request} onChange={on=>{setState(on?'on':'off');setReview(true);}}/>:<button className="btn btn-secondary" onClick={()=>setReview(true)} disabled={!controls?.can_request||busy||!!pending}>Choose power action</button>}</div>
              {(review||!!challenge)&&<>
              <fieldset disabled={busy||!!challenge||!controls?.can_request} className="relay-intent"><legend>Choose what you want to do</legend><button type="button" aria-pressed={state==='on'} onClick={()=>setState('on')}><Icon name="power" size={16}/> Turn on</button><button type="button" aria-pressed={state==='off'} onClick={()=>setState('off')}><Icon name="power" size={16}/> Turn off</button><small>This chooses a request. The observed relay changes only after a signed receipt.</small></fieldset>
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
                  Continue with phone confirmation
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
                        setCommand(c);setReview(false);
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
              </>}
              {message && (
                <p className="error-panel" role="alert">
                  {message}
                </p>
              )}
              {command && (
                <div role="status">
                  <h3>{tracked?.status==='applied'?'Signed receipt received':tracked?.status==='expired'?'Request expired':tracked?.status==='rejected'?'Request rejected':tracked?.status==='uncertain'?'Result unconfirmed':'Request pending'}</h3>
                  <p>{tracked?.status==='applied'?'Device feedback confirms this command result.':tracked?.status==='expired'?'The command validity window ended without a confirming receipt. Check the device connection.':'No physical change is confirmed for this request.'}</p>
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
}
