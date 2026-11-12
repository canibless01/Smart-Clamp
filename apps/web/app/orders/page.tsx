"use client";
import RecordWorkspace, { RecordTable } from "@/components/RecordWorkspace";
export default function Page() {
  return (
    <RecordWorkspace
      title="Your installation requests"
      description="Requests saved to your account. Hardware pricing and installation availability are confirmed by the team."
      endpoint="/orders"
    >
      {(data) => (
        <>
          <RecordTable
            items={data.items}
            columns={[
              { key: "profile", label: "Device" },
              { key: "service_address", label: "Service address" },
              { key: "status", label: "Status" },
            ]}
          />
          <a className="btn btn-primary" href="/support">
            Discuss a new installation
          </a>
        </>
      )}
    </RecordWorkspace>
  );
}
