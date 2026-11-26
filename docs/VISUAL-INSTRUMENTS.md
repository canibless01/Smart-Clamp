# Visual monitoring and controls — 26 November 2026

The visual reference is the owner's Blynk-style dashboard. SmartClamp keeps its approved white/forest/sage branding and uses engineering instruments in the core monitoring pages. The reference's ESP8266 wiring is not an approved production BOM or a hardware implementation instruction.

## Implemented visual system

- Voltage, current and real-power arc gauges with needles, display scales, units and unavailable/stale states.
- Three independent sampled trend charts, period controls, min/peak values and expandable exact readings. Null/untrusted readings and large time gaps break the trace; missing values are not converted to zero. Negative real power remains visible as export.
- Grid → SmartClamp → room flow diagram. Motion represents measured power flow and is distinct from relay position. Unknown supply and unconfirmed switching remain explicit.
- A familiar power-symbol switch with ON/OFF states, keyboard operation and accessible switch semantics. Confirmed relay state stays separate from the requested state. Production phone verification, restrictions, command expiry and signed physical receipts are unchanged.
- Per-room relative consumption bars in the investor view. Real landlord room measurements remain ownership-scoped; no tenant credit/control privilege is added.
- Compact mobile navigation and a View & scenarios control keep setup fields out of the way. Mobile instruments use a larger two-column layout rather than three unreadable miniature gauges.

Shared components live in `apps/web/components/EnergyInstruments.tsx`. They are used by the isolated investor demo, homeowner/tenant overview, measurement history and power-control page. Exact records remain available to support accessibility and engineering review.

## Real measurements versus the walkthrough

The `/demo` route generates clearly identified fictional samples every two seconds, retaining a bounded trace for each fictional room. Its single banner identifies the walkthrough; normal product wording is used elsewhere. Low/high voltage, outage, manual OFF and offline states remain separate. Reduced-motion preference pauses the synthetic stream and removes needle/flow animation. The demo never contacts production APIs or creates Auth tokens.

Real dashboard `electrical_history` contains up to 120 scoped source readings in chronological order, expressed as volts, amperes and watts. It uses the same current-occupancy boundary as the existing tenant measurement projection. Invalid or untrusted source values appear as gaps. The device-events response now includes current_ma, so the real history page can render the current trace too.

The real overview/history refresh every 15 seconds while visible. They update the measurements without replacing the page with loading placeholders. A network interruption does not manufacture a new reading. Display-only voltage advisory settings remain separate from actual device protection.

Gauge scales are visual ranges, not editable trip/current limits or certified equipment ratings. Trend lines describe sampled RMS/real-power measurements, not captured 50 Hz electrical waveforms. This work does not add appliance identification or replace production hardware qualification.

## Delivery and remaining scope

Investor screenshots stay under `docs/investor-demo/`, separate from the original gallery. They are browser captures of the implementation, not generated design images. Capture tooling uses reduced motion for deterministic screenshots.

This increment covers the core electrical monitoring/history/control surfaces. It is not a claim that every finance, support, settings, internal or planned feature has been redesigned or implemented. Existing business forms and operational records remain intact. Continue applying the visual system where it improves the user's actual task, rather than replacing required account/payment information with unexplained icons.

No SQL migration is required. Existing external-project SQL, provider setup and physical acceptance boundaries remain as documented in the launch checkpoint.

Verified visual checkpoint: 61 real PostgreSQL/GoTrue API integration tests, 37 production-browser checks, production build and native policy checks pass. The scoped history test excludes pre-occupancy samples; uncertain source clocks do not become verified gauges or animated measured flow. Separate investor screenshots were refreshed and desktop/mobile images inspected. No SQL migration or physical switching change.
