"use client";
import AppShell from "@/components/AppShell";
import UsageChart from "@/components/UsageChart";
import { useState } from "react";
export default function Page() {
  const [range, setRange] = useState("7d");
  const [source, setSource] = useState("primary");
  return (
    <AppShell role="tenant">
      <div className="prototype-notice" role="status">
        History preview · example rows below are not readings from your account.
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ margin: 0, color: "var(--navy)" }}>Usage History</h1>
          <p style={{ color: "var(--muted)", margin: 0 }}>
            Date/source selector; gaps/backfill visible; scoped to ownership
            intervals.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="input"
            style={{ width: 120 }}
          >
            <option value="24h">24h</option>
            <option value="7d">7 days</option>
            <option value="30d">30 days</option>
            <option value="90d">90 days</option>
          </select>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="input"
            style={{ width: 140 }}
          >
            <option value="primary">Primary clamp</option>
            <option value="meter">IR Reader</option>
            <option value="manual">Manual</option>
          </select>
          <button className="btn btn-secondary">Export CSV</button>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
        <span className="badge badge-verified">
          Verified — 98% coverage, trusted clock
        </span>
        <span className="badge badge-stale">Stale — last sync 3 min ago</span>
        <span className="badge badge-unknown">Gap — missing 2h, not zero</span>
      </div>
      <div className="grid-12" style={{ marginTop: 16 }}>
        <div style={{ gridColumn: "span 8" }}>
          <UsageChart />
        </div>
        <div style={{ gridColumn: "span 4" }}>
          <div className="card">
            <div style={{ fontWeight: 700 }}>
              Summary ({range}, {source})
            </div>
            <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Total</span>
                <strong>42.8 kWh</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Average</span>
                <strong>1.24 kW</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Cost (est)</span>
                <strong>₦2,840</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Coverage</span>
                <span className="badge badge-verified">96.2%</span>
              </div>
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 12 }}>
              Gaps shown as missing, not zero usage. Backfilled data marked with
              quality flag. Times UTC stored, Africa/Lagos displayed.
            </div>
          </div>
          <div className="card" style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 700 }}>Basic Pro Insights</div>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>
              Load signatures, power factor, peer benchmarks — feature-gated.
            </div>
            <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 13,
                }}
              >
                <span>Fridge</span>
                <span>82% confidence</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 13,
                }}
              >
                <span>AC unit</span>
                <span>91% confidence</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 13,
                }}
              >
                <span>Power factor</span>
                <span>0.92 ✓</span>
              </div>
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 8 }}>
              Predictions show model/version/confidence, never actuate hardware
              without validation.
            </div>
          </div>
        </div>
        <div className="card" style={{ gridColumn: "span 12" }}>
          <h3>Readings — {range} (Africa/Lagos)</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Time (Lagos)</th>
                  <th>Power</th>
                  <th>Energy</th>
                  <th>Quality</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>2026-11-09 14:00</td>
                  <td>1.24 kW</td>
                  <td>0.42 kWh</td>
                  <td>
                    <span className="badge badge-verified">verified</span>
                  </td>
                  <td>clamp</td>
                </tr>
                <tr>
                  <td>2026-11-09 13:00</td>
                  <td>—</td>
                  <td>—</td>
                  <td>
                    <span className="badge badge-unknown">gap — not zero</span>
                  </td>
                  <td>—</td>
                </tr>
                <tr>
                  <td>2026-11-09 12:00</td>
                  <td>0.89 kW</td>
                  <td>0.38 kWh</td>
                  <td>
                    <span className="badge badge-verified">verified</span>
                  </td>
                  <td>clamp</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>
            Missing readings never become fabricated zero or false "verified"
            badge. Device gateway offline propagates dependent connectivity
            loss.
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <a href="/billing" className="btn btn-primary">
              Billing
            </a>
            <a
              href="/verification-reports/demo-token"
              className="btn btn-secondary"
            >
              Generate report
            </a>
            <button className="btn btn-secondary">Download data</button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
