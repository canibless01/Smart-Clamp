# SmartClamp: A-to-Z Build Spec (Instrument-Grade UX)

**Audience:** the coding agent working on the SmartClamp Next.js app.
**Sources:** Highlights doc, Master PRD (reconciled), Merged Build Guide, and the Blynk/ESP prototype.
**Goal:** every feature below works end to end, feels like operating a real voltage-measuring and control device, and is wired to the ESP hardware the way Blynk wires a dashboard to a NodeMCU.

---

## 0. HOW TO USE THIS DOCUMENT (do this first)

1. **Audit before building.** Read the whole codebase (routes, components, API handlers, DB schema, device ingest, realtime, sounds). Do not assume anything is missing or finished.
2. For every feature in Section 5, record in `docs/BUILD_STATUS.md`:
   `Feature | Status (Built / Partial / Stub / Missing) | Where it lives (files, routes, tables) | How it works today | Gap vs this spec`.
3. Then upgrade or build, in the priority order of Section 8. Where a feature already exists, **keep its data and logic and rebuild its presentation and interaction** to match the spec. Never rewrite working backend logic just to restyle.
4. Finish with an updated `BUILD_STATUS.md` and a list of anything you could not complete and why.
5. **Run the Section 13 design checks automatically** (visual identity per measurement, size hierarchy, icon rules, no emojis) at the start (to record what is wrong) and again at the end (to prove it is fixed). Fix every violation you find, even in files you were not asked to touch. Do this every time this document is provided again.
6. **This document supersedes earlier prompts.** An earlier UI/animation prompt (bento grid, instrument widgets, sounds, moments) was already applied and produced the current build, including an interactive demo workspace (scenario selector, three arc gauges, grid-to-relay-to-space strip, trend charts). Treat that as a first pass and **overwrite and improve it in place**: wherever the current implementation is weaker than this spec (Sections 13 and 14 list observed shortfalls), replace the presentation and interaction with what this spec says. Keep working data, API and backend logic; do not keep a weaker UI just because it exists. Where documents overlap, this one wins.

---

## 1. NON-NEGOTIABLE RULES

**Honesty / safety**
- Never display a device state the device has not reported. A relay is ON/OFF only after a **signed device receipt / observed feedback**. While waiting: `PENDING`. Never timer-confirmed.
- Missing data is **unknown** (grey, "-"), never zero. Gaps are never converted to zero usage.
- SmartClamp is **predictive monitoring, not a certified safety device**. Voltage, overload, shock or fire wording must never claim certified protection. Real RCD / earthing / breakers remain hardware.
- A tamper signal means **"investigate"**, never "theft proven". No liability or theft determinations in the UI.
- A landlord can **never** cut a tenant's power for rent or dues, and never sells, resells, prices or marks up electricity. Cutoff authority is only (a) the account holder via their own schedule/budget/switch, (b) an automatic protection rule the account holder enabled, or (c) the utility through the explicit, revocable opt-in consent flow.
- Features that need a relay **do not render** for accounts without relay hardware (no greyed-out dead buttons). Instead show a single, honest "Add a relay" info tile where useful.
- Keep "Isolated QA / simulated data" labelling wherever the environment is QA.

**Security**
- Every relay-affecting action: step-up confirmation (fresh SMS/push/OTP), rate limiting, rotating-token device command signing (TOTP/HMAC), and a full audit-log entry (who, what, when, result).
- Row-level security on every table. A tenant sees only their own room. Public views never expose payment history, usage history, tamper detail or correlation data.

