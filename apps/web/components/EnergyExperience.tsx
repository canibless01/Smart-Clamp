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
  const [watts, setWatts] = useState(""),
    [hours, setHours] = useState("");
  const valid =
    watts !== "" &&
    hours !== "" &&
    Number.isFinite(Number(watts)) &&
    Number.isFinite(Number(hours)) &&
    Number(watts) >= 0 &&
    Number(hours) >= 0 &&
    Number(hours) <= 24;
  const energy = valid ? (Number(watts) * Number(hours)) / 1000 : null;
  return (
    <div className="energy-experience">
      <div className="experience-top">
        <span className="eyebrow">YOUR NUMBERS. A CLEARER ESTIMATE.</span>
        <Icon name="bolt" />
      </div>
      <h3>What could an appliance use?</h3>
      <p>
        Enter its rated power and daily running time. This calculator uses your
        inputs; it is not a live device reading.
      </p>
      <div className="resource-form">
        <label>
          Appliance power (watts)
          <input
            className="input"
            type="number"
            min="0"
            inputMode="decimal"
            value={watts}
            onChange={(e) => setWatts(e.target.value)}
          />
        </label>
        <label>
          Hours used per day
          <input
            className="input"
            type="number"
            min="0"
            max="24"
            step="0.1"
            inputMode="decimal"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
          />
        </label>
      </div>
      <div className="experience-metrics">
        <div>
          <span>Estimated daily energy</span>
          <strong aria-live="polite">
            {energy === null ? "—" : energy.toFixed(2)}
            <small>kWh</small>
          </strong>
        </div>
      </div>
      {energy !== null && (
        <div className="energy-estimate">
          <span>At the same daily use, over 7 days</span>
          <strong>{(energy * 7).toFixed(2)} kWh</strong>
        </div>
      )}
      <p className="demo-disclaimer">
        Watts × hours ÷ 1,000 = kWh. Rated power can differ from actual
        consumption. SmartClamp measurements are needed to see what your
        appliance actually used.
      </p>
    </div>
  );
}
