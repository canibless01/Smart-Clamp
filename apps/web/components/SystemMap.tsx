"use client";
import { useState } from "react";
import Icon, { IconName } from "./Icon";
const steps = [
  {
    icon: "bolt",
    title: "Electricity, measured.",
    text: "A correctly installed device measures electricity passing through the wire. It’s the starting point for understanding your usage.",
    label: "At your wire",
  },
  {
    icon: "meter",
    title: "A connection that keeps up.",
    text: "Room and pole devices send readings through their assigned hub or gateway. Supported devices keep records locally when the internet is unavailable.",
    label: "Your device",
  },
  {
    icon: "shield",
    title: "The bigger picture, checked.",
    text: "SmartClamp brings the available readings together. Where a suitable upstream measurement exists, it can compare records and flag differences for review.",
    label: "SmartClamp platform",
  },
  {
    icon: "home",
    title: "Clarity, in your hands.",
    text: "See your usage, follow your balance and keep a history. With eligible, commissioned hardware, you can request power control, too.",
    label: "Your app",
  },
];
export default function SystemMap() {
  const [active, setActive] = useState(0);
  return (
    <div className="system-explainer">
      <div className="system-map">
        <svg
          viewBox="0 0 500 330"
          className="system-connections"
          aria-hidden="true"
        >
          <ellipse
            cx="250"
            cy="165"
            rx="175"
            ry="115"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
          />
          <ellipse
            cx="250"
            cy="165"
            rx="175"
            ry="115"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeDasharray="4 170"
            className="flow-line"
          />
        </svg>
        <div className="system-center">
          <Icon name="home" size={46} />
          <span>
            Your energy.
            <br />
            Connected.
          </span>
        </div>
        {steps.map((s, i) => (
          <button
            key={s.label}
            className={`system-node system-node-${i} ${active === i ? "active" : ""}`}
            onClick={() => setActive(i)}
            aria-pressed={active === i}
          >
            <Icon name={s.icon as IconName} size={24} />
            <span>{s.label}</span>
          </button>
        ))}
        <span className="system-note">Explore each part of the picture.</span>
      </div>
      <div className="system-explanation" aria-live="polite">
        <span className="eyebrow">0{active + 1} / 04</span>
        <h3>{steps[active].title}</h3>
        <p>{steps[active].text}</p>
        <div className="system-step-buttons">
          {steps.map((s, i) => (
            <button
              key={i}
              aria-label={`Show step ${i + 1}: ${s.title}`}
              aria-pressed={active === i}
              onClick={() => setActive(i)}
            >
              {String(i + 1).padStart(2, "0")}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
