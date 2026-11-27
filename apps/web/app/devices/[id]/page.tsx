"use client";
import ShortId, {shortReference} from "@/components/ShortId";
import DeviceTrust from "@/components/DeviceTrust";
import DeviceViewers from "@/components/DeviceViewers";
import RecordWorkspace from "@/components/RecordWorkspace";
export default function Page({ params: { id } }: { params: { id: string } }) {
  return (
    <RecordWorkspace
      title="Your SmartClamp"
      description="Installation, calibration and connection details from the device registry."
      endpoint={`/devices/${id}`}
    >
      {(d) => (
        <>
        <section className="card">
          <h2>{d.profile.replace(/_/g, " ")}</h2>
          <dl>
            <dt>Device ID</dt>
            <dd><ShortId value={d.id}/></dd>
            <dt>Installation</dt>
            <dd>{d.install_state}</dd>
            <dt>Calibration</dt>
            <dd>{d.calibration_status}</dd>
            <dt>Firmware</dt>
            <dd>{d.firmware_version || "Not recorded"}</dd>
            <dt>Last connection</dt>
            <dd>
              {d.last_seen_at
                ? new Date(d.last_seen_at).toLocaleString()
                : "No contact recorded"}
            </dd>
            <dt>Capabilities</dt>
            <dd>{d.capabilities.join(", ") || "None commissioned"}</dd>
          </dl>
          <p>
            A recent connection does not confirm supply or relay state. Those
            require measurements and physical feedback.
          </p>
          {d.prepaid_policy?.enabled && <section><h3>Prepaid allowance synchronization</h3><p>Policy: {d.prepaid_policy.status.replace(/_/g, " ")}. {d.prepaid_policy.qualified_for_sync ? "Configured for qualified synchronization." : "Installation qualification is incomplete."}</p>{d.prepaid_policy.reason_code && <p>Device response: {d.prepaid_policy.reason_code.replace(/_/g, " ")}.</p>}<p>A policy acknowledgement does not confirm a physical cutoff or restoration. Those require separate relay feedback.</p></section>}
          <div className="resource-actions">
            <a className="btn btn-primary" href="/history">
              View measurements
            </a>
            <a className="btn btn-secondary" href={`/devices/${id}/commands`}>
              Command activity
            </a>
            <a className="btn btn-secondary" href="/support">
              Installation help
            </a>
            {d.can_manage_automation&&<a className="btn btn-secondary" href={`/devices/${id}/automation`}>Budgets & schedules</a>}
          </div>
        </section>
        <DeviceTrust deviceId={id}/>
        {d.can_manage_viewers&&<DeviceViewers deviceId={id}/>}
        </>
      )}
    </RecordWorkspace>
  );
}
