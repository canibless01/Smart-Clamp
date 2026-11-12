"use client";
import RecordWorkspace, { RecordTable } from "@/components/RecordWorkspace";
export default function Page({ params: { id } }: { params: { id: string } }) {
  return (
    <RecordWorkspace
      title="Command activity"
      description="A queued request is not a physical result. Applied status requires a signed device receipt with matching relay feedback."
      endpoint={`/devices/${id}/commands`}
    >
      {(data) => (
        <RecordTable
          items={data.items}
          columns={[
            { key: "id", label: "Command" },
            {
              key: "requested",
              label: "Requested power",
              render: (r) => (r.requested ? "ON" : "OFF"),
            },
            { key: "status", label: "Status" },
            { key: "reason", label: "Reason" },
            {
              key: "expires_at",
              label: "Expires",
              render: (r) => new Date(r.expires_at).toLocaleString(),
            },
          ]}
        />
      )}
    </RecordWorkspace>
  );
}
