"use client";
import AppShell from "@/components/AppShell";
export default function Page() {
  return (
    <AppShell role="nepa_staff">
      <div className="prototype-notice" role="status">
        Workspace preview · the figures below are examples, not live utility
        records.
      </div>
      <h1 style={{ color: "var(--navy)", margin: 0 }}>Utility Dashboard</h1>
      <p style={{ color: "var(--muted)" }}>
        Region-scoped aggregates by contract; individual drilldown requires
        purpose/scope + audit. Bills/broadcasts previewed; immutable
        period/tariff snapshot.
      </p>
      <div className="grid-12" style={{ marginTop: 16 }}>
        <div className="card" style={{ gridColumn: "span 4" }}>
          <div style={{ fontWeight: 700 }}>Transformers</div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>4</div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>
            Contracted region: FUTA feeder
          </div>
        </div>
        <div className="card" style={{ gridColumn: "span 4" }}>
          <div style={{ fontWeight: 700 }}>Total consumption</div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>1,200 kWh</div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>
            Last 7 days · verified intervals only
          </div>
        </div>
        <div className="card" style={{ gridColumn: "span 4" }}>
          <div style={{ fontWeight: 700 }}>Active tamper flags</div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>2</div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>
            Customer identity only if consent active
          </div>
        </div>
        <div className="card" style={{ gridColumn: "span 8" }}>
          <h3>Demand Action — not automatic actuator input</h3>
          <div
            style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}
          >
            <button
              className="btn btn-secondary"
              disabled
              title="Not available in this preview"
            >
              Generate bill (NEPA-verified)
            </button>
            <button
              className="btn btn-secondary"
              disabled
              title="Not available in this preview"
            >
              Disconnection report (report only)
            </button>
            <button
              className="btn btn-secondary"
              disabled
              title="Not available in this preview"
            >
              Broadcast to region
            </button>
          </div>
          <div style={{ fontSize: 12, color: "var(--red)", marginTop: 8 }}>
            Disconnection list is a report, never executes disconnect. Remote
            control requires consent + authority + step-up + dispatch recheck.
          </div>
          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            <div
              style={{
                padding: 12,
                background: "var(--canvas)",
                borderRadius: 8,
              }}
            >
              <strong>Community overview</strong> — aggregate only,
              privacy-by-design.{" "}
              <a href="/alerts" style={{ fontWeight: 600 }}>
                View
              </a>
            </div>
            <div
              style={{
                padding: 12,
                background: "var(--canvas)",
                borderRadius: 8,
              }}
            >
              <strong>Tamper flags</strong> — drill-down shows customer_name
              only if utility_control_consents active.{" "}
              <a href="/alerts" style={{ fontWeight: 600 }}>
                Inspect
              </a>
            </div>
          </div>
        </div>
        <div className="card" style={{ gridColumn: "span 4" }}>
          <h3>Consent</h3>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>
            Remote control requires explicit device-owner consent to named
            utility/capability.
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Active consents</span>
              <strong>12</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Revoked this week</span>
              <span>2</span>
            </div>
          </div>
          <a
            href="/settings/utility-control"
            className="btn btn-secondary"
            style={{ marginTop: 12 }}
          >
            Manage consents
          </a>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 8 }}>
            Revocation invalidates queued commands by policy epoch.
          </div>
        </div>
      </div>
    </AppShell>
  );
}
