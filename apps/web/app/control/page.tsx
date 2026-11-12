"use client";
import AppShell from "@/components/AppShell";
import { useState } from "react";

export default function Page() {
  const [relay, setRelay] = useState<
    "idle" | "pending" | "applied" | "rejected" | "uncertain"
  >("idle");
  const [offReasons, setOffReasons] = useState<string[]>(["wallet_zero"]);
  const [showStepUp, setShowStepUp] = useState(false);

  function canTurnOn() {
    return offReasons.length === 0;
  }

  return (
    <AppShell role="tenant">
      <div className="prototype-notice" role="status">
        Interactive preview · these controls do not operate an installed device.
      </div>
      <h1 style={{ color: "var(--navy)" }}>Control, Schedules & Budgets</h1>
      <div className="card" style={{ marginTop: 12 }}>
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
            <div style={{ fontWeight: 700 }}>Relay interface preview</div>
            <div style={{ color: "var(--muted)", fontSize: 13 }}>
              A real power state needs a confirmed device reading.
            </div>
          </div>
          <span
            className={`badge ${relay === "applied" ? "badge-verified" : relay === "pending" ? "badge-stale" : "badge-unknown"}`}
          >
            {relay === "idle" ? "Preview · OFF" : relay}
          </span>
        </div>
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>
            OFF reasons:{" "}
            {offReasons.length
              ? offReasons.join(", ")
              : "none — ON allowed if voltage/feedback/commissioning ok"}
          </div>
          <div
            style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}
          >
            <button
              onClick={() => {
                if (!canTurnOn()) return;
                setRelay("pending");
                setTimeout(() => setRelay("applied"), 1200);
              }}
              disabled={!canTurnOn()}
              className="btn btn-primary"
            >
              Turn ON {!canTurnOn() && "(blocked)"}
            </button>
            <button
              onClick={() => setRelay("pending")}
              className="btn btn-secondary"
            >
              Turn OFF
            </button>
            <button
              onClick={() => setShowStepUp(true)}
              className="btn btn-secondary"
            >
              Step-up verify
            </button>
          </div>
          {!canTurnOn() && (
            <div className="error-panel" style={{ marginTop: 12 }}>
              ON rejected: wallet_zero still active. Recharge clears only
              wallet_zero; protection/manual/budget/maintenance remain. Most
              restrictive current OFF wins.
            </div>
          )}
          {relay === "pending" && (
            <div style={{ marginTop: 12 }}>
              Request → 202 pending → polling receipt →
              applied/rejected/expired/uncertain. Never blind-pulse on lost ACK.
            </div>
          )}
        </div>
      </div>
      <div className="grid-12" style={{ marginTop: 16 }}>
        <div className="card" style={{ gridColumn: "span 6" }}>
          <h3>Schedules</h3>
          <p style={{ color: "var(--muted)", fontSize: 13 }}>
            Africa/Lagos recurrence, unique(schedule_id, occurrence_utc), max
            lateness 60s. Miss while offline = skip, not replay.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              className="input"
              placeholder="06:00"
              style={{ width: 100 }}
            />
            <input
              className="input"
              placeholder="22:00"
              style={{ width: 100 }}
            />
            <button className="btn btn-primary">Add schedule</button>
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>
            Creation uses step-up once to create bounded delegated policy, not
            SMS each run. Edit requires version conflict409 → reload/review.
          </div>
        </div>
        <div className="card" style={{ gridColumn: "span 6" }}>
          <h3>Budget</h3>
          <input className="input" placeholder="Monthly limit ₦ e.g. 10000" />
          <button className="btn btn-primary" style={{ marginTop: 8 }}>
            Save budget
          </button>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>
            Budget counts consumption valuation in configured period, not
            top-ups. Change recalculates present reason.
          </div>
        </div>
      </div>
      {showStepUp && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(16,42,67,.6)",
            display: "grid",
            placeItems: "center",
            padding: 16,
          }}
        >
          <div className="card" style={{ maxWidth: 400, width: "100%" }}>
            <h3>Step-up required</h3>
            <p style={{ color: "var(--muted)" }}>
              Enter 6-digit code (sandbox: 123456). One-use, 5 attempts, 60s
              cooldown, bound to operation hash.
            </p>
            <input className="input" placeholder="123456" inputMode="numeric" />
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button
                onClick={() => setShowStepUp(false)}
                className="btn btn-primary"
              >
                Verify
              </button>
              <button
                onClick={() => setShowStepUp(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
