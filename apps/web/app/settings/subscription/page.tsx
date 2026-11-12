"use client";
import RecordWorkspace from "@/components/RecordWorkspace";
export default function Page() {
  return (
    <RecordWorkspace
      title="Your platform plan"
      description="Your electricity credit is separate from your subscription."
      endpoint="/users/me/subscription"
    >
      {(data) => (
        <section className="card">
          <h2>{data.plan || "Free"}</h2>
          <p>Status: {data.status}</p>
          {data.current_period_end && (
            <p>
              Current period ends{" "}
              {new Date(data.current_period_end).toLocaleDateString()}
            </p>
          )}
          <p>
            Paid subscription checkout is not enabled. Pricing will be confirmed
            before purchase.
          </p>
          <a className="btn btn-secondary" href="/pricing#compare">
            Compare the full feature list
          </a>
        </section>
      )}
    </RecordWorkspace>
  );
}
