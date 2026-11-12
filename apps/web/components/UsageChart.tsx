"use client";
import Icon from "./Icon";
export default function UsageChart({
  data,
}: {
  data?: { time: string; kwh: number }[];
}) {
  const points = (data || []).filter(
    (d) => Number.isFinite(d.kwh) && d.kwh >= 0,
  );
  const max = Math.max(...points.map((d) => d.kwh), 0.1);
  return (
    <section className="card" aria-label="Energy usage history">
      <div className="usage-chart-heading">
        <h3>Energy over time</h3>
        <span>kWh · Lagos time</span>
      </div>
      {!points.length ? (
        <div className="chart-empty">
          <Icon name="chart" size={32} />
          <strong>Your energy story starts here.</strong>
          <p>
            Your graph will appear when measured readings are available. Missing
            data isn’t zero usage.
          </p>
          <a href="/install" className="text-link">
            Connect a device <Icon name="arrow" size={15} />
          </a>
        </div>
      ) : (
        <>
          <div
            className="usage-bars"
            role="img"
            aria-label={`Energy usage across ${points.length} measured periods. Exact readings are available below.`}
          >
            {points.map((p, i) => (
              <div className="usage-bar" key={`${p.time}-${i}`}>
                <div
                  style={{ height: `${(p.kwh / max) * 120}px` }}
                  title={`${p.time}: ${p.kwh.toFixed(2)} kWh`}
                />
                <span>{p.time}</span>
              </div>
            ))}
          </div>
          <details className="usage-data">
            <summary>View exact readings</summary>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Time</th>
                    <th scope="col">Energy (kWh)</th>
                  </tr>
                </thead>
                <tbody>
                  {points.map((p, i) => (
                    <tr key={i}>
                      <td>{p.time}</td>
                      <td>{p.kwh.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </section>
  );
}
