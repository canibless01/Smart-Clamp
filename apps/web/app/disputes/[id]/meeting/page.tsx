"use client";
import RecordWorkspace from "@/components/RecordWorkspace";
import { formatNaira } from "@/lib/api";
export default function Page({ params: { id } }: { params: { id: string } }) {
  return (
    <RecordWorkspace
      title="Dispute meeting view"
      description="The evidence snapshot for this dispute. No unrelated customer data is shown."
      endpoint={`/disputes/${id}/meeting-view`}
    >
      {(data) => (
        <section className="card">
          <h2>Status: {data.status}</h2>
          <p>{data.note}</p>
          <dl>
            <dt>Bill</dt>
            <dd>{data.evidence_snapshot?.id || "Not recorded"}</dd>
            <dt>Period</dt>
            <dd>
              {data.evidence_snapshot?.period_start} –{" "}
              {data.evidence_snapshot?.period_end}
            </dd>
            <dt>Bill amount</dt>
            <dd>
              {data.evidence_snapshot?.amount_kobo != null
                ? formatNaira(data.evidence_snapshot.amount_kobo)
                : "Not recorded"}
            </dd>
          </dl>
          <p>
            This is the saved dispute snapshot. It is not a signed public
            verification report.
          </p>
        </section>
      )}
    </RecordWorkspace>
  );
}
