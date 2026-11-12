"use client";
import { useState, useId } from "react";
import Icon, { IconName } from "./Icon";
const appliances: { name: string; icon: IconName; watts: number }[] = [
  { name: "Lights", icon: "bulb", watts: 60 },
  { name: "Fridge", icon: "snow", watts: 180 },
  { name: "Air conditioner", icon: "sun", watts: 1000 },
  { name: "Kettle", icon: "kettle", watts: 1500 },
];
export function EnergySparkline({
  active = true,
  intensity = 1,
}: {
  active?: boolean;
  intensity?: number;
}) {
  const gradientId = useId().replace(/:/g, "");
  return (
    <svg
      viewBox="0 0 420 130"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="energy-sparkline"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity=".18" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g
        transform={`translate(0 ${130 * (1 - intensity)}) scale(1 ${intensity})`}
      >
        <path
          d={
            active
              ? "M0 108 22 106 35 89 48 99 65 90 79 98 93 84 109 89 123 58 138 68 153 53 168 76 183 48 199 55 215 30 230 48 246 37 261 50 277 34 294 42 310 18 327 29 344 24 360 44 376 24 391 32 420 12V130H0Z"
              : "M0 120H420V130H0Z"
          }
          fill={`url(#${gradientId})`}
        />
        <path
          d={
            active
              ? "M0 108 22 106 35 89 48 99 65 90 79 98 93 84 109 89 123 58 138 68 153 53 168 76 183 48 199 55 215 30 230 48 246 37 261 50 277 34 294 42 310 18 327 29 344 24 360 44 376 24 391 32 420 12"
              : "M0 120H420"
          }
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
export default function EnergyExperience() {
  const [selected, setSelected] = useState([true, true, true, false]);
  const [on, setOn] = useState(true);
  const [range, setRange] = useState("Today");
  const watts = on
    ? appliances.reduce((sum, a, i) => sum + (selected[i] ? a.watts : 0), 0)
    : 0;
  const hours = range === "Today" ? 4 : range === "Week" ? 28 : 120;
  const kwh = (watts * hours) / 1000;
  return (
    <div className="energy-experience">
      <div className="experience-top">
        <div>
          <span className="eyebrow">YOUR HOME, AT A GLANCE</span>
          <div className="experience-location">
            <Icon name="home" size={18} />
            My home<span className="demo-label">Interactive preview</span>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="Simulated home power"
          className={`power-switch ${on ? "is-on" : ""}`}
          onClick={() => setOn(!on)}
        >
          <span />
        </button>
      </div>
      <div className="experience-metrics">
        <div>
          <span>Power right now</span>
          <strong aria-live="polite">
            {(watts / 1000).toFixed(2)}
            <small>kW</small>
          </strong>
        </div>
        <div className="experience-state">
          <span className={`status-dot ${on ? "" : "off"}`} />
          {on ? "Power is on" : "Power is off"}
          <span>Simulated home</span>
        </div>
      </div>
      <div className="experience-chart">
        <div className="chart-scale">
          <span>3.0 kW</span>
          <span>1.5 kW</span>
          <span>0.0 kW</span>
        </div>
        <div className="chart-plot">
          <div className="chart-guides" />
          <EnergySparkline
            active={on && watts > 0}
            intensity={Math.max(0.1, watts / 2740)}
          />
          <div className="chart-hours">
            <span>06:00</span>
            <span>10:00</span>
            <span>14:00</span>
            <span>18:00</span>
          </div>
        </div>
      </div>
      <div className="appliance-heading">
        <span>What’s switched on?</span>
        <span>Tap to explore</span>
      </div>
      <div className="appliance-controls">
        {appliances.map((a, i) => (
          <button
            key={a.name}
            type="button"
            aria-pressed={selected[i]}
            className={selected[i] ? "selected" : ""}
            onClick={() =>
              setSelected((prev) => prev.map((s, j) => (j === i ? !s : s)))
            }
          >
            <span className="appliance-icon">
              <Icon name={a.icon} />
            </span>
            <span>
              {a.name}
              <small>{a.watts.toLocaleString()} W</small>
            </span>
            <span className="appliance-dot" />
          </button>
        ))}
      </div>
      <div className="experience-bottom">
        <div
          className="period-tabs"
          role="group"
          aria-label="Energy estimate period"
        >
          {["Today", "Week", "Month"].map((r) => (
            <button
              key={r}
              className={range === r ? "active" : ""}
              onClick={() => setRange(r)}
              aria-pressed={range === r}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="energy-estimate">
          <span>Illustrative energy*</span>
          <strong aria-live="polite">
            {kwh.toFixed(2)} <small>kWh</small>
          </strong>
        </div>
      </div>
      <p className="demo-disclaimer">
        *Simulated readings, using {hours} running hours. Try the controls; no
        real device or bill is affected.
      </p>
    </div>
  );
}
