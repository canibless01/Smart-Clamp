"use client";
import { useState, useEffect, useCallback } from "react";
import AppShell from "./AppShell";
import { apiFetch } from "@/lib/api";
export default function RecordWorkspace({
  title,
  description,
  endpoint,
  role,
  children,
}: {
  title: string;
  description: string;
  endpoint: string;
  role?: string;
  children: (data: any, reload: () => void) => React.ReactNode;
}) {
  const [data, setData] = useState<any>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await apiFetch(endpoint));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to connect.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [endpoint]);
  useEffect(() => {
    void load();
    const refreshed = () => void load();
    window.addEventListener("smartclamp:session-updated", refreshed);
    return () => window.removeEventListener("smartclamp:session-updated", refreshed);
  }, [load]);
  return (
    <AppShell role={role}>
      <div className="overview-heading">
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => void load()}
          disabled={loading}
        >
          {loading ? "Updating…" : "Refresh"}
        </button>
      </div>
      {error && (
        <div className="error-panel" role="alert">
          {error}{" "}
          <a href="/login" className="text-link">
            Log in
          </a>
        </div>
      )}
      {loading ? (
        <p role="status">Loading your records…</p>
      ) : (
        data && children(data, () => void load())
      )}
    </AppShell>
  );
}
export function RecordTable({
  columns,
  items,
}: {
  columns: {
    key: string;
    label: string;
    render?: (r: any) => React.ReactNode;
  }[];
  items: any[];
}) {
  return items.length ? (
    <div className="data-table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th scope="col" key={c.key}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((r, i) => (
            <tr key={r.id || i}>
              {columns.map((c) => (
                <td key={c.key}>
                  {c.render ? c.render(r) : (r[c.key] ?? "Not recorded")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <p>No records yet. New records will appear here once received.</p>
  );
}
