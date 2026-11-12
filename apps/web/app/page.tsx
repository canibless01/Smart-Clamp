"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import PublicShell from "@/components/PublicShell";
import MeterLookup from "@/components/MeterLookup";
import Icon, { IconName } from "@/components/Icon";
import EnergyExperience, {
  EnergySparkline,
} from "@/components/EnergyExperience";
const audiences = [
  {
    name: "Your home",
    icon: "home",
    title: "Your home. Your power story.",
    copy: "See where your electricity goes, understand your bill, and make everyday decisions with a little more clarity.",
    features: [
      "A clear view of daily usage",
      "History you can actually understand",
      "Optional control with supported hardware",
    ],
    href: "/for-homeowners",
    cta: "Explore for homeowners",
  },
  {
    name: "Your building",
    icon: "building",
    title: "Shared building. Fairer bills.",
    copy: "Give every room its own view of consumption. Keep a building-wide picture, with clearer records for everyone.",
    features: [
      "Room-by-room visibility",
      "Individual balances and shared clarity",
      "Records that help resolve questions",
    ],
    href: "/for-landlords",
    cta: "Explore for landlords",
  },
  {
    name: "Your smart meter",
    icon: "meter",
    title: "Already have a meter? Start there.",
    copy: "Check your meter account for free. A compatible connection can bring your existing meter into the picture, too.",
    features: [
      "Free meter account validation",
      "Optional optical reader for supported meters",
      "One place to understand your usage",
    ],
    href: "/smart-meter",
    cta: "Explore meter connections",
  },
] as const;
function DeviceVisual() {
  return (
    <svg
      viewBox="0 0 460 340"
      className="device-visual"
      role="img"
      aria-label="Concept illustration of a current-sensing clamp connected around a cable"
    >
      <defs>
        <linearGradient id="clamp-body" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#59635c" />
          <stop offset=".5" stopColor="#252e29" />
          <stop offset="1" stopColor="#101a14" />
        </linearGradient>
        <linearGradient id="clamp-edge" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#839184" />
          <stop offset="1" stopColor="#2b382f" />
        </linearGradient>
        <filter id="device-shadow">
          <feDropShadow dx="0" dy="24" stdDeviation="16" floodOpacity=".16" />
        </filter>
      </defs>
      <ellipse
        cx="230"
        cy="292"
        rx="120"
        ry="16"
        fill="#213f2e"
        opacity=".08"
      />
      <path d="M233-10v105m0 130v125" stroke="#d6d2c5" strokeWidth="35" />
      <path d="M230-10v105m0 130v125" stroke="#f7f4e9" strokeWidth="24" />
      <path d="M230-10v105m0 130v125" stroke="#e5e0d4" strokeWidth="2" />
      <g filter="url(#device-shadow)">
        <path
          d="M140 130c0-58 40-96 92-96s92 38 92 96v84c0 20-17 36-37 36H177c-20 0-37-16-37-36Z"
          fill="url(#clamp-edge)"
        />
        <path
          d="M146 128c0-52 37-87 86-87s86 35 86 87v80c0 20-14 34-34 34H180c-20 0-34-14-34-34Z"
          fill="url(#clamp-body)"
        />
        <ellipse
          cx="232"
          cy="111"
          rx="43"
          ry="45"
          fill="#101b15"
          stroke="#647267"
          strokeWidth="5"
        />
        <ellipse cx="232" cy="110" rx="34" ry="37" fill="#edece2" />
        <path d="M232 73v74" stroke="#f7f4e9" strokeWidth="26" />
        <path d="M226 73v74" stroke="#ddd8c9" strokeWidth="3" />
        <path d="M166 171h132" stroke="#647267" strokeWidth="1" />
        <rect
          x="169"
          y="185"
          width="126"
          height="39"
          rx="8"
          fill="#19231d"
          stroke="#455247"
        />
        <path d="m226 192-9 12h8l-3 13 13-17h-9l4-8" fill="#d8efb4" />
        <circle cx="281" cy="203" r="3" fill="#c4e89e" />
        <circle cx="161" cy="220" r="3" fill="#111b15" />
        <circle cx="303" cy="220" r="3" fill="#111b15" />
      </g>
      <path
        d="M317 210h35q16 0 16 16v26"
        stroke="#25362c"
        strokeWidth="6"
        fill="none"
      />
      <circle cx="368" cy="260" r="8" fill="#25362c" />
    </svg>
  );
}
export default function HomePage() {
  const [audience, setAudience] = useState(0);
  const [motion, setMotion] = useState(true);
  const a = audiences[audience];
  return (
    <PublicShell>
      <div className={`landing ${motion ? "" : "motion-paused"}`}>
        <section className="home-hero container">
          <div className="hero-copy">
            <span className="eyebrow">
              <span className="status-dot" /> LESS GUESSWORK. MORE CLARITY.
            </span>
            <h1>
              Make sense
              <br />
              of your{" "}
              <span className="hero-word">
                power.
                <svg viewBox="0 0 290 17" aria-hidden="true">
                  <path
                    d="M3 13Q130-3 286 8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="5"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h1>
            <p>
              What you use. What you pay. What’s really happening.
              <br className="desktop-break" /> Bring it all into focus with
              SmartClamp.
            </p>
            <div className="hero-actions">
              <Link href="/signup" className="btn btn-primary">
                Find your clarity <Icon name="arrow" size={18} />
              </Link>
              <a href="#demo" className="text-link">
                Take a closer look{" "}
                <span className="play-circle">
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 16 16"
                    aria-hidden="true"
                  >
                    <path d="m5 3 8 5-8 5z" fill="currentColor" />
                  </svg>
                </span>
              </a>
            </div>
            <div className="hero-footnote">
              <Icon name="shield" size={16} />
              <span>
                For homes and shared buildings. With or without a meter.
              </span>
            </div>
          </div>
          <div className="hero-scene">
            <Image
              src="/images/energy-home.png"
              alt="Illustrative contemporary home at dusk, with warm lights glowing inside"
              fill
              priority
              sizes="(max-width: 760px) 100vw, 52vw"
              className="hero-home-image"
            />
            <div className="scene-shade" />
            <div className="scene-caption">
              <span className="scene-location">
                <span className="status-dot" /> A little more peace of mind.
              </span>
              <button
                className="motion-button"
                onClick={() => setMotion(!motion)}
                aria-label={
                  motion
                    ? "Pause decorative animation"
                    : "Resume decorative animation"
                }
                aria-pressed={!motion}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  {motion ? (
                    <path
                      d="M8 5v14M16 5v14"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  ) : (
                    <path d="m8 5 11 7-11 7z" fill="currentColor" />
                  )}
                </svg>
              </button>
            </div>
            <svg
              viewBox="0 0 600 550"
              className="scene-energy-path"
              aria-hidden="true"
            >
              <path
                d="M90 458v-62q0-24 24-24h324q24 0 24-24V110"
                fill="none"
                stroke="#e1f0ce"
                strokeWidth="1"
                opacity=".45"
              />
              <path
                className="flow-line"
                d="M90 458v-62q0-24 24-24h324q24 0 24-24V110"
                fill="none"
                stroke="#e1f0ce"
                strokeWidth="3"
                strokeDasharray="3 190"
              />
              <circle cx="462" cy="110" r="6" fill="#e5f5c9" />
              <circle
                cx="462"
                cy="110"
                r="13"
                fill="none"
                stroke="#e5f5c9"
                opacity=".5"
              />
            </svg>
            <div className="hero-insight">
              <div className="insight-label">
                <span className="mini-icon">
                  <Icon name="bolt" size={15} />
                </span>{" "}
                A clearer picture<span>PREVIEW</span>
              </div>
              <div className="insight-power">
                1.24 <span>kW</span>
                <span className="insight-status">
                  <span className="status-dot" />
                  Home energy
                </span>
              </div>
              <EnergySparkline />
              <div className="insight-axis">
                <span>06:00</span>
                <span>12:00</span>
                <span>18:00</span>
              </div>
            </div>
            <span className="scene-illustration-label">
              Concept home · illustrative readings
            </span>
          </div>
        </section>
        <div className="benefits-strip container">
          <div>
            <span>01</span>
            <Icon name="chart" />
            Know what you use.
          </div>
          <div>
            <span>02</span>
            <Icon name="wallet" />
            Understand what you pay.
          </div>
          <div>
            <span>03</span>
            <Icon name="shield" />
            Keep a record you can trust.
          </div>
        </div>
        <section className="section-space container" id="demo">
          <div className="section-heading">
            <div>
              <span className="eyebrow">FEEL THE DIFFERENCE</span>
              <h2>
                A little insight.
                <br />A lot more control.
              </h2>
            </div>
            <p>
              Electricity shouldn’t be a mystery.
              <br />
              Explore a home’s energy in real time—
              <br />
              and see how the small things add up.
            </p>
          </div>
          <div className="demo-layout">
            <div className="demo-story">
              <span className="outline-icon">
                <Icon name="bolt" size={26} />
              </span>
              <h3>
                Your home,
                <br />
                in a new light.
              </h3>
              <p>
                Turn an appliance on. Watch your usage change. That’s the kind
                of clarity we’re building.
              </p>
              <div className="demo-story-rule" />
              <span className="small-label">GO AHEAD. TRY IT.</span>
              <div className="demo-callout">
                <Icon name="arrow" size={24} />
                <span>
                  Tap the appliances
                  <br />
                  to see their impact.
                </span>
              </div>
              <Link href="/how-it-works" className="text-link">
                How SmartClamp works <Icon name="arrow" size={16} />
              </Link>
            </div>
            <EnergyExperience />
          </div>
        </section>
        <section className="hardware-section">
          <div className="container hardware-layout">
            <div className="hardware-visual">
              <div className="device-orbit orbit-one" />
              <div className="device-orbit orbit-two" />
              <DeviceVisual />
              <span className="hardware-tag">
                <span className="status-dot" /> Small device. A whole new
                perspective.
              </span>
              <span className="concept-label">Device concept illustration</span>
            </div>
            <div className="hardware-copy">
              <span className="eyebrow">BEHIND THE CLARITY</span>
              <h2>
                Good things come
                <br />
                in small clamps.
              </h2>
              <p>
                Our devices measure electricity at the wire. SmartClamp turns
                those readings into a clear picture of your home, room or
                building.
              </p>
              <div className="hardware-steps">
                {[
                  {
                    n: "01",
                    t: "Measure at the source",
                    d: "Understand the energy passing through your wire.",
                  },
                  {
                    n: "02",
                    t: "Connect the bigger picture",
                    d: "Bring readings together, even after a connection returns.",
                  },
                  {
                    n: "03",
                    t: "Make your next move",
                    d: "Track bills, keep evidence and manage supported devices.",
                  },
                ].map((s) => (
                  <div key={s.n}>
                    <span>{s.n}</span>
                    <div>
                      <h3>{s.t}</h3>
                      <p>{s.d}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/how-it-works" className="text-link">
                Meet the system <Icon name="arrow" size={17} />
              </Link>
            </div>
          </div>
        </section>
        <section className="section-space container" id="for-you">
          <div className="section-heading">
            <div>
              <span className="eyebrow">FIND YOUR FIT</span>
              <h2>
                Different homes.
                <br />
                The same peace of mind.
              </h2>
            </div>
            <p>
              One platform. A setup that makes sense
              <br />
              for the way you live.
            </p>
          </div>
          <div
            className="audience-tabs"
            role="tablist"
            aria-label="Find your setup"
          >
            {audiences.map((item, i) => (
              <button
                key={item.name}
                role="tab"
                id={`audience-tab-${i}`}
                aria-selected={audience === i}
                aria-controls="audience-panel"
                tabIndex={audience === i ? 0 : -1}
                onKeyDown={(e) => {
                  if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                    e.preventDefault();
                    const next =
                      (audience + (e.key === "ArrowRight" ? 1 : 2)) % 3;
                    setAudience(next);
                    document.getElementById(`audience-tab-${next}`)?.focus();
                  }
                }}
                onClick={() => setAudience(i)}
              >
                <Icon name={item.icon as IconName} />
                {item.name}
                <Icon name="arrow" size={16} />
              </button>
            ))}
          </div>
          <div
            className="audience-panel"
            id="audience-panel"
            role="tabpanel"
            aria-labelledby={`audience-tab-${audience}`}
          >
            <div className={`audience-art audience-art-${audience}`}>
              <div className="blueprint-grid" />
              {audience === 0 ? (
                <div className="home-outline">
                  <Icon name="home" size={124} />
                  <div className="home-window" />
                  <span className="art-node node-left">
                    <Icon name="chart" />
                  </span>
                  <span className="art-node node-right">
                    <Icon name="shield" />
                  </span>
                </div>
              ) : audience === 1 ? (
                <div className="building-rooms">
                  {["01", "02", "03", "04", "05", "06"].map((r, i) => (
                    <div key={r}>
                      <Icon name={i % 2 ? "bulb" : "plug"} />
                      <small>ROOM {r}</small>
                      <span className="room-energy-bar">
                        <i style={{ width: `${35 + i * 8}%` }} />
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="meter-art">
                  <span className="meter-brand">smartclamp.</span>
                  <div className="meter-screen">
                    <small>ENERGY INSIGHTS</small>
                    <strong>
                      18.24<small>kWh</small>
                    </strong>
                    <span>Illustrative reading</span>
                  </div>
                  <Icon name="bolt" size={26} />
                  <div className="meter-art-lines" />
                </div>
              )}
              <span className="art-caption">
                {audience === 0
                  ? "A clearer connection to your home."
                  : audience === 1
                    ? "Every room has its own story."
                    : "Bring your existing meter into focus."}
              </span>
            </div>
            <div className="audience-copy" key={audience}>
              <span className="eyebrow">MADE FOR {a.name.toUpperCase()}</span>
              <h3>{a.title}</h3>
              <p>{a.copy}</p>
              <ul>
                {a.features.map((f) => (
                  <li key={f}>
                    <Icon name="check" size={17} />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href={a.href} className="btn btn-primary">
                {a.cta}
                <Icon name="arrow" size={16} />
              </Link>
            </div>
          </div>
        </section>
        <section id="meter" className="meter-section">
          <div className="container meter-layout">
            <div>
              <span className="eyebrow">A SIMPLE PLACE TO START</span>
              <h2>
                Have a meter?
                <br />
                Let’s say hello.
              </h2>
              <p>
                Check your meter account. It’s free,
                <br />
                and you don’t need to sign up.
              </p>
              <span className="meter-safe">
                <Icon name="shield" size={17} /> A lookup, not a payment.
              </span>
            </div>
            <MeterLookup />
          </div>
        </section>
        <section className="section-space container faq-section">
          <div>
            <span className="eyebrow">GOOD QUESTIONS</span>
            <h2>
              A little clarity,
              <br />
              before you start.
            </h2>
            <Link href="/faqs" className="text-link">
              More questions, answered <Icon name="arrow" size={17} />
            </Link>
          </div>
          <div className="faq-list">
            {[
              [
                "Do I need a smart meter?",
                "No. SmartClamp is designed for homes with or without an existing meter. Your setup depends on your building and the measurements available.",
              ],
              [
                "Can I use it in a shared building?",
                "Yes. Room-level devices help residents understand their own consumption, while landlords can see the building-wide picture.",
              ],
              [
                "What happens if the internet goes off?",
                "A supported device stores readings locally and sends them when the connection returns. The app shows when it last received data, so old readings aren’t mistaken for live ones.",
              ],
              [
                "Can I turn my power on and off?",
                "Remote control requires compatible relay hardware, a commissioned installation and an eligible service. Monitoring-only devices cannot switch power.",
              ],
              [
                "Is SmartClamp available now?",
                "We’re preparing the pilot around the FUTA area. You can explore the platform and contact our team about your setup. Hardware availability and pricing will be confirmed before an order.",
              ],
            ].map(([q, answer]) => (
              <details key={q}>
                <summary>
                  {q}
                  <span className="faq-plus" aria-hidden="true">
                    +
                  </span>
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="closing-section container">
          <div className="closing-orbits" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          <span className="eyebrow">YOUR POWER. IN PERSPECTIVE.</span>
          <h2>
            Less wondering.
            <br />
            More living.
          </h2>
          <p>Let’s make electricity one less thing to guess about.</p>
          <Link href="/signup" className="btn btn-light">
            Get started with SmartClamp <Icon name="arrow" size={18} />
          </Link>
          <span className="closing-note">
            Built for Nigeria. Starting with a thoughtful pilot.
          </span>
        </section>
      </div>
    </PublicShell>
  );
}
