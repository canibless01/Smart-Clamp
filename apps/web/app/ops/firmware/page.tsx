"use client";
import { useState } from "react";
import RecordWorkspace, { RecordTable } from "@/components/RecordWorkspace";
import { apiFetch } from "@/lib/api";
export default function Page() {
  const [profile, setProfile] = useState("house_full"), [version, setVersion] = useState(""), [secure, setSecure] = useState(1);
  const [file, setFile] = useState<File | null>(null), [artifact, setArtifact] = useState(""), [devices, setDevices] = useState("");
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [error, setError] = useState("");
  async function perform(work: () => Promise<void>, reload: () => void) {
    setBusy(true); setError(""); setMessage("");
    try { await work(); reload(); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to save firmware action."); }
    finally { setBusy(false); }
  }
  return <RecordWorkspace title="Firmware updates" description="Private signed artifacts, one-device canaries and explicit staged rollout." endpoint="/ops/firmware" role="internal_engineering">
    {(data, reload) => <>
      <section className="card">
        <h2>{data.enabled ? "Firmware dispatch enabled" : "Firmware dispatch disabled"}</h2>
        <p>Devices need qualified OTA partitions, a pinned signing key and tested rollback. A successful upload or download does not establish a healthy boot. Failed or rolled-back devices pause the rollout.</p>
        <p>Updates advance from one device to 5%, then 25%, then the remaining selected devices. Each wave needs a signed healthy-boot result before an operator can advance. Infrastructure gateways update one at a time.</p>
      </section>
      {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
      <section className="card" style={{ marginTop: 24 }}>
        <h2>Upload application binary</h2>
        <form className="resource-form" onSubmit={e => { e.preventDefault(); void perform(async () => {
          if (!file || file.size < 1024 || file.size > 2097152) throw new Error("Select a 1 KiB–2 MiB ESP32 application binary.");
          const image_base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(",")[1]); reader.onerror = () => reject(new Error("Unable to read this binary.")); reader.readAsDataURL(file);
          });
          const result = await apiFetch("/ops/firmware/artifacts", { method: "POST", body: JSON.stringify({ profile, board: "esp32dev", version, secure_version: secure, image_base64 }) });
          setArtifact(result.id); setMessage("Signed artifact stored. Select its device cohort to start a canary.");
        }, reload); }}>
          <label>Device profile<select className="input" value={profile} onChange={e => setProfile(e.target.value)}>{["transformer", "pole_gateway", "pole_device", "house_full", "building_hub", "ir_reader"].map(p => <option key={p}>{p}</option>)}</select></label>
          <label>Firmware version<input className="input" required maxLength={40} value={version} onChange={e => setVersion(e.target.value)} /></label>
          <label>Secure version<input className="input" type="number" min={1} max={2147483647} required value={secure} onChange={e => setSecure(Number(e.target.value))} /></label>
          <label>Application .bin<input className="input" type="file" accept=".bin,application/octet-stream" required onChange={e => setFile(e.target.files?.[0] || null)} /></label>
          <button className="btn btn-primary" disabled={busy || !data.enabled}>{busy ? "Saving…" : "Sign and store binary"}</button>
        </form>
      </section>
      <section className="card" style={{ marginTop: 24 }}>
        <h2>Start a canary</h2>
        <form className="resource-form" onSubmit={e => { e.preventDefault(); void perform(async () => {
          await apiFetch("/ops/firmware/rollouts", { method: "POST", body: JSON.stringify({ artifact_id: artifact, device_ids: devices.trim().split(/[\s,]+/) }) });
          setMessage("Canary queued for the first listed device. Waiting devices are held until you advance each healthy wave.");
        }, reload); }}>
          <label>Signed artifact<select className="input" required value={artifact} onChange={e => setArtifact(e.target.value)}><option value="">Choose artifact</option>{data.artifacts.map((a: any) => <option key={a.id} value={a.id}>{a.profile} · {a.version} · secure {a.secure_version}</option>)}</select></label>
          <label>Device IDs, canary first<textarea className="input" required rows={4} value={devices} onChange={e => setDevices(e.target.value)} /></label>
          <button className="btn btn-primary" disabled={busy || !data.enabled}>Start one-device canary</button>
        </form>
      </section>
      <section className="card" style={{ marginTop: 24 }}>
        <h2>Rollouts</h2>
        {data.rollouts.map((r: any) => <article key={r.id} style={{ marginBottom: 24 }}>
          <h3>{r.id}</h3><p>{r.status} · Wave {r.wave + 1} · Version {r.version}</p>
          <div className="resource-actions">{(r.status === "active" ? ["pause", "advance", "cancel"] : r.status === "paused" ? ["resume", "cancel"] : []).map(action => <button key={action} className="btn btn-secondary" disabled={busy} onClick={() => void perform(async () => {
            await apiFetch(`/ops/firmware/rollouts/${r.id}/actions`, { method: "POST", body: JSON.stringify({ action, expected_version: r.version }) }); setMessage("Rollout action saved.");
          }, reload)}>{action === "advance" ? "Advance healthy wave" : action.charAt(0).toUpperCase() + action.slice(1)}</button>)}</div>
          <RecordTable items={data.targets.filter((t: any) => t.rollout_id === r.id)} columns={[
            { key: "device_id", label: "Device" }, { key: "firmware_version", label: "Firmware" }, { key: "status", label: "Result" }, { key: "wave", label: "Wave (0 = canary)" },
          ]} />
        </article>)}
        {!data.rollouts.length && <p>No rollout has been created.</p>}
      </section>
    </>}
  </RecordWorkspace>;
}
