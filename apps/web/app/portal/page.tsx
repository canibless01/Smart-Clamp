"use client";
import { useState } from "react";
import RecordWorkspace, { RecordTable } from "@/components/RecordWorkspace";
export default function Page() {
  const [tab, setTab] = useState("jobs");
  return (
    <>
      <RecordWorkspace
        role="installer"
        title="Your professional portal"
        description="Assignments and payments from committed records."
        endpoint={`/portal/${tab}`}
      >
        {(data) => (
          <RecordTable
            items={data.items}
            columns={
              tab === "jobs"
                ? [
                    { key: "id", label: "Job", render: (r) => <a className="text-link" href={`/portal/jobs/${r.id}`}>Open work order</a> },
                    { key: "device_id", label: "Device" },
                    { key: "status", label: "Status" },
                    { key: "priority", label: "Priority" },
                  ]
                : [
                    { key: "id", label: "Payout" },
                    { key: "amount_kobo", label: "Amount (kobo)" },
                    { key: "status", label: "Status" },
                  ]
            }
          />
        )}
      </RecordWorkspace>
      <div className="container resource-actions">
        <button className="btn btn-secondary" onClick={() => setTab("jobs")}>
          Assigned jobs
        </button>
        <button className="btn btn-secondary" onClick={() => setTab("payouts")}>
          My payouts
        </button>
      </div>
    </>
  );
}
