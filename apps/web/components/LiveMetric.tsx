"use client";
export function LiveMetric({
  label,
  value,
  unit,
  observedAt,
  quality,
  coverage,
}: {
  label: string;
  value: number | string | null;
  unit: string;
  observedAt?: string;
  quality: string;
  coverage?: string;
}) {
  const validDate = observedAt && Number.isFinite(Date.parse(observedAt));
  const when = validDate
    ? new Date(observedAt!).toLocaleString("en-NG", {
        timeZone: "Africa/Lagos",
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;
  const state =
    value == null || value === "—"
      ? "unavailable"
      : !when
        ? "unconfirmed"
        : Date.now() - Date.parse(observedAt!) > 180000
          ? "stale"
          : quality || "unknown";
  return (
    <div className="card metric-card">
      <span className="metric-label">{label}</span>
      <div className="metric-value">
        {value ?? "—"}
        <span>{value != null && value !== "—" ? unit : ""}</span>
      </div>
      <div className="metric-footer">
        <span
          className={`badge ${state === "verified" ? "badge-verified" : state === "stale" ? "badge-stale" : "badge-unknown"}`}
        >
          {state === "stale"
            ? "Last recorded"
            : state === "unconfirmed"
              ? "Awaiting timestamp"
              : state === "unavailable"
                ? "Awaiting readings"
                : state}
        </span>
        {coverage && <span>{coverage} coverage</span>}
      </div>
      <p className="metric-time">
        {when
          ? `Observed ${when} · Lagos`
          : "No confirmed observation time yet."}
      </p>
    </div>
  );
}
export function StatusBadge({ supply, connectivity, relay }: any) {
  return (
    <div className="status-badges">
      <span
        className={`badge ${supply === "present" ? "badge-verified" : supply === "unknown" || !supply ? "badge-unknown" : "badge-stale"}`}
      >
        Supply · {supply || "unknown"}
      </span>
      <span
        className={`badge ${connectivity === "online" ? "badge-verified" : "badge-unknown"}`}
      >
        Device · {connectivity || "unknown"}
      </span>
      <span className="badge badge-unknown">
        Relay ·{" "}
        {relay?.observed === true
          ? "on"
          : relay?.observed === false
            ? "off"
            : "unconfirmed"}
        {relay?.pending_command_id ? " · request pending" : ""}
      </span>
    </div>
  );
}
