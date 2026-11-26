"use client";
import {useWorkspaceLive} from "@/components/WorkspaceLiveProvider";
import {ElectricalTrends} from '@/components/EnergyInstruments';
import { useState, useEffect } from "react";
import RecordWorkspace, { RecordTable } from "@/components/RecordWorkspace";
import { apiFetch, formatKwh } from "@/lib/api";
function Readings({ id }: { id: string }) {
  const live=useWorkspaceLive(),observation=live.snapshot?.context.devices?.find((device:any)=>device.id===id)?.measurement,changeKey=observation?String(observation.observed_at)+"|"+String(observation.value)+"|"+String(observation.quality):"";
  const [items, setItems] = useState<any[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    setError("");
    const c = new AbortController();
    const fetchReadings=()=>apiFetch(`/devices/${id}/events`, { signal: c.signal })
      .then((d) => setItems(d.items))
      .catch((e) => {
        if (!c.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    void fetchReadings();

    return () => {c.abort();};
  }, [id,changeKey]);
  return (
    <section className="card">
      {error ? (
        <p role="alert">{error}</p>
      ) : loading ? (
        <p role="status">Loading measurements…</p>
      ) : (
        <>
          <ElectricalTrends samples={items.slice().reverse().map(r=>({at:r.occurred_at_ms,voltage:r.quality==='valid'&&r.clock_quality==='trusted'&&r.voltage_mv!=null?r.voltage_mv/1000:null,current:r.quality==='valid'&&r.clock_quality==='trusted'&&r.current_ma!=null?r.current_ma/1000:null,power:r.quality==='valid'&&r.clock_quality==='trusted'&&r.real_power_mw!=null?r.real_power_mw/1000:null}))}/>
          <details className="instrument-data"><summary>Measurement records</summary><RecordTable
            items={items}
            columns={[
              {
                key: "occurred_at_ms",
                label: "Time (Lagos)",
                render: (r) =>
                  r.occurred_at_ms
                    ? new Date(r.occurred_at_ms).toLocaleString("en-NG", {
                        timeZone: "Africa/Lagos",
                      })
                    : "Unknown",
              },
              {
                key: "real_power_mw",
                label: "Measured power",
                render: (r) =>
                  r.real_power_mw === null
                    ? "Unavailable"
                    : `${r.real_power_mw / 1000} W`,
              },
              {
                key: "import_mwh",
                label: "Cumulative import",
                render: (r) =>
                  r.import_mwh === null
                    ? "Unavailable"
                    : formatKwh(r.import_mwh),
              },
              { key: "quality", label: "Quality" },
              { key: "clock_quality", label: "Clock confidence" },
            ]}
          />
          </details><p>
            Cumulative counters are not period totals. Gaps remain unknown; they
            are not converted to zero usage. Showing up to 50 recent records.
          </p>
        </>
      )}
    </section>
  );
}
export default function Page() {
  const [selected, setSelected] = useState("");
  return (
    <RecordWorkspace
      title="Usage history"
      description="Measurements received from your linked devices, within your authorized occupancy."
      endpoint="/users/me/context"
    >
      {(data) =>
        data.devices.length ? (
          <>
            <label>
              SmartClamp
              <select
                className="input"
                value={selected || data.devices[0].id}
                onChange={(e) => setSelected(e.target.value)}
              >
                {data.devices.map((d: any) => (
                  <option key={d.id} value={d.id}>
                    {d.role} · {d.id}
                  </option>
                ))}
              </select>
            </label>
            <Readings id={selected || data.devices[0].id} />
            <div className="resource-actions"><a className="btn btn-secondary" href="/reports">Create a signed report or CSV export</a></div>
          </>
        ) : (
          <div className="workspace-empty">
            <h2>No device measurements yet.</h2>
            <a className="btn btn-primary" href="/devices/link">
              Link SmartClamp
            </a>
          </div>
        )
      }
    </RecordWorkspace>
  );
}
