"use client";
import {useState} from "react";
import {apiFetch} from "@/lib/api";
import ShortId from "@/components/ShortId";
import RecordWorkspace, { RecordTable } from "@/components/RecordWorkspace";
export default function Page() {
  const [error,setError]=useState(""),[busy,setBusy]=useState("");
  return (
    <RecordWorkspace
      role="nepa_staff"
      title="Utility overview"
      description="Devices assigned to your organization. A tamper signal requests investigation; it does not establish theft."
      endpoint="/dashboard/utility"
    >
      {(data,reload) => (
        <>
          <section className="card">
            <h2>Contracted devices</h2>
            <RecordTable
              items={data.devices}
              columns={[
                { key: "id", label: "Device" },
                { key: "profile", label: "Type" },
                { key: "supply_state", label: "Last reported supply" },
                {
                  key: "last_seen_at",
                  label: "Last contact",
                  render: (r) =>
                    r.last_seen_at
                      ? new Date(r.last_seen_at).toLocaleString()
                      : "Never connected",
                },
              ]}
            />
          </section>
          <section className="card" style={{ marginTop: 24 }}>
            <h2>Signals for review</h2>{error&&<p role="alert">{error}</p>}
            <RecordTable
              items={data.signals}
              columns={[
                { key: "kind", label: "Signal" },
                { key: "signed_payload_sha256",label:"Signed packet SHA-256",render:r=><ShortId value={r.signed_payload_sha256}/>},
                { key: "ticket_id",label:"Investigation",render:r=>r.ticket_id?<a className="text-link" href={`/support/tickets/${r.ticket_id}`}>Review · {r.review_status}</a>:<button type="button" className="btn btn-secondary" disabled={!!busy} onClick={async()=>{setBusy(r.id);setError('');try{await apiFetch(`/utility/signals/${r.id}/review`,{method:'POST',body:'{}'});reload();}catch(e){setError(e instanceof Error?e.message:'Review was not requested.');}finally{setBusy('');}}}>Request review</button>},
                { key: "device_id", label: "Device" },
                { key: "clock_quality", label: "Clock confidence" },
                {
                  key: "received_at",
                  label: "Received",
                  render: (r) => new Date(r.received_at).toLocaleString(),
                },
              ]}
            />
            <p>
              Customer identity is excluded. Review requests preserve source evidence. Field inspections and utility actions require assigned staff and the applicable authority.
            </p>
          </section>
        </>
      )}
    </RecordWorkspace>
  );
}
