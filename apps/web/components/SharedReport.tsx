"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import MeasurementReport from "./MeasurementReport";
export default function SharedReport({ token }: { token: string }) {
  const [data, setData] = useState<any>(null), [error, setError] = useState("");
  useEffect(() => { const c = new AbortController(); apiFetch(`/public/reports/${encodeURIComponent(token)}`, { signal: c.signal }).then(setData).catch(e => { if (!c.signal.aborted) setError(e.message); }); return () => c.abort(); }, [token]);
  return <>{error ? <p role="alert" className="error-panel">{error}</p> : data ? <MeasurementReport data={data} /> : <p role="status">Verifying the issued snapshot…</p>}</>;
}
