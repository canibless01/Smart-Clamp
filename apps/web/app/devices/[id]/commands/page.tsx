"use client";
import AppShell from "@/components/AppShell";
import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/api";
export default function Page({ params }: { params: { id: string } }) {
  const [items, setItems] = useState<any[]>([
    {
      id: "cmd-1",
      on: true,
      reason: "user_manual",
      status: "applied",
      observed_on: true,
      at: "2026-11-09T12:00:00Z",
      reason_code: "ok",
    },
    {
      id: "cmd-2",
      on: false,
      reason: "budget",
      status: "rejected",
      observed_on: false,
      at: "2026-11-09T11:30:00Z",
      reason_code: "budget_active",
    },
    {
      id: "cmd-3",
      on: true,
      reason: "maintenance",
      status: "uncertain",
      observed_on: null,
      at: "2026-11-09T11:00:00Z",
      reason_code: "feedback_unknown",
    },
  ]);
  return (
    <AppShell role="tenant">
      <div className="prototype-notice" role="status">
        Command history preview · these examples are not confirmed device
        actions.
      </div>
      <h1 style={{ color: "var(--navy)", margin: 0 }}>
        Command Activity — {params.id.slice(0, 8)}
      </h1>
      <p style={{ color: "var(--muted)" }}>
        Authorized activity with observed feedback: requested → pending_delivery
        → applied/rejected/expired/uncertain. No implicit auth from ID
        possession.
      </p>
      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <span className="badge badge-verified">applied — feedback matches</span>
        <span className="badge badge-offline">rejected — safe reason</span>
        <span className="badge badge-stale">pending_delivery</span>
        <span className="badge badge-unknown">
          uncertain — feedback_unknown
        </span>
      </div>
      <div className="table-wrap" style={{ marginTop: 16 }}>
        <table>
          <thead>
            <tr>
              <th>Command</th>
              <th>Requested</th>
              <th>Observed</th>
              <th>Status</th>
              <th>Reason</th>
              <th>At</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id}>
                <td style={{ fontFamily: "monospace" }}>{c.id}</td>
                <td>{c.on ? "ON" : "OFF"}</td>
                <td>
                  {c.observed_on === true
                    ? "ON"
                    : c.observed_on === false
                      ? "OFF"
                      : "unknown"}
                </td>
                <td>
                  <span
                    className={`badge ${c.status === "applied" ? "badge-verified" : c.status === "rejected" ? "badge-offline" : "badge-stale"}`}
                  >
                    {c.status}
                  </span>
                </td>
                <td>
                  {c.reason} · {c.reason_code}
                </td>
                <td>{c.at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>
        Lost ACK queries status by command_id; never blind repeats pulse. OFF
        reasons:
        protection/wallet_zero/budget/schedule/user_manual/maintenance/utility —
        most restrictive wins.
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <a href={`/devices/${params.id}`} className="btn btn-secondary">
          Device detail
        </a>
        <a href="/control" className="btn btn-secondary">
          Control
        </a>
        <a href="/support" className="btn btn-secondary">
          Get help
        </a>
      </div>
    </AppShell>
  );
}