**Instrument rules**
- A control must be recognisable without reading its label (physical switch, dial, gauge, light).
- Numbers that change **roll** (odometer), gauges **sweep**, lights **pulse**. Text is secondary.
- Sound is opt-in (off until the first user tap unlocks audio), has a master mute, per-alert toggles, volume and quiet hours, and **every sound has a visual + text equivalent**. Respect `prefers-reduced-motion`. Mobile haptics where supported.
- Layout is a **bento grid** with size hierarchy by importance and frequency. Primary daily information fits one screen with no scrolling at 390x844 and 1440x900.
- Palette: keep green for "present/safe/ON", amber for warning/Pro/insight, red for alert/danger, blue pulse for pending, grey for unknown. Dark "instrument" tiles for live device data on a tinted (not flat white) base. **Keep the current minimal green branding. Do not revert to the PRD palette** (the PRD's navy/amber/glass-prism direction was judged too glowing). Refine within the current look: calm, low-saturation base; status colours slightly desaturated so alerts still stand out; **glow and colour intensity are reserved for live state changes** (a relay switching, an alert firing, supply returning), so the interface is quiet until something happens. Define all colours as design tokens (surface, panel, instrument-dark, ok, warn, danger, pending, unknown) so the palette can be tuned in one place.

---

## 2. DEVICE CONNECTIVITY MODEL (Blynk-style, for the ESP devices)

Blynk works like this: the ESP publishes values to named **datastreams (virtual pins)**; the dashboard widgets are bound to those pins; a widget action writes to a pin and the ESP reacts. Mirror that.

### 2.1 Datastream registry (one table, one source of truth)

| Stream | Direction | Type | Widget | Notes |
|---|---|---|---|---|
| `voltage_v` | device -> cloud | float | Voltage gauge | Any voltage sensor. Bands: <180 brownout, >250 surge |
| `current_a` | device -> cloud | float | Current gauge | Any current sensor |
| `power_w` | device -> cloud | float | Power gauge | W = V x A. Overload >2000 W |
| `energy_kwh_cum` | device -> cloud | counter | Odometer | Cumulative, not period total |
| `relay_state_obs` | device -> cloud | enum on/off/unknown | Switch lamp | Observed only, from signed receipt |
| `relay_cmd` | cloud -> device | enum on/off | Switch | Signed, token-protected, expires |
| `current_limit_a` | cloud <-> device | float | Limit dial | Local enforcement on device |
| `voltage_low_v` / `voltage_high_v` | cloud -> device | float | Band editors | Defaults 180 / 250 |
| `protect_mode` | cloud -> device | enum | Protection selector | alert_only / auto_cut / auto_cut_auto_restore |
| `schedule_set` | cloud -> device | json | Schedule grid | Device executes offline, sends receipt per trigger |
| `daily_unit_limit` | cloud -> device | float | Budget meter | Device/cloud enforce, reset at midnight |
| `status_flags` | device -> cloud | bitmask | Status lights | supply, tamper, clamp-removed, relay-bypass, loose-connection |
| `signal_rssi` | device -> cloud | int | Signal bars | Wi-Fi/GSM |
| `heartbeat` | device -> cloud | timestamp | Online light | Offline if none for the configured window |
| `fw_version` / `ota_state` | both | string | Device tile | Signed firmware only |
| `outage_record` | device -> cloud | json | Outage timeline | Saved locally, reported after recovery |

Every reading carries: `device_id`, device timestamp, server receive time, `quality` (valid/suspect/invalid), `clock_confidence` (trusted/unsynced), and a signature or hash-chain link.

### 2.2 Transport and flow
- **Uplink:** ESP -> backend by HTTPS (or MQTT where available) with per-device identity and signing. Batched when offline; device logs locally and catches up. Server dedupes by sequence number.
- **Downlink (commands):** UI action -> step-up auth -> backend creates a **command record** (`pending`, expiry, nonce) -> signed command delivered to device (poll/MQTT/push) -> device executes -> **signed receipt** -> backend sets `relay_state_obs` -> realtime pushes to UI. UI shows `Request sent -> Device acknowledged -> Observed state`. Timeout -> `FAILED/UNCONFIRMED` with reason, never a guessed state.
- **Realtime to the browser:** one shared subscription (Supabase Realtime or SSE) delivering readings, relay observations, alerts and command updates. Pages do not poll individually. If realtime drops, show "reconnecting" and the last-known values with a "last synced" time (Offline Mode).
- **Local autonomy:** protection (brownout/surge/overload cut), schedules and budgets are enforced **on the device**, so they work with no internet. The cloud only configures and records.
- **Topology (reference):** same-pole devices over ESP-NOW to the Pole Gateway; rooms over RS485 to the Building Hub; Gateway/Hub uplink by GSM; IR-Reader reads an existing meter's optical port (read-only, no relay).
- **Simulator:** a dev-only **Simulate panel** drives the same ingest endpoint with signed test packets (supply cut/restore, low voltage, surge, overload, spike, tamper, relay ack/fail, low credit, device offline, clock drift). Every flow in this doc must be demonstrable with it, with sound.

### 2.3 HARDWARE-AGNOSTIC DESIGN (nothing tied to one part)

The demo used an ESP8266/NodeMCU, ZMCT103C and a breadboard relay; the PRD specifies production parts (ESP32, ZMPT101B, SCT-013, latching relay, GSM/RS485/ESP-NOW links). **The software must work with either, and with any future replacement that does the same job.** No page, rule or gauge may reference a specific chip, sensor or module.

- **Capability model, not part numbers.** Software talks to **channels** (`voltage`, `current`, `power`, `energy`, `relay`, `temperature`, `signal`, `tamper_flags`, ...). Each device reports a **capability manifest** at registration and on firmware change, e.g. `{channel: "voltage", unit: "V", range: [0, 300], resolution, sample_interval, has_calibration}`. The UI renders only the channels a device declares; it never assumes a sensor exists.
- **Device profile table** (`device_profiles`): profile id, hardware family, channels, units, valid ranges, default thresholds, supports relay (latching or not), supported transports, command signing method. A new sensor or board = a new profile row, not a code change.
- **Sensor-agnostic thresholds.** Brownout/surge bands, overload limits and current limits come from the profile and the account's settings, not constants in code. The PRD values (180 V, 250 V, 2000 W) are **defaults** in the seeded profile.
- **Calibration layer.** Raw values from any sensor are normalised by per-device calibration (gain/offset, scale factor, burden-resistor ratio) stored server-side and versioned. Readings keep the calibration version they were converted with. Changing sensors means changing calibration, not rewriting gauges.
- **Gauge scaling from the profile.** Gauge min/max, safe bands and units are read from the manifest/profile so a 5 A sensor and a 100 A sensor both render correctly.
- **Transport adapters.** Ingest accepts the same normalised reading payload whether it arrived by Wi-Fi HTTPS, MQTT, GSM gateway, a Building Hub over RS485, ESP-NOW via a Pole Gateway, or an IR-Reader. Each transport is an adapter that maps to the normalised schema. Adding a transport never touches the UI.
- **Relay abstraction.** Commands are `set_relay(on|off)` with a receipt. Whether the hardware is a magnetic latching relay, a standard relay, or a contactor is a profile property (affects state-recovery behaviour only).
- **Command signing abstraction.** Signing (TOTP/HMAC rotating token, per-device keys) sits behind an interface, so the cryptographic scheme can change per hardware generation.
- **Firmware/versioning.** Payloads carry a schema version. The server accepts older schema versions and maps them; new fields are optional.
- **Missing channel handling.** If a device has no voltage sensor, voltage features do not render and say so once ("Voltage sensing not fitted"). If it has one, every voltage feature lights up automatically.
- **Acceptance test:** swap the simulator's device profile from "demo (ESP8266 + ZMCT103C)" to "production (ESP32 + ZMPT101B + SCT-013 + latching relay)" and then to a made-up third profile. All gauges, alerts, protection rules and the relay flow must keep working with no code edits.

---

## 3. THE EVENT ENGINE (one pipeline for every "moment")

All alerts and moments come from one pipeline so behaviour is consistent:

`reading/receipt/flag -> rule evaluation -> event record -> (UI moment + sound + haptic + notification row + SMS/push per preferences)`

Event record: `type, severity (info/notice/warning/critical), device_id, room/building, value, threshold, started_at, cleared_at, acknowledged_by/at, source (device|cloud), delivery_status per channel`.

Each event type defines: icon, colour, sound id, haptic pattern, banner copy, notification copy, SMS copy, repeat/escalation rule, auto-clear rule, and what actions it offers.

**Event types:** `supply_lost`, `supply_restored`, `under_voltage`, `voltage_restored`, `over_voltage`, `overload`, `overload_cleared`, `current_spike`, `loose_connection`, `shock_fire_pattern`, `relay_changed`, `relay_command_failed`, `schedule_triggered`, `budget_limit_reached`, `budget_reset`, `low_balance` (<10%), `disconnection_notice` (balance 0), `payment_confirmed`, `tamper`, `clamp_removed`, `relay_bypass_suspected`, `device_offline` (no heartbeat 24h or configured), `device_online`, `inactivity_nudge`, `dispute_update`, `payment_plan_update`, `report_ready`, `utility_notice`.

**Delivery:** in-app by default, SMS by default per spec, browser push and email as preferences. Provider acceptance does not prove display or reading: show delivery status honestly ("sent", "delivered", "not configured").

---

## 4. ECOSYSTEM SCENARIOS (read these as state machines)

### 4.1 Low voltage (brownout), the full journey
Applies wherever voltage is sensed. Defaults: low <180 V.

1. **Detect.** `voltage_v` drops below the low band for a short debounce window.
2. **UI moment.** Voltage gauge needle enters amber/red band; tile border pulses amber; soft repeating tone; banner "Low voltage: 165 V. Appliances can be damaged." Event `under_voltage` created and sent by in-app (+SMS if enabled).
3. **Branch by hardware/protection mode:**
   - **No relay (Basic / Basic Pro):** monitoring only. Alert + guidance (step 5). No cut button exists.
   - **Relay, protect_mode = alert_only:** alert + guidance + an optional **"Cut power now"** switch action.
   - **Relay, protect_mode = auto_cut:** device cuts power locally. UI shows `Power cut by low-voltage protection` with the cut voltage and time, and the switch moves to OFF **only after the receipt**.
4. **Restore options (after an auto-cut):**
   - **Voltage returns to normal** -> tile settles green, `voltage_restored` event.
   - **Auto-restore** (if enabled by the user): after voltage stays in the safe band for a stable window (default 5 minutes, configurable), device restores; UI shows a countdown "Restoring in 4:12 if voltage stays stable".
   - **Manual [RESTORE POWER]** when voltage is safe: step-up confirm, command, receipt.
5. **"Let power in anyway" (user override, low voltage only).** If the user wants power despite low voltage:
   - Tap the switch -> **risk sheet**: shows live voltage, safe band, a plain warning ("Running appliances at low voltage can damage motors and compressors"), the user's **appliance list** with a recommended state for each, and two paths:
     - **Allow with protection list** (recommended): user confirms they've switched off the listed sensitive appliances (checklist), then confirms override.
     - **Allow anyway:** requires typing/confirming an explicit acknowledgement plus step-up auth.
   - Override is **time-boxed** (e.g. 15 / 30 / 60 min, user-chosen) and **auto-reverts** to protection when it expires or if voltage falls below a lower hard floor.
   - Everything logged to the audit log (who, voltage at the time, appliances acknowledged).
6. **Appliance guidance.** Users can list their appliances (fridge, freezer, AC, pump, TV, fan, laptop, bulbs, etc.). Rules mark each as **sensitive** (compressors, motors, pumps, ACs), **tolerant** or **resistive** (kettle, iron, bulbs). During a voltage event, show an ordered "Switch these off" list (most sensitive first) and a checkbox per item. This is **guidance only**: SmartClamp cannot switch an appliance off unless a linked smart plug exists (Tuya/Matter, roadmap). When a smart plug is linked, offer "Turn off for me". Keep wording non-certifying.
7. **Clear.** When voltage is stable, banner clears, event gets `cleared_at`, notification row updates, a "Power conditions normal" chime plays.

### 4.2 High voltage (surge)
Default high >250 V (configurable via profile and settings).
- Detect -> red moment, urgent repeating alarm until acknowledged, event `over_voltage`.
- Relay + auto_cut: device cuts immediately and locally. UI shows the cut voltage/time after receipt.
- Alert-only mode: red banner "Surge: 268 V. Unplug sensitive appliances now." plus the guidance list.
- **The user keeps full control: they may override and restore power during a surge**, but with a **strict, unmissable warning**, stronger than the low-voltage one: full-screen red sheet, live voltage shown large, plain wording ("Restoring power at this voltage can destroy appliances and can be a fire risk"), the appliance checklist ("unplug these first"), a typed or held-press confirmation (e.g. hold 3 seconds, or type RESTORE), step-up auth, a time-box (auto-revert to protection), and an audit entry recording voltage, warning shown and confirmation given.
- If the voltage is still above the band when the override ends or rises further, the device re-applies protection (if the user enabled it) and notifies.
- Never claim the override or the protection is certified safety.

### 4.3 Overload / current spike
- Overload: sustained >2000 W (configurable). Spike: abnormal short current rise.
- UI: power/current gauge into red band, tile pulses, tone escalates if it persists.
- Relay + auto_cut enabled: device cuts, event `overload`, shows the load at cut. Restore flow like 4.1 but **only after the user acknowledges** and the load is below limit.
- No relay: alert only, guidance "Switch off heavy loads". Event `overload_cleared` when it drops.
- **Current limit dial** (user-set max amps) is stored on the device; hitting it triggers the same flow.

### 4.4 Supply lost / restored
- Device keeps logging locally; outage is recorded on the device and reported after recovery.
- **Lost:** tiles dim, supply light goes dark/red, falling tone, banner with "last seen" time. If the device itself lost power, show "Device offline; supply likely off" **as unconfirmed**, never as a verified outage (see "connection issue isn't always a power cut").
- **Restored:** warm-up animation, green glow ripple, two-tone chime, toast "Power is back. Outage lasted 2h 14m." `supply_restored` event. Under-supply credit calculator (Basic Pro) can attach outage hours to a statement.

### 4.5 Tamper
- Sources: hardware (clamp removed, relay bypass, enclosure), relay-vs-current correlation (relay OFF but current flowing), upstream drift (device vs pole vs transformer mismatch), pattern analysis.
- UI: red takeover with shield/lock animation. Copy: **"This signal asks for investigation. It doesn't prove theft."** Acknowledge, view in Tamper Log, open evidence. Own-device signals go to the account holder; mismatches that implicate a level above go to the chain view and the landlord/utility according to consent rules.
- Sound: distinct, serious, non-panicky; repeats until acknowledged.

### 4.6 Low balance / disconnection
- <10% remaining: amber fuel gauge, gentle reminder, one-tap recharge (`low_balance`).
- Balance 0: red, `disconnection_notice`. Warning lead-time is the safeguard for anyone relying on powered medical equipment (PRD decision): make the pre-cut warnings prominent and escalate through channels. No separate "critical load" flag is built.
- Budget cut (Pro): device cuts at the daily unit limit, restores at midnight, **"Add units now"** overrides immediately.

### 4.7 Device offline / reconnect
- No heartbeat for the configured window -> `device_offline`. All live tiles go grey with "last synced HH:MM". On reconnect, backfill readings, play `device_online`, and show "caught up" once logs are merged. Gaps stay unknown.

---

## 5. FEATURE CATALOGUE (A to Z)

Format: **Purpose / Instrument UI / Interactions / Sound & haptics / Data & links / Tier / Priority.** Priorities: **P0** daily-core, **P1** soon, **P2** later.

### A. Dashboard (home), P0
- **Purpose:** the daily cockpit. Everything a user needs in one screen.
- **UI (bento):** XL relay switch (Pro) or large power gauge (no relay); L power gauge; M voltage and current gauges; M balance fuel gauge with Recharge; S status-light cluster (supply, device, relay, tamper, signal, last synced); wide alerts strip; wide usage graph with 1h/6h/1d/7d/30d chips; small quick-actions (Pay, Schedule, Budget, Restore Power only when cut).
- **Role variants:** tenant/room-owner (own room), homeowner (adds verification status "Verified / Mismatch", report download, dispute tools; Pro adds control), landlord (building summary).
- **Interactions:** tap any gauge -> its detail page; long-press switch -> advanced options; pull to refresh; realtime updates with no manual refresh.
- **Offline Mode:** greyed values + banner "Last synced 14:22", never blank.
- **Links:** alerts strip -> Alerts; balance -> Wallet; graph -> Usage History; verification chip -> Verification Report.

### B. Live Usage (power) , P0
- Arc gauge in W with safe/warn/danger bands (danger at overload threshold), rolling kWh odometer, "Hours of light used" counter, smooth live sparkline.
- Detail page: live waveform-style trace, today/this month kWh, peak so far, "now vs typical for this hour".
- Unknown/stale readings greyed with observation time.

### C. Voltage Status, P0 (where a voltage sensor is fitted)
- Arc gauge 100-300 V with the safe band highlighted (default 180-250), needle, numeric readout.
- Detail page: 24h voltage trace with the band shaded, event markers (brownouts/surges), min/max, "time in safe band", protection mode selector, band editors (within allowed limits).
- Protection settings: `alert_only | auto_cut | auto_cut + auto_restore`. Relay-less devices show only alert settings.
- Flow: Section 4.1/4.2.
- If no voltage sensor: tile shows "Voltage sensing not fitted" once, not an empty gauge.

### D. Current & Overload, P0
- Arc gauge in A with a movable **limit marker**; load bar relative to limit; overload countdown if sustained.
- Detail: current trace, spikes list, loose-connection indicator, shock/fire-pattern alerts (monitoring only, labelled "predictive, not certified").
- Settings: current limit, overload threshold, auto-cut toggle (relay only).

### E. Relay Control (Remote ON/OFF) , P0 (Pro / relay hardware)
- **UI:** big physical-style toggle: states `OFF, ON, PENDING (travelling pulse), FAILED (shake + reason), UNAVAILABLE (explained)`.
- **Flow:** tap -> confirm sheet (shows what will happen, current voltage/balance) -> step-up auth -> "Request sent" -> "Device acknowledged" -> "Observed ON/OFF".
- **Safety interlocks:** restore during an active surge or brownout is **allowed but gated** by the strict warning sheets (4.1.5, 4.2); restore after budget cut offers "Add units".
- **Sound:** click on press, click on release, confirmed chime only on the observed state change; fail tone on timeout.
- **Also shows:** last 5 relay events (who/what/when/source: manual, schedule, budget, protection, utility if consented).
- **Landlord:** sees room relay state but acts only through Bulk Control rules (see Q) and never for rent.

### F. Schedules, P1 (Pro)
- **UI:** a 7-day x 24h tap/drag grid (Blynk-timer style) with ON/OFF blocks, templates (weekday/weekend, night off), per-day variations, preview of "hours of light saved".
- **Behaviour:** schedule syncs to the device which **executes offline**; each trigger sends a receipt; UI logs "Scheduled OFF at 23:00: confirmed 23:00:02".
- **Conflicts:** manual override rules (next-boundary revert vs stay), shown clearly; schedule never overrides an active protection cut.
- **Sound:** soft click when a schedule fires (if in app), distinct from manual.
- **Status:** if device execution isn't implemented yet, mark unavailable honestly and keep the page as a designed shell.

### G. Self-Set Budget, P1 (Pro)
- **UI:** monthly budget dial -> computed daily unit limit; a "tank" showing today's remaining units; midnight reset animation.
- **Behaviour:** device cuts when the day's limit is hit, restores at midnight, **Add units now** restores immediately; step-up auth on edits.
- **Alerts:** 80% / 100% of the day's limit; "Hours of light saved" summary.

### H. Wallet, Recharge, Billing (P0 for recharge/history; P1 for the rest)
- **Wallet UI:** fuel-gauge balance (naira and kWh), reserved amount, quick top-up chips (e.g. 500/1000/2000/custom), "estimated days left at current pace".
- **Recharge flow:** amount -> itemized quote (tariff, fees, total) -> secure checkout (bank transfer, card, Paystack, OPay, USSD where available) -> pending -> **verified** -> gauge fill animation + chime + receipt. Failure paths explained (pending, failed, reversed).
- **Tenants buy directly from the platform at the platform price. No landlord markup, ever.**
- **Payment history:** rows with status lights, receipt download.
- **Monthly bill:** breakdown, projected month-end total (Bill Forecasting, Basic Pro; needs enough measured history and a current tariff), generator cost share lines when enabled.
- **Auto-recharge (P2):** consent, provider mandate, caps, reconciliation; clearly states what it will charge and when.
- **Payment reminders:** in-app/SMS, landlord can send one (administrative only).
- **Export:** PDF/Excel.
- **Generator cost-share (P2):** building-level fuel contribution split by an approved allocation policy; visible to every participant.

### I. Usage History & Insights, P0 (history) / P1 (insights)
- **History:** interactive chart (day/week/month), zoom/brush, compare periods, **exact readings table collapsed** under the chart, "gaps stay unknown" markers, up to 50-record views extended with pagination. Cumulative counters are labelled as counters, not period totals.
- **Pattern Study:** peak hours heat-strip (24x7 heat grid), habits summary, savings suggestions as cards.
- **Hours of light used / saved:** two counters (saved only for relay accounts).
- **Data Accuracy %:** a ring showing how closely this device matches the upstream reading it is cross-checked with; explains what it is not (not electrical accuracy certification).
- **Appliance load signatures (Basic Pro, P2):** see "Appliance Fingerprints" below. Needs a validated model; no appliance guesses presented as fact.
- **Power factor (Basic Pro, P2):** secondary gauge beside usage; requires qualified simultaneous voltage/current data; otherwise "not available on this device".
- **Under-supply credit estimate (Basic Pro, P2):** "outage hours x tariff" statement; always labelled an **estimate, not a utility-approved refund**; attaches to disputes.
- **Same-pole peer comparison (Basic Pro, P2):** see Section 6.

### J. Alerts & Notifications, P0
- **Alerts feed:** timeline with event icons/colours (same as the live moments), filter chips (all, power, voltage, billing, tamper, device), acknowledge / snooze, "view related graph window" deep link.
- **Preferences page:** per event type x channel (in-app, SMS, push, email), quiet hours, sound per event, volume, master mute, test buttons ("play this alert").
- **Delivery honesty:** show per-channel delivery status.
- **Unread badge** on the bell; critical alerts persist as banners until acknowledged.
- **Inactivity nudge / device offline notice** included.

### K. Tamper Log & Verification Chain, P1
- **Tamper log:** full history, not just live; each entry shows type, time, device, chain level, evidence link, status (open/acknowledged/investigated).
- **Trust chain view:** Transformer -> Pole -> House/Room as three linked nodes; matched = green link, mismatch = red break at the exact level, with the numbers on both sides.
- **Hash-chained reading trail (backend implemented per Plans page):** surface as a "chain intact" badge; explain it is integrity, not legal certification.
- **Device/SIM theft tracking:** location fingerprint anomalies shown to the owner and ops only.

### L. Verification Report & Public Microsite, P0/P1
- **Create:** choose completed period (<=31 days, Lagos time, end exclusive), issue **signed snapshot**, download CSV, copy a **revocable seven-day link**, revoke.
- **Public page (no login):** read-only snapshot, signature verified badge, observation table, honest disclaimers (signature verifies issued bytes; not accuracy, theft, liability or approved refund).
- **UI upgrade:** step flow (Period -> Issue -> Share), seal animation when verified, QR code for the link, expiry countdown.
- **Scheduled auto-delivery (P2):** monthly reports by SMS/email/in-app.

### M. Dispute Center, P1
- **Flow:** "Dispute this bill" -> select period/amount -> note -> counterparty (landlord, or support for single-home) receives -> responds (explain / corrected figure / escalate) -> usage log and verification report auto-attached -> resolution logged.
- **Visual usage-log timeline** for the disputed window; bill breakdown beside it.
- **Evidence downloads** (logs, report, under-supply statement).
- **Meeting Mode:** one tap opens a **stripped-down, full-screen shared view** with only the disputed period's usage graph and bill breakdown, large type, no navigation, exit via a deliberate control. Built for two people on one screen.
- **Payment plan:** propose / counter / accept, schedule of instalments, tracked until fulfilled or missed, every state logged.
- **No power consequence** is attached to a dispute outcome.

### N. Community & Accountability, P2
- **Public dashboard:** same data visible to everyone (aggregated and privacy-safe), pole/transformer verified status map, public tamper alerts.
- **Report suspicious activity:** form with location, photo optional, goes to ops/utility queue with abuse protection.

### O. Public Device View, QR, no-smartphone access, P1
- **Device ID or QR scan, no login:** one screen: current usage, current bill, device ON/OFF status, pay button. Nothing else (no history, no payment history, no tamper detail).
- **Printed QR / Device ID** page for installers; **USSD / SMS**: Buy Units and Check Balance branches (Basic Pro, requires a provider shortcode; do not advertise a shortcode until allocated).
- Meter validation (homepage): validates a meter number only; says plainly it is not a live balance lookup.

### P. Account & Access, P0/P1
- **Profile & language:** multi-language switcher.
- **Multi-user access** and **read-only viewers** (add/remove by phone/email), **Guest access** (temporary, scoped, expires, revocable), each with an access log.
- **Offline Mode** (see A), **Dark mode** as an additional cosmetic choice.
- **Energy-saving tips:** personalised cards tied to the user's actual patterns.
- **Data export** and account/data requests.
- **Settings home:** notifications, sounds, devices, linked meter, viewers, language, security (step-up, sessions), plan.

### Q. Landlord / Building Admin, P0/P1
- **Building dashboard:** summary strip (rooms, collected, owed, tamper flags as red badge), room grid cards with status colour + mini gauges, sorted by attention needed.
- **Whole-building check:** building total vs sum of rooms, mismatch visible instantly.
- **Room management:** add/remove room, invite tenant (link), assign, **Transfer Device** to a new tenant (not a fresh install), tenant list.
- **Bulk Control:** select rooms -> action -> step-up -> per-room receipt list. **Only administrative uses** (e.g. building-wide maintenance schedule); never rent enforcement.
- **Collections:** recharge on a tenant's behalf, send payment reminders (pass-through only, never markup).
- **Revenue dashboard**, **usage reports** per room/date range, export.
- **Building-wide alerts**, configurable thresholds, multi-property switcher.
- **Audit log:** every action, timestamped, filterable, exportable.
- **Pooled wallet** (no-meter buildings): contributions vs needed before paying the utility, shown prominently.
- Buildings must start from an existing central meter in the initial setup; others via contacting the team.

### R. Onboarding, Pairing & Linking, P0/P1
- **First-run "power on" sequence:** after the first device link, gauges sweep from 0, the status lights come on one by one (device, supply, relay), the first reading rolls in, a soft chime plays. Then a checklist tile: link device, first top-up, set alerts, (Pro) test the relay.
- **Link your SmartClamp:** claim code/Device ID -> verify -> choose room/home -> done. Account linking alone does **not** commission a device; say so.
- **Installer flow (Installer app/portal):** BLE connect to the unconfigured device, write network credentials and Device ID, run diagnostics (signal, sensors, relay test, clock), confirm safe-install checklist (qualified electrician for energised wires). Upgrade to Pro = relay retrofit, same login, features appear.
- **Tenant invite:** invite link -> accept -> scoped to their room only.
- **IR-Reader / smart-meter linking (Phase 2):** order/setup flow, claim code, supported-meter check, connectivity check; only fields actually read are displayed; manual readings are labelled "manual".
- **Linked smart devices (roadmap):** Tuya/Matter plugs and bulbs for per-appliance visibility and the "Turn off for me" action in 4.1.6.

### S. Utility / Staff, P1/P2
- **Service messages (staff):** pick devices (max 50), title, message, preview audience (in-app / push / SMS counts), commit. Provider acceptance never implies it was read. Notice appears on the user's alert feed as `utility_notice`.
- **Utility control consent (opt-in, revocable):** nothing utility-controlled exists until the named organisation, permitted capabilities and disclosures are configured and the customer consents. UI explains each, shows what is and isn't enabled, and logs consent changes.
- **NEPA/utility dashboard (Phase 3):** community overview, correlation and tamper flags (aggregates unless consent), bills and broadcasts, disconnection list as a **report, never an action**.

### T. Internal Ops & Fleet (company-only), P1
- Fleet health (online/offline, last heartbeat, firmware), device and installation requests, commands queue and failures, alert deliverability, compliance tracker, field ops, feature-flag rollout, internal access audit.
- Same instrument language: fleet map with status lights, heartbeat strips.

### U. Public Website & Marketing, P1
- Hero with a **live-ticking meter demo** (simulated, labelled), animated "how it works" showing the clamp, trust chain and relay, plan comparison with Available / Planned / Hardware-required chips, device pages (Optical Meter Reader, clamps), support and connection help with the "browser vs device vs electricity" three-state explainer, FAQs, terms, privacy.
- Stat counters, scroll-triggered motion, restrained per the PRD ("every effect must feel purposeful").

### V. Feature flags & plans (cross-cutting), P0
- Every gated feature checks a server-side flag and the hardware capability. Free < Basic < Basic Pro < Pro. Hardware cannot be unlocked by subscription. Pages render only what the account can really do, and "Planned" features are never sold as available.

---

## 6. EXAMPLE OF THE EXPECTED DEPTH: PEER COMPARISON (apply the same thinking to every insight feature)

**Not** a "name + comparison" card. It is an instrument page:

- **Entry tile (on Usage History):** a small "You vs your pole" dial showing your percentile, with a one-line verdict.
- **Detail page layout (bento):**
  1. **Percentile gauge** (XL): where this home sits among anonymised homes on the same pole.
  2. **Distribution strip:** a horizontal histogram of the pole's anonymous daily usage with a marker for you and a shaded "typical range".
  3. **Time-of-day comparison:** your 24h load curve overlaid on the pole's median curve; hover shows the gap by hour.
  4. **Bars by period:** you vs median for today / this week / this month with delta chips (+12%, -8%).
  5. **"What explains the gap" cards:** peak hours, standby baseline, evening load, **only** statements backed by measured data.
  6. **Savings cards:** concrete suggestions with an estimated kWh and naira effect, labelled as estimates.
- **Interactions:** scrub the time axis; toggle "kWh / naira / % of pole median"; period chips; tap a card to highlight the matching part of the curve. Number roll and gauge sweep on load; a soft "tick" as the marker settles.
- **Privacy rules:** show only if the pole has enough comparable homes (privacy threshold) and comparable data quality; otherwise show "Not enough comparable homes yet". Never reveal any individual home.
- **Data:** aggregated server-side; no raw neighbour data to the browser.

Apply this pattern to: Appliance Fingerprints (animated stacked breakdown with confidence, with "estimate" label), Power Factor (needle gauge + trend + explanation), Bill Forecast (pace dial + projected band), Pattern Study (heat grid), Accuracy Score (ring), Under-supply credit (outage timeline strip + statement preview), Tamper chain (node chain), Budget (tank), Schedules (timeline grid).

---

## 7. HOW PAGES CONNECT (navigation and data flow)

- **Global nav (tenant/homeowner):** Home | History | Wallet | Alerts | Control (relay accounts) | Community | Disputes | Settings. **Mobile bottom bar:** Home, History, Wallet, Alerts, More.
- **Dashboard hub:** every tile deep-links to its detail page, and every detail page has a "back to cockpit" and a compact live strip (status lights + balance) so context is never lost.
- **Event-driven links:** an event opens its relevant page with the time window preselected:
  - `under_voltage/over_voltage` -> Voltage detail (event marker focused) + risk sheet/guidance.
  - `overload` -> Current detail.
  - `low_balance` -> Wallet with recharge amount prefilled to cover N days.
  - `tamper` -> Tamper Log entry + Verification Report generator.
  - `supply_lost/restored` -> Outage timeline + under-supply credit estimate (Basic Pro) -> Dispute evidence.
  - `relay_changed` -> Control history.
- **Evidence loop:** usage graph window -> "Dispute this period" -> Dispute Center (logs + report auto-attached) -> Meeting Mode.
- **Landlord <-> tenant boundary:** landlord sees room status, collections and building audit; the tenant sees their own room only; both share the same dispute evidence.
- **Public <-> private:** the public device view and report microsite read from the same data layer but through restricted views.
- **Plans <-> UI:** a flag/hardware check decides which tiles render; a single "Add a relay" or "Upgrade" tile replaces absent controls.

---

## 8. BUILD ORDER (ONE COMPLETE DELIVERY, NOT PHASES)

**The target is the whole site, A to Z, complete.** The PRD's phase labels do not gate anything. The P0/P1/P2 tags below only set the **order of work and what must be most polished**, not what is skipped. Every feature in Section 5 gets built, with its pages, states and interactions.

**Boundary rule for things that depend on outside parties** (payment-provider mandates for auto-recharge, an SMS/USSD shortcode, utility partnership and consent, STS or other certification, third-party smart-plug platforms): build everything on our side to completion (UI, data model, flows, adapters, simulator), connect through a pluggable adapter, and show an honest status ("Connected" / "Awaiting provider") until the outside piece exists. Never fake a live result.

**P0, the cockpit and the core loop (build and polish first):**
1. Datastream registry, shared realtime subscription, event engine, Simulate panel.
2. Dashboard bento with live gauges (power, voltage, current), status lights, balance gauge, alerts strip.
3. Voltage and current ingestion if missing from the data model (many screens currently show only watts and cumulative kWh).
4. Relay switch with the full command lifecycle (pending/observed/failed), interlocks and audit log.
5. Alerts feed + preferences + sound/haptic system + banner moments.
6. Wallet/recharge flow polish, payment history, low-balance flow.
7. Usage history chart-first with exact readings collapsed.
8. Verification report step flow + public microsite polish.
9. Form/checkbox alignment component (FormCheckRow) applied everywhere, mobile table cards.

**P1 (immediately after P0, same delivery):** Schedules, Budget, Protection settings (modes, bands, risk sheet, appliance guidance), Tamper log + trust chain, Dispute Center + Meeting Mode + payment plans, Landlord dashboard/rooms/bulk/audit/revenue, Public device view + QR, Account access (viewers/guests/multi-user), Onboarding sequence, Staff service messages and consent, Ops fleet, public site motion.

**P2 (same delivery, last in order):** Basic Pro analytics (appliance fingerprints, power factor, credit estimate, forecasting, peer comparison, scheduled reports), USSD/SMS queries, auto-recharge, generator cost share, community dashboard, smart-home links, meter integration, multi-property/white-label, water/gas.

Once a feature is truly built and working end to end, remove its "Planned" label on the Plans page. Until then it stays honestly labelled.

---

## 9. QUALITY BAR AND TESTS

- **Per feature:** works end-to-end against the Simulate panel, has loading/empty/error/offline/unknown states, has keyboard and screen-reader support, has reduced-motion and mute behaviour, and is logged in `BUILD_STATUS.md`.
- **Scenario tests (each with sound on and off):** low voltage with no relay / alert-only / auto-cut / auto-restore / override; surge (no override); overload with and without relay; supply lost then restored; tamper from each source; low balance to zero; budget cut and midnight restore; schedule fires offline then reports; relay command timeout; device offline then backfill; recharge success/failure/reversal; report issue, share, revoke; dispute to Meeting Mode.
- **Layout:** 390x844, 768, 1440x900; no vertical scroll for the primary dashboard; no checkbox above its label; long IDs truncated with copy.
- **Security checks:** RLS per role, step-up on every relay action, command expiry and replay protection, rate limits, audit entries present.

---

## 10. DECISIONS FOR THE OWNER (flagged, not assumed)

1. Low-voltage override: allowed with risk sheet, time-box and auto-revert (as specified above). Confirm the hard voltage floor below which it is never allowed.
2. High-voltage override: allowed with the strict warning in 4.2 (owner decision: users keep control). Confirm the confirmation method (hold-to-confirm vs typed word).
3. Brand colour: settled. Keep the current minimal green identity; only refine tokens and status colours as described in Section 1.
4. Which devices report voltage and current today; add channels where missing.
5. USSD/SMS shortcode and SMS provider status.
6. Whether appliance "Turn off for me" waits for smart-plug integration (recommended).


---

## 11. THE ECOSYSTEM, WALKED END TO END (user journeys and loops)

Read these as one connected system. Four ledgers run underneath everything and every journey touches them:

- **Energy ledger:** signed, hash-chained readings per device (transformer / pole / building / room), with quality and clock confidence.
- **Money ledger:** wallet credits and debits, payments, reserved amounts, fees, pooled contributions, instalment plans.
- **Event ledger:** every alert and moment, with acknowledgement and delivery status.
- **Audit ledger:** every command, setting change, consent, access grant and dispute step, with who/when/result.

A **reconciliation job** continuously compares levels (room vs building vs pole vs transformer; money bought vs energy measured) and writes **flags**, never accusations.

### J1. New homeowner: sign-up to first "power on"
1. Public site -> Get started -> role-aware sign-up (homeowner / landlord / tenant by invite).
2. Optional on the homepage: meter-number check (validation only; says it is not a live balance).
3. Installer pairs the device over BLE (credentials, Device ID, diagnostics, safety checklist). Account links with the claim code.
4. First-run **power-on sequence**: lights come on one by one, gauges sweep, first reading rolls in, chime.
5. Checklist tile: top up, set alerts, set protection mode, (relay) test the switch, add appliances, add a viewer.
6. Dashboard becomes the daily cockpit.

### J2. Daily loop (the 20-second visit)
Open app -> cockpit: supply/device lights, power, voltage, current, balance, alerts strip -> maybe flip the switch or recharge -> leave. Anything abnormal is already visible as a moment (banner/sound) before they look.

### J3. Recharge loop (single home or tenant)
Wallet -> amount chips -> itemized quote (tariff, fees, total) -> checkout -> **pending** state shown honestly -> provider webhook -> **verified** -> money ledger credits -> balance gauge fills + chime -> receipt (download/share) -> "days left at current pace" updates. Failure branches: abandoned, failed, reversed, duplicate webhook (idempotent). If balance was 0 and a budget/balance cut applies, the restore offer appears right after verified credit.

### J4. Low-voltage loop
Detect -> amber moment + alert (in-app/SMS) -> (relay + auto_cut) device cuts, switch moves after receipt -> user sees the cause and voltage -> options: wait for stable voltage (auto-restore countdown), tap **Restore** (risk sheet + appliance checklist + time-box + step-up) or **Allow anyway** -> override auto-reverts at the end or at a lower floor -> clear event + chime. Users keep full control; the warning is strict, never a block.

### J5. Surge loop
As 4.2: red moment, immediate local cut where enabled, strict override sheet if the user insists, audit trail, unplug guidance.

### J6. Outage loop
Supply lost -> dim state, "last seen" -> device logs locally -> supply restored: chime, "outage lasted X" -> outage record uploaded -> (Basic Pro) under-supply credit **estimate** built from outage hours -> can attach to a dispute or report. A device that simply stopped reporting is shown as **unconfirmed**, not as a verified outage.

### J7. Schedule and budget loop (relay accounts)
Set schedule/budget (step-up) -> synced to device -> device enforces offline -> each trigger returns a receipt shown in the timeline -> budget hit: cut, "Add units now" or midnight restore -> weekly "hours of light saved" summary.

### J8. Shared housing setup (landlord)
Create building (existing central meter) -> add rooms -> assign a device to each room -> invite each tenant by link -> tenant accepts (scoped to own room) -> room appears on the landlord grid with its status light. Move-out: **Transfer Device** reassigns the existing room device to the next tenant (history kept, balance handled by policy, not treated as a new install).

### J9. Shared housing money loop (with a central meter)
1. Each tenant tops up **directly on the platform at the platform price** (landlord never sells or marks up).
2. Tenant wallet is debited by **their room device's measured usage**.
3. The building's central meter is the real supply. Platform-side, the building needs enough supply credit to cover everyone.
4. A **Building Ledger** tracks: central meter supply remaining, sum of all tenant balances (what tenants are owed in units), sum of room-measured usage, and **unaccounted energy** (central minus the sum of rooms).
5. Landlord dashboard shows these as one tile cluster: supply tank vs tenants' balance total, plus the unaccounted-energy gauge.
6. Landlord can send payment reminders and top up on a tenant's behalf (pass-through only).

### J10. Group / pooled payment (no-meter building or shared bill)
- Building has a **Pooled Wallet**: target amount needed before the utility payment is due, a thermometer showing contributed vs needed, and per-room contribution rows (visible to participants).
- Each tenant contributes from their own app; the contribution is a ledger entry; reminders go out as the deadline nears.
- Landlord pays the utility from the pool (pass-through, logged with receipt). Shortfall state is visible to all ("needs N more"), with no automatic penalty on any tenant.
- Settlement cadence (running balance vs per-bill reconciliation) is an **open product decision**: build both ledger views and make the mode configurable per building.
- **Generator cost share:** same pattern, a pooled fuel contribution split by an approved allocation rule shown to every participant.

### J11. THE BYPASS SCENARIO (one tenant bypasses their room device)
Setup: Room 3 bypasses the clamp and runs load that the room device never sees. Everyone else is honest. The central meter reads the real total.

**What the system sees**
1. Room devices report their measured usage. The central meter (via building device/IR-Reader/utility reading) reports a higher total. **Unaccounted energy** rises: central total minus sum of rooms, beyond the normal loss tolerance.
2. Tenants' wallets are debited only by what their own devices measured, so **every tenant, including Room 3, still shows a healthy balance** while the building's supply tank drains faster than the sum of balances can explain. This is the "everyone thinks they have their units" situation.

**What the system does (in order)**
1. **Reconciliation flag:** gap above tolerance for N windows -> event `building_mismatch` with the numbers on both sides and the time pattern. This is a **chain break at the building level**, not an accusation of any room.
2. **Visible early to everyone, neutrally:** tenants see a calm banner "The building is using more power than rooms are measuring. Supply may run out earlier than balances suggest." (No names.) Landlord sees the full gap view.
3. **Supply-shortfall alert:** when building supply remaining falls below the sum of tenant balances, alert the landlord and, in neutral wording, tenants, so nobody is surprised by a building-wide cut.
4. **Narrowing without accusing** (evidence, not verdict):
   - Hardware signals per room: clamp removed, relay bypass suspected, enclosure, current flowing while relay is OFF (relay-vs-current correlation).
   - Pattern analysis: a room whose measured usage is implausibly low versus comparable rooms and its own history while the gap grows in step.
   - Time-correlation of the gap with each room's activity.
   - Result: a **ranked list of rooms to inspect** with the reasons, shown to the landlord only, labelled "reasons to inspect, not proof".
5. **Inspection step:** landlord requests an installer/qualified inspection (a work order in the installer portal). Findings are logged. A scheduled **diagnostic** that briefly changes any room's state is only allowed with advance notice to affected tenants and their consent, never as punishment.
6. **Outcome handling:** confirmed bypass -> the Verification Report and tamper log for the period become the evidence; the case moves to the **Dispute Center** (administrative resolution, payment plan for the shortfall if agreed). **No power cut over rent or as punishment** is available to the landlord. Honest tenants can export a report proving their own room's usage and that their device chain was intact.
7. **Who covers the shortfall** is a policy decision (landlord absorbs, platform float, or an agreed shared split). Build the ledger line `unaccounted_energy` and make the allocation rule explicit and opt-in per building; **never auto-charge any tenant** for a gap without the building's recorded agreement.

**UI for it:** Building Integrity page: a chain of nodes (Transformer/Pole -> Building meter -> Rooms) with green links and a red break at the building->rooms link; gap gauge and 7-day gap trace; supply tank vs tenant-balance total bars; ranked inspection list; button "Create inspection request"; button "Open dispute / evidence pack".

### J12. Verification report -> sharing
Choose period -> issue signed snapshot -> CSV/PDF -> copy link/QR (7 days, revocable) -> a bank, new tenant or utility opens the public page (no login) -> sees the signed read-only snapshot with honest disclaimers -> owner can revoke any time. Scheduled monthly delivery (when enabled) uses the same pipeline.

### J13. Dispute loop
Spot a wrong bill -> "Dispute this period" from the graph -> logs and report auto-attached -> counterparty responds (explain / correct / escalate) -> **Meeting Mode** for an in-person settlement -> payment plan (propose / counter / accept) -> tracked until fulfilled or missed -> all steps in the audit ledger. No power consequence is attached to any outcome.

### J14. Guest / viewer / family
Owner adds a viewer (phone/email) -> read-only live view -> or a time-limited guest for a helper -> revoke any time -> access log shows what they opened.

### J15. No-smartphone user
Printed Device ID or QR -> public view: usage, bill, ON/OFF, pay button only -> (when a shortcode exists) USSD: Check Balance / Buy Units.

### J16. Device offline -> reconnect
No heartbeat -> greyed tiles with "last synced" -> `device_offline` event -> on reconnect: backfill readings, `device_online` chime, "caught up". Gaps stay unknown.

### J17. Staff/utility notice
Staff selects devices -> previews audience (in-app/push/SMS counts) -> commits -> users get `utility_notice` in their feed. Utility control stays disabled until named organisation, capabilities, disclosures and the customer's own consent exist.

---

## 12. NAVIGATION: WHAT SHOULD BE THERE

The current build has a left sidebar on web (Overview, Usage history, Wallet & bills, Notifications, Control, Community for tenants; Your buildings, Usage history, Wallet & bills, Notifications, Community for landlords; Settings and Help at the bottom) and only a thin top bar on mobile in the captures. Replace with the structure below. Items that the account cannot use do not render.

### 12.1 Persistent top bar (all roles, web and mobile)
Device/room selector, **status-light cluster** (supply, device, relay), signal, **sound toggle**, alerts bell with unread count, avatar menu. On web add a **mini relay switch** (relay accounts) so the most-used control is always reachable.

### 12.2 Mobile bottom bar (tenant / homeowner)
`Home | Usage | [Power] | Wallet | Alerts`
- **Power** is a raised centre button showing the relay lamp (relay accounts: opens Control with the switch; no-relay accounts: becomes **Live**, opening voltage/current/power detail).
- **More** (via avatar menu or a sheet): Community, Disputes, Reports, Trust chain, Schedules/Budget shortcuts, Settings, Help.
- Alerts tab carries the unread badge; critical events also show as persistent banners on every tab.

### 12.3 Web sidebar (tenant / homeowner), grouped
- **Monitor:** Home, Live (power, voltage, current), Usage and insights.
- **Money:** Wallet and bills (recharge, history, forecast, auto-recharge, generator share).
- **Control** (relay accounts only): Switch, Schedules, Budget, Protection.
- **Trust:** Trust chain and tamper log, Reports, Disputes (with Meeting Mode).
- **Community:** public dashboard, report suspicious activity.
- **Footer:** Alerts, Settings, Help.

### 12.4 Landlord mobile bottom bar
`Building | Rooms | Money | Alerts | More` (More: Integrity, Reports, Audit log, Disputes, Settings).

### 12.5 Landlord web sidebar
- **Overview:** Buildings (switcher), Building dashboard.
- **Rooms:** Room grid, Tenants and invites, Transfer device.
- **Money:** Collections, Reminders, Pooled wallet, Generator share, Revenue.
- **Integrity:** Building integrity (reconciliation, unaccounted energy, inspection requests), Tamper flags.
- **Actions:** Bulk control (administrative only).
- **Records:** Reports, Audit log, Disputes.
- **Footer:** Alerts, Settings, Help.

### 12.6 Staff and ops
- **Staff:** Community overview, Notifications, Service messages, Consent status.
- **Ops (internal):** Fleet map, Heartbeats and firmware, Command queue, Deliverability, Installation requests, Compliance, Field ops, Feature flags, Access audit.

### 12.7 Page priority (order of polish)
1. Cockpit/dashboard, Live (voltage/current/power), Control switch, Alerts, Wallet/recharge, Usage history.
2. Reports + public report, Protection settings (risk sheets), Tamper/trust chain, Building dashboard, Building integrity, Rooms/invites/transfer.
3. Schedules, Budget, Disputes + Meeting Mode + payment plans, Pooled wallet, Public device view/QR, Account access, Onboarding/pairing, Staff messages, Ops.
4. Insights (peer comparison, appliance fingerprints, power factor, forecast, credit estimate), Community, USSD, auto-recharge, generator share, smart-home links, multi-property.

### 12.8 Mobile vs web density
- Mobile: bento collapses to a 4-column grid; the switch and power gauge stay above the fold; secondary tiles in a horizontally swipeable row; no horizontal page scroll; tables become cards.
- Web: 12-column bento with sidebar; wide tiles for charts; side drawers for detail instead of full page jumps where it keeps context.


---

## 13. VISUAL IDENTITY, SIZE HIERARCHY AND ICON RULES (auto-verify and auto-correct)

**On every read of this document, the agent audits the whole UI against this section, lists violations in `docs/DESIGN_AUDIT.md`, fixes them all, and re-runs the checks until clean.**

### 13.1 Every measurement has its own identity
Today the gauges look alike (same dial, white, only the label differs). Fix: each measurement gets its **own colour, its own instrument shape, and its own icon**, so a user recognises Voltage vs Current vs Power vs Balance **before reading the label**.

**Channel colours** (identity colours; keep them calm and harmonious with the minimal green brand, tune via tokens, never hard-code):

| Channel | Identity colour (starting point) | Instrument shape | Icon |
|---|---|---|---|
| Power (W) | Brand green | Large sweeping arc dial with needle | bolt |
| Voltage (V) | Electric blue | **Centre-zero meter**: wide safe band in the middle, low zone left, high zone right, marker slides | waveform/sine |
| Current (A) | Violet | **Vertical LED ladder / level bar** with a movable limit marker | gauge/ammeter |
| Energy (kWh) | Lime-green | **Odometer drums** that roll | meter |
| Balance (money/units) | Warm gold/copper | **Tank / fuel level** with a "days left" tick | wallet |
| Budget (today) | Soft teal | **Battery/tank** that drains, midnight refill | piggy/limit |
| Relay | Neutral dark with white/green lamp | **Physical toggle** (rocker/slide) | power switch |
| Signal / device | Slate | Signal bars + heartbeat line | wifi/antenna |
| Trust chain | Deep green/ink | Linked **nodes** | link/shield |
| Temperature (if reported) | Coral | Thermometer | thermometer |

**Identity vs status (do not mix them up).**
- The **identity colour** is the instrument's accent: needle, trace line, fill, icon tint, chart series.
- **Status** (ok / warning / danger / pending / unknown) is shown separately: coloured **bands on the scale**, the **border/ring/lamp**, and the banner. A voltage gauge stays blue; when voltage is bad its band and border go amber/red and it pulses.
- Charts that show several channels use the same identity colours in the legend, lines and tooltips everywhere on the site.

**Accessibility:** colour is never the only signal. Shape differs per instrument, each has an icon and text unit, status adds an icon and wording, patterns/hatching on danger bands, contrast meets WCAG AA, and colour-blind-safe check on the identity set.

**Dark instrument tiles:** live device tiles use a dark panel with the identity colour as glow-free accent; light tiles are used for settings, history and text-heavy content. Glow only on state change.

### 13.2 Real size hierarchy (bento is not uniform)
- Define sizes: **S** (1x1), **M** (2x1 or 1x2), **L** (2x2), **XL** (3x2 or 2x3), **Wide** (full width, short). Tile area ratio: the primary tile on any page must be **at least 3x the area of the smallest tile** on that screen.
- **Importance decides size** (examples):
  - Relay account dashboard: Relay switch = XL; Power dial = L; Voltage and Current = M each (different shapes); Balance tank = M; status lights = S cluster; alerts = Wide; usage chart = Wide-L.
  - No-relay account: Power dial = XL; Voltage = L; Current = M; Balance = M.
  - Landlord: Building integrity/total-load = XL; room grid tiles = M/S by attention (rooms needing attention grow); money = L.
- **Rules:** never more than two adjacent tiles of identical size in a row on a primary screen; at least three distinct tile sizes per dashboard; tiles with an active alert **grow and move to the top** (attention promotion); empty/unavailable tiles shrink to S or are removed.
- **Typography scale for readouts:** hero numeral 64-80 px, large 44 px, medium 30 px, small 20 px; units 40% size, labels 12 px caps. The primary reading on a page is visibly the biggest number.
- **Density:** the primary dashboard must show switch, power, voltage, current, balance, alerts and chart without scrolling at 390x844 and 1440x900.
- **Mobile:** XL becomes full-width; M tiles pair side by side; S tiles form a swipeable strip.

### 13.3 Interaction variety (so the instruments feel alive, not pasted)
- Each instrument has its own motion: dial needle with slight overshoot and settle, centre-zero marker that slides with a tick, LED ladder that fills segment by segment, odometer drums that roll, tanks that slosh a little when they change, switch with travel and a click.
- Hover/press states reveal detail (value at that time, min/max) and open the detail page.
- Idle micro-motion is subtle (live dot, tiny needle jitter within real sensor noise only, never invented data).
- Each instrument has its own sound signature where sound is enabled (see Section 3 and the earlier UI prompt), all mutable.

### 13.4 No emojis. Ever.
- **Emojis, emoji-style symbols and text arrows are banned in the UI**: buttons, labels, headings, toasts, banners, notifications, empty states, tables, tooltips, SMS/email/push templates, seed data, public pages, error messages. This includes arrow glyphs (e.g. "->" shown to users, the arrow emoji/sticker characters), tick/cross characters, warning-sign emoji, sparkles, rockets, etc.
- **The PRD alert copy uses a warning emoji (for example the low-voltage alert). Do not copy that.** Use the icon system and plain text.
- **Use one consistent SVG icon family** (stroke icons such as Lucide or Phosphor, one stroke weight, `currentColor`, sizes 16/20/24). Arrows on buttons are SVG chevrons/arrows that nudge slightly on hover. Status uses icons (check, alert-triangle, x, clock) coloured by status tokens.
- Custom brand icons (bolt-in-circle logo, instrument icons) are SVG and live in one `icons/` module; no inline emoji fallback.
- SMS and push text are plain text with no emoji, kept short, with the device name and value ("Low voltage: 165 V on House 3").

### 13.5 Auto-verification (run these; fix everything they find)
1. **Emoji / symbol scan** across `app/`, `components/`, `lib/`, templates, emails, SMS strings, seed/fixtures, MDX/markdown, i18n files. Example script `scripts/design-lint.mjs`:

```js
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const ROOTS = ["app", "components", "lib", "emails", "content", "messages", "public"];
const EXTS = new Set([".ts",".tsx",".js",".jsx",".json",".md",".mdx",".html",".css",".txt"]);
// pictographs, dingbats, arrows, tick/cross, misc symbols, variation selector, keycaps
const BAD = /[\p{Extended_Pictographic}\u2190-\u21FF\u2700-\u27BF\u2B00-\u2BFF\uFE0F\u20E3]/u;

let hits = 0;
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) { if (name !== "node_modules" && name !== ".next") walk(full); continue; }
    if (!EXTS.has(extname(full))) continue;
    readFileSync(full, "utf8").split("\n").forEach((line, i) => {
      if (BAD.test(line)) { hits++; console.log(`${full}:${i + 1}  ${line.trim().slice(0, 120)}`); }
    });
  }
}
ROOTS.filter(r => { try { return statSync(r).isDirectory(); } catch { return false; } }).forEach(walk);
console.log(hits ? `\n${hits} violation(s): replace with SVG icons or plain text.` : "No emojis or symbol glyphs found.");
process.exit(hits ? 1 : 0);
```
   Add it to `package.json` (`"lint:design"`) and CI so the build fails on any emoji. Code comments are allowed to be checked too; keep the codebase clean.
2. **Identity check:** every gauge/chart component takes its colour from `tokens.channel.<name>`; fail if two different channels share the same identity colour or if any instrument uses a raw hex.
3. **Shape check:** at least four distinct instrument components in use (arc dial, centre-zero meter, LED ladder, tank, odometer, toggle). No two measurements on one screen may use the same shape unless they are the same kind of quantity.
4. **Size check:** screenshot the dashboards at 390x844 and 1440x900 (Playwright), compute tile areas from the DOM, and fail if fewer than three distinct sizes exist, if the largest is under 3x the smallest, or if the primary tile is not the one defined for that role.
5. **Fold check:** assert the required tiles (switch/power, voltage, current, balance, alerts, chart) are inside the first viewport without scrolling.
6. **Token check:** no raw colour values or magic font sizes outside the token files.
7. **Accessibility pass:** contrast, focus rings, reduced-motion, text alternatives for every instrument (`role="meter"` with `aria-valuenow/min/max` and a readable text value).
8. **Report:** write results to `docs/DESIGN_AUDIT.md` (before and after), and list any item that could not be fixed with the reason.


---

## 14. CURRENT-BUILD OBSERVATIONS AND REQUIRED UPGRADES (overwrite these)

Observed in the interactive demo (Tenant, Cedar room, scenario "High voltage", 272.2 V, protection active, relay off). The structure is a good start. Upgrade as follows. Instrument shapes, identity colours, tile sizes and the no-emoji rule come from Section 13 and apply to everything below.

### 14.1 Keep (already good)
- Scenario selector (Workspace / Room / Supply scenario): keep and **expand** (14.7).
- Grid, SmartClamp, Your space flow strip; trend charts with the exact-readings disclosure; the "Interactive demo / sample data, no real charges or hardware actions" strip; the simplified sidebar and the minimal green identity.

### 14.2 The relay switch must be the hero tile
- Currently a small "Room power OFF" tile at the bottom right. Make it the **XL tile at the top** (Section 13.2): desktop beside the voltage meter spanning two rows; mobile first under the status strip.
- Large physical toggle with its lamp (OFF / PENDING / ON / FAILED), the **reason** for its state ("Cut by high-voltage protection at 272 V, 10:38"), and the next allowed action. Below it, the last 3 relay events with their source (manual, schedule, budget, protection).
- Tapping it while protection is active opens the override sheet (14.3), never a dead control.

### 14.3 Override is missing: add it (users keep full control)
The banner "Voltage is too high. Protection is active." must carry actions:
- **Wait**: auto-restore countdown once voltage is back in band and auto-restore is on.
- **Restore power**: when voltage is in band; step-up confirm, command, receipt.
- **Allow anyway**: when voltage is still out of band, opens the strict warning sheet from 4.1.5 (low voltage) or 4.2 (surge): full screen, live voltage large, plain damage warning, appliance checklist, hold-to-confirm, step-up auth, time-box, audit entry, auto-revert.
- **Which appliances should I switch off?**: guidance list, sensitive first, with tick boxes; when a smart plug is linked add "Turn off for me".
- Banner colour follows severity (amber low, red surge) and pulses only while unacknowledged.

### 14.4 Instruments: shapes, bands and honest states
- **Each measurement uses its own shape and identity colour (Section 13.1)**: voltage as a centre-zero meter, current as an LED ladder with a limit marker, power as the large dial, energy as odometer drums, balance as a tank. The current build shows three look-alike arc dials; replace them.
- **Show the bands on the scale.** On the voltage meter draw the safe band (default 180-250 V from the device profile), the low and high zones, tick marks at the thresholds and a sliding marker. 272 V must visibly sit **past the high threshold**, with "22 V over limit" in text. Status colours appear on the bands, ring and lamp; the instrument keeps its identity colour.
- **Scale range comes from the device profile and calibration**, never hard-coded (the current voltage dial reads 0 to 327 V; derive range and bands from the profile).
- **States, not zeros.** With the relay off, current and power read **"Disconnected"** (grey, with the cause), not "0 A / 0 W". Unknown readings show a dash and the last-seen time. Only a real measured zero shows 0.
- Each instrument shows a mini min / max / average line and links to its detail page. Numerals roll on change.

### 14.5 Balance becomes a tank
Replace the plain "12.600 kWh remaining credit" row with the **tank tile** (Section 13.1): fill level, naira and kWh together, a "days left" tick shown only when enough measured history exists (otherwise say so), amber under 10%, red at zero. **Buy units** is the primary button on the tile with quick-amount chips. In shared buildings also show the room's balance next to the building supply tank (Section 11, J9).

### 14.6 Power-flow strip becomes a live animation
- Three nodes joined by a line: Grid, Relay (SmartClamp), Your space.
- **Flowing:** pulses travel left to right at a speed that scales with load. **Cut:** the line breaks visibly at the relay, the downstream segment goes grey and the relay node shows the cause. **Pending:** a dashed pulse stops at the relay with a "waiting for device" lamp.
- Node labels become **status lights** (Supply present / lost / unknown; Device online / offline; Relay on / off / pending / failed; Space load or "no measured load"), text secondary. Tapping a node opens its detail (supply history, device health, relay log, load).

### 14.7 Scenario selector becomes the Simulate panel and the public demo
Scenarios, each with the visuals, sound and banner defined in Section 4: Normal; Supply lost; Supply restored; Low voltage (relay cut, alert only, override); High voltage (cut, override); Overload; Current spike; Loose connection; Tamper (clamp removed, relay bypass); Low balance; Balance zero; Budget limit reached; Schedule fires; Relay pending; Relay failed; Device offline and reconnect; Payment pending, verified, failed; Building mismatch (bypass in a shared room).
- Add a **hardware profile switch** (demo, production, custom) to prove the hardware-agnostic design (Section 2.3), a "Reset walkthrough" and a **guided mode** that steps through scenarios with a short caption.
- The dev Simulate panel and the public demo share one engine; the public demo stays labelled as sample data.

### 14.8 Trend charts: events and bands
- Voltage chart: shaded safe band, threshold lines, event flags (e.g. "Protection cut: 272 V") at the drop.
- Current and power: during a cut draw a shaded "Relay off" segment instead of a plunge to zero, so a cut is not mistaken for a measured zero.
- Range chips (1m, 5m, 1h, 1d, All), scrub tooltip with exact value and quality flag, exact-readings disclosure kept. Gaps render as gaps.
- Series use the channel identity colours everywhere (Section 13.1).

### 14.9 Sidebar and top bar
- Current sidebar: Overview, Rooms & usage, Buy electricity, Power control. **Extend to the Section 12 structure**: Monitor, Money, Control (relay accounts), Trust (tamper log and chain, Reports, Disputes), Community, plus Alerts with an unread badge, Settings and Help at the foot.
- Top bar: keep the demo strip when in demo. In the real app show device/room selector, status-light cluster, signal, **sound toggle**, **alerts bell with count**, avatar and (web, relay accounts) a **mini relay switch**.

### 14.10 Moments, sound and haptics (verify, add if missing)
Confirm for the scenario in the screenshot and every scenario in 14.7: banner animation, tile border pulse, sound signature, haptic pattern, notification row. Acknowledge stops repeating alarms. Sound stays off until the first tap unlocks audio; per-event toggles and master mute live in Settings. Every sound has a visual and text equivalent.

### 14.11 Layout and responsiveness
- Desktop (1440x900): switch, key instrument, status strip, alerts and balance in the first viewport, trends below. The current layout leaves empty space at the top right and under the charts: fill the grid with the tiles above.
- Mobile (390x844): switch and key instrument above the fold, then balance and alerts, the remaining tiles in a swipeable strip, bottom bar `Home | Usage | Power | Wallet | Alerts`. No horizontal page scroll; tables become cards. The demo currently renders as a scaled-down desktop layout on a phone: build a true mobile layout.
- Replace flat white panels with the tinted base and tiles from Section 1.

### 14.12 Acceptance checklist for this section
1. In "High voltage" the relay switch is the largest tile and explains why it is off, with Restore, Allow anyway and Guidance actions.
2. Allow anyway opens the strict warning sheet, and once confirmed sends a command that shows Pending, then Observed ON (or Failed), with an audit entry.
3. The voltage meter shows bands and an over-limit readout; current and power show "Disconnected", not 0.
4. The flow strip animates and visibly breaks at the relay when cut.
5. Balance is a tank with naira, kWh and days left.
6. Trend charts mark the protection event and shade the safe band; cuts are not drawn as zeros.
7. The sidebar and mobile bar match Section 12.
8. Every scenario in 14.7 produces the right visuals, sound and notification, with sound off by default.
9. Swapping the hardware profile changes nothing in the UI logic (Section 2.3).
10. At 390x844 the switch, key instrument, balance and alerts need no vertical scroll.
11. Section 13 checks (identity, shape, size, fold, tokens, no emojis, accessibility) pass and are reported in `docs/DESIGN_AUDIT.md`.
