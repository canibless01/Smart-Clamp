"use client";
import RecordWorkspace, { RecordTable } from "@/components/RecordWorkspace";
export default function Page() {
  return (
    <RecordWorkspace
      title="Your disputes"
      description="Disputes are tied to an issued bill and its evidence snapshot."
      endpoint="/disputes"
    >
      {(data) => (
        <>
          <RecordTable
            items={data.items}
            columns={[
              {
                key: "id",
                label: "Dispute",
                render: (r) => (
                  <a className="text-link" href={`/disputes/${r.id}/meeting`}>
                    {r.id.slice(0, 8)}
                  </a>
                ),
              },
              { key: "status", label: "Status" },
              {
                key: "created_at",
                label: "Opened",
                render: (r) => new Date(r.created_at).toLocaleString(),
              },
            ]}
          />
          <p>
            To raise a billing concern, contact support with the bill reference.
            The bill issuance and dispute creation interface is still being
            completed.
          </p>
          <a href="/support" className="btn btn-primary">
            Get billing support
          </a>
        </>
      )}
    </RecordWorkspace>
  );
}
