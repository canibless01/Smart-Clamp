"use client";
import RecordWorkspace, { RecordTable } from "@/components/RecordWorkspace";
export default function Page() {
  return (
    <RecordWorkspace
      role="nepa_staff"
      title="Utility overview"
      description="Devices assigned to your organization. A tamper signal requests investigation; it does not establish theft."
      endpoint="/dashboard/utility"
    >
      {(data) => (
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
            <h2>Signals for review</h2>
            <RecordTable
              items={data.signals}
              columns={[
                { key: "kind", label: "Signal" },
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
              Customer identity is excluded. Billing, broadcasts and remote
              utility control remain unavailable until contract, consent and
              dispatch workflows are approved.
            </p>
          </section>
        </>
      )}
    </RecordWorkspace>
  );
}
