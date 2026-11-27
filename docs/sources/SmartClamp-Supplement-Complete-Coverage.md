# SmartClamp: Supplement for Complete Coverage

**This document is a companion to `SmartClamp_AtoZ_Build_Spec.md`.** It does not replace it. It adds every feature, page, flow and rule that the A-to-Z spec did not cover, found by cross-checking three source documents line by line: the Highlights document, the Master PRD (reconciled) and the Merged Build Guide (Phases 0 to 5).

Section numbers like "A-to-Z 4.1" or "A-to-Z 13" point to the A-to-Z spec.

---

## 0. HOW TO USE THIS SUPPLEMENT

1. Read it together with the A-to-Z spec. **Everything in the A-to-Z spec still applies**, in particular: the non-negotiable honesty and security rules (A-to-Z 1), hardware-agnostic design (A-to-Z 2.3), the event engine (A-to-Z 3), instrument identity, size hierarchy and the no-emoji rule (A-to-Z 13), and the overwrite-and-improve instruction for the existing build (A-to-Z 0 and 14).
2. **Audit first, again.** For every item in this supplement, add a row to `docs/BUILD_STATUS.md`: `Feature | Status (Built / Partial / Stub / Missing) | Where it lives | How it works today | Gap`. Where a feature already exists in the codebase, keep its working data and logic, and rebuild its presentation and interaction to the instrument standard.
3. **The target is the whole site, complete. The PRD phase labels (Phase 0 to 5) do not gate anything.** Build every item. For items that depend on outside parties (utility partnership, certification, payment-provider mandates, SMS/USSD shortcode, manufacturer keys), build everything on our side, plug the outside piece in through an adapter, and show an honest status ("Awaiting provider", "Not enabled") until it exists. Never fake a live result.
4. Every page and component built from this supplement follows A-to-Z 13 (own instrument shape, identity colour, icon, size hierarchy, no emojis) and A-to-Z 14 (override-and-improve, scenario simulation, sound and haptics).
5. Keep the minimal green brand already in the build. Do not return to the PRD's glowing palette.
6. Finish by updating `BUILD_STATUS.md` and `DESIGN_AUDIT.md`, and list anything you could not complete and why.

---

## 1. ADDITIONS ALREADY IDENTIFIED (moved here from the A-to-Z spec)

### 1.1 Authentication and account lifecycle
- Sign up with a role chooser shown as tappable cards (Landlord, Tenant, Homeowner, Installer / Agent / Referrer), not a dropdown. The chosen card sets the role; users never type their own role. Tenants arriving from an invite link have the role forced to tenant.
- Log in with phone number or email plus password (show/hide control), phone and email verification codes, forgot password and **account recovery** (verify the registered phone or email before a new password), session list with "sign out other devices", step-up re-verification for sensitive actions.
- "Continue with Google" appears only when the provider is configured; otherwise show an honest "awaiting provider configuration" state, never a dead button.
- Role-based redirect after login or signup (tenant, homeowner, landlord, installer, ops, staff), and fetch the account's active feature flags in the same load before redirecting, so the first screen already shows only what the account can use.
- Rate limiting, lockout messaging, clear error states, invite-link acceptance for tenants and viewers.

### 1.2 Plans, subscription and hardware orders
- Plan page: current tier (Free, Basic, Basic Pro, Pro), what each unlocks, what is Planned, what needs hardware. Upgrade and downgrade flow. Buying a plan never adds a relay; say so plainly.
- **Subscription billing runs separately from the electricity wallet.** On signup the user selects a plan and billing frequency: monthly, quarterly (5% off) or yearly (10% off). A failed subscription charge triggers a grace-period notification, **never an immediate feature lockout**, and a lapsed subscription **never cuts anyone's power**: it only limits app feature access. State this in the UI.
- Platform subscription billing history, cancellation, data-retention note.
- Hardware and installation orders: request an installation, choose device type (house, room, Building Hub, relay retrofit, IR-Reader), see status (requested, scheduled, installed, commissioned), installer contact, warranty.
- Itemised recharge quotes must show the platform markup and fees plainly.

### 1.3 Support, installation requests and help centre (user side)
- In-app support request form (category, summary, detail, attach device or period), request list with status and replies, and a "Something doesn't look right?" link from every error state.
- Installation requests and "Link your SmartClamp" pages (they exist in the build): bring them to the instrument design language.
- Support pages keep the electrical emergency notice (the form is not an emergency service).
- Help centre: FAQs, **Connection help** (the browser vs device vs electricity explainer with a working "check service connection" test), installation guides, safety information, and a glossary of readings (voltage band, kWh, what a cumulative counter is).

### 1.4 Supply-side screens: Transformer Monitor and Pole Gateway
- **Pole page:** pole health, heartbeat, firmware, count of connected homes or buildings, load leaving the pole vs the sum of downstream devices, mismatch flags, signal strength and SIM data against the plan cap (ops view).
- **Transformer page:** supply availability history (when power was actually present at the source), outage timeline, verified vs unverified hours.
- Visible to ops, and to staff and community views by role and consent. Homeowners see their own link in the trust chain.
- Peer comparison draws only from aggregates above privacy thresholds.

### 1.5 Partial bypass (drawing off a neighbour's line)
The Highlights document names two theft types. A-to-Z J11 covers full bypass. Add partial bypass:
- **Victim's view:** their device measures more than their real use; their wallet drains faster; their trace shows loads they cannot explain.
- **System behaviour:** pattern signals flag "measured load pattern needs review" on the victim's device (never "theft proven"). The victim can open a dispute with the evidence timeline and request an inspection. The system does not name the suspect.
- **Reconciliation signature:** pole or building totals still balance (load moved between lines, not missing), which distinguishes partial bypass from full bypass.
- **Victim protection:** a "contest this period" flag that holds the disputed allocation in review without cutting power; resolution through the Dispute Center and payment plan.
- Also cover the **no-meter agent/caretaker case**: a caretaker paying a distribution agent directly. The pooled wallet and signed reports give the building an evidence trail of what was used and what was paid.

### 1.6 Verified record (consent-based)
A "Verified record" page showing only the user's own verified payment and usage history, exportable as a signed report, shared only through an explicit, revocable, purpose-named consent. Nothing is shared by default.

### 1.7 Privacy and consent centre
One page listing every consent (utility notices, SMS and push, analytics data sharing, verified-record sharing, viewers and guests, utility control), with plain wording, last-changed time and a revoke button per item.

---

## 2. NEW GAPS FOUND IN THE MASTER PRD AND MERGED BUILD GUIDE

### 2.1 Installer, Agent and Referrer roles (entirely missing from the A-to-Z spec)
The signup flow has a fourth role group. Build these as real workspaces, but **nothing about them is rigid**: roles, payout triggers, amounts, schedules and gates are **feature flags and configuration, not code** (see 2.1b). If the business runs without an agent network, those roles simply do not appear.

**Installer portal**
- Pair device screen: after the installer connects to the unconfigured device over Bluetooth and the device first reaches the internet, the app shows a "Registering" state, then displays the device's secret key with a clear instruction to enter it into the device now over Bluetooth (shown once, with a copy control, never retrievable again).
- Device registration captures: device role (pole gateway, pole device, house full, building hub, transformer monitor, IR-reader, smart socket), whether it has a relay, whether it has a voltage sensor, and its room, building and pole group.
- On-device diagnostics from the same app: signal, sensors, relay test, clock, with pass/fail lamps.
- **Physical installation safety checklist**, required before commissioning: insulated tools rated for the voltage class, PPE (gloves, eye protection) worn throughout, and a **qualified electrician (not only the installer) closes the clamp on any wire not first de-energised**. The checklist is signed off in-app and stored with the install record.
- Install queue, status per job, retrofit jobs (adding a relay to an existing pole device), installer performance and earnings.
- Install is confirmed complete **when the device comes online**, which triggers the installer payout.

**Agent and Referrer dashboards**
- Personal code and share link, sign-ups under the code, conversion funnel, accrued earnings, payout history.
- **Payout rules are configuration (2.1b).** The PRD's starting values (installer N2,000 to N5,000 per confirmed install, agent N1,000 to N2,000 per subscription under their code, referrer N500 per signup under their code) are **seed defaults only**. Whatever rules are active are displayed plainly to the person they apply to. Payouts accrue to a **ledger and disburse on a configurable schedule (default weekly or monthly), never instantly per event**, to keep reconciliation clean. Show accrued vs paid.

### 2.1a Does the installer have a panel? Yes: the Installer Portal
The PRD lists an **Installer / Agent / Referrer Portal** as its own page (site map item 16), with the installer's work under an installer route (for example `/portal/installer/...`). It is one portal whose menu depends on the role and the flags in 2.1b.

**Installer menu:** Jobs (install queue and retrofit jobs), Pair a device, Diagnostics, Safety checklist, Job history, Earnings (if payouts are enabled), Training and verification status.
**Agent / Referrer menu:** My code and link, Sign-ups, Funnel, Earnings, Payout history.
**Ops side (company only):** the leaderboard, payout liability and contractor status in ops panels C and M, and the rule editor in panel J.

### 2.1b Configuration over code (applies to roles, payouts and every business rule)
Nothing below may be hard-coded. Each item lives in a config table editable from the ops feature-flag and rules panel (ops panel J), with environment variables supplying defaults per environment (dev, staging, production, regional).
- **Role switches:** `role.installer.enabled`, `role.agent.enabled`, `role.referrer.enabled`, `role.installer.requires_training`, `role.agent.code_requires_approval` (PRD defaults: installers need a verification step before job assignment; agents and referrers get an immediate code with no gate).
- **Payout rules table:** `trigger` (install_confirmed_online, subscription_signup_under_code, signup_under_code, custom), `amount` or `min/max`, `currency`, `payee_role`, `schedule` (weekly or monthly), `hold_days`, `enabled`, `effective_from`, `effective_to`. Changing a rule never rewrites past ledger entries.
- **Per-region and per-organisation overrides** (white-label clients can have their own rules).
- **Other business thresholds follow the same pattern:** drift thresholds, voltage and overload defaults, subscription discounts and grace period, price-per-unit formula parameters, alert repeat intervals, override time-box options, report link lifetime.
- Every config change is audited (who, what, old value, new value) and versioned so it can be rolled back.

### 2.1c Provisioning and connectivity: Bluetooth vs GSM (how a device gets onto the cloud)
These are two different things and the installer flow only uses one of them.

- **Bluetooth (BLE) is the local setup channel only.** The installer's phone talks to a brand-new, not-yet-networked device over BLE to assign its Device ID, load whatever network settings it needs, and run diagnostics (signal check, live sensor test, pairing confirmation). BLE carries no ongoing data.
- **After setup, data reaches the cloud over the device's real uplink, which depends on the device type:**

| Device | Path to the cloud |
|---|---|
| Pole Gateway | GSM, direct to the cloud (company-owned SIM) |
| Other pole devices on the same pole (up to about four) | ESP-NOW to the gateway, then the gateway's GSM |
| Room device (House, Full) in shared housing | Wired RS485 to the Building Hub, then the hub's GSM |
| Building Hub | GSM, direct to the cloud |
| Transformer monitor, IR-Reader | Per their device profile; the IR-Reader's path (direct or relayed through a gateway or hub) is still pending a field test in the PRD |

- **Pole devices and building hubs never talk to each other locally.** Each uploads independently, and bypass detection is a cloud-side comparison of two separate streams.
- **What "network credentials over BLE" means in practice:** Wi-Fi or GSM settings matter only for devices that connect to the internet themselves (gateways, hubs, or anything on Wi-Fi). A device behind a gateway or hub needs instead to be **linked to its gateway, hub, pole group or room**. The PRD describes assigning credentials and the Device ID over BLE but does not spell out the linking step for ESP-NOW and RS485 devices, so the agent must implement it as part of the same BLE flow and record it in `BUILD_STATUS.md`.
- **Full commissioning sequence for the Installer Portal:** (1) connect over BLE, (2) assign Device ID and uplink or linking settings, (3) run diagnostics, (4) the device first reaches the cloud (directly or through its gateway or hub), (5) the portal shows "Registering", calls device registration, and shows the device's secret key once with "enter this into the device now, it will not be shown again", (6) installer signs off the safety checklist, (7) install is confirmed complete when the device is seen online, which can trigger an installer payout if that rule is enabled, (8) the customer scans or enters the Device ID, names the device ("Room 3", "Main House") and it appears live within seconds.
- **Provisioning is an adapter, like everything else in the hardware-agnostic design (A-to-Z 2.3).** BLE is the PRD's choice, so build it as the default provisioning transport behind an interface. A different board or a different method (a local access-point mode, a serial cable for the factory) must plug in without changing the Installer Portal screens.
- **Firmware updates follow the same logic:** devices with their own uplink update normally; devices behind a gateway update by chunked, checksummed, resumable transfer over ESP-NOW.

### 2.2 Public homepage: meter validation and IR-Reader order flow
- Homepage box: "Enter your meter number" with a Check button, no login, nothing stored. Result is either a green confirmation card (name and address returned) or a clear not-found state. It validates only; it must say it is not a live balance lookup.
- After a successful check, a logged-in visitor sees "Want live balance and history? Order an IR-Reader": a short order form (delivery address), then install instructions.
- Utility type selector (Electricity, Water, Gas) above the input once multi-utility is on (see 2.12).

### 2.3 Meter linking, manual readings and dual tariffs (customers with an existing meter)
- **Meter linking flow** shows a real "Checking connection" state that resolves to **Connected** or "Couldn't reach this meter, check the number and try again". It is never an instant, unconditional success.
- **Manual reading entry** (dumb meter, no clamp, no optical port): a form on the homeowner dashboard, visible only when the linked meter has no paired reader. Number input for the reading, optional photo of the meter face, submit. Manual readings are always labelled "manual" everywhere they appear, and feed the same history, disputes and reports as measured data.
- **Dual-tariff billing:** where tariff rows exist for a device or meter, the bill breakdown shows rate periods, for example "Day: X units at N per unit, Night: Z units at M per unit", instead of one flat number.
- **Unified dashboard:** one dashboard for homes whose "device" is a linked meter, a SmartClamp, or both. It branches on the data source and never makes the user pick between two dashboards. A linked-meter-only account sees only what that source can honestly provide (cumulative energy, no live voltage or current, no relay).
- **Clamp vs meter cross-check:** where both exist, a mismatch raises a `clamp_meter_mismatch` alert at the tighter threshold (see 2.6).
- Basic Pro analytics (forecasting, load signatures, power factor and the rest) must accept either a device or a linked meter as the data source.

### 2.4 Shared housing money model, exactly as the PRD defines it
- **With a central meter ("a meter within a meter"):** one physical meter serves the building. Every room has its own device and its own private balance. A tenant loads money onto the building's central meter, but the purchase is **recorded against their own Device ID**, never shared or pooled. The landlord never buys, sells or prices units.
- **Low balance flow:** alert at 10% remaining, automatic cut at zero (no landlord action is possible or needed), recharge, power restores automatically. Show this as a clear state sequence on the tenant's switch tile and alerts.
- **Without a meter (collective settlement):**
  - Every room measures its own usage; the whole-building device measures the total; each room's app shows its own usage and the building total.
  - **Real-time self-loading price per unit** is computed by a self-correcting formula, because rooms must top up before the NEPA bill is known. Show the current price per unit with an explanation of how it is derived and when it was last corrected.
  - It is a pass-through, never a markup.
  - **Settlement cadence (running self-funded balance per room vs strict per-bill reconciliation) is an open decision.** Build both views and make the mode configurable per building.
  - **Adoption constraint:** a non-payment disconnection from NEPA cuts the entire building. Show this risk plainly on the pooled wallet page, and show the pooled wallet status prominently: contributed vs needed before NEPA must be paid.
  - **Paying NEPA is a human action**: the landlord pays outside the platform, then confirms in-app; the platform's job is to make the payment provably correct. Never build toward automated NEPA payment.
- **Public naming on bypass:** the PRD describes a public broadcast that names the room when a bypass alert fires. This conflicts with the "investigate, never accuse" rule. **Build the broadcast as a configurable option, default off for naming**: by default broadcast neutrally ("a tamper alert is under review in this building"). Naming a room is allowed only after a recorded verification step and with a visible dispute path. Flag this as an owner decision (A-to-Z 10).

### 2.5 Single-home model
- **Basic and Basic Pro:** one pole device measures the whole home from outside, no relay, no in-house hardware. Full logging, correlation against the transformer, Device ID and QR access, a verifiable record for disputes.
- **Pro:** the pole device serving the home gets a latching relay retrofit; everything in Basic Pro plus remote control, scheduling, budget, restore power and hours of light saved.
- **Upgrade path UI:** when a plan changes to Pro, the new features appear immediately on the same login; if hardware is needed, show the install request instead (never promise features the hardware cannot do).
- **Infrastructure model:** Pole Gateways are company-owned shared infrastructure; customers never buy or manage connectivity separately (data cost is bundled in the subscription). Where a pole is deployed by a third-party installer, offer a package with both the gateway and non-gateway variants. Surface this in hardware orders and installer screens.

### 2.6 The five-layer theft and verification framework, as the PRD defines it
The A-to-Z spec has the scenarios. Build the **detection layers** and their user-visible surfaces exactly as follows.

**Layer 1, hardware tamper (all devices, always on):**
- Clamp removed: current falls to zero while the relay is ON.
- Relay bypassed: relay is OFF but current is above zero.
- Clamp loosened: fluctuating readings.
- Device offline: no heartbeat for 24 hours.

**Layer 2, relay vs current correlation:** a room at zero balance with current still flowing while the relay is OFF raises a bypass alert.

**Layer 3, upstream drift.** Every level is compared with the level above it. Thresholds tighten as physical distance shrinks, and are configurable defaults (never constants in code):

| Comparison | Default threshold | Reason |
|---|---|---|
| Clamp vs linked meter | 5% | Same physical point; disagreement means device fault or interference |
| Pole vs house, or building vs sum of rooms | 8% | One hop, little legitimate loss |
| Transformer vs served poles | 10% | Widest span; normal line loss must not be flagged as theft |

- **Confirmation window:** drift above 8% must persist across 3 consecutive 5-minute checks (15 minutes) before an alert fires; a single noisy reading never alerts. The transformer-level check requires sustained drift for 15 minutes.
- Comparison by deployment: shared housing with meter (central meter total vs sum of rooms), shared housing without meter (whole-building reading vs sum of rooms), single home (transformer log vs pole reading), meter integration with a clamp (clamp vs meter), meter only (inherits the meter's own tamper detection).

**Layer 4, pattern analysis:** Room A usage drops sharply while Room B spikes (A may be drawing off B's wire); a room at several times its own historical average (possibly tapped into a neighbour); zero balance but usage continues (bypassed relay); device offline over 24 hours.
- A separate **behavioural anomaly** alert (statistical, later model-driven) is always worded **"review recommended"**, never "tamper confirmed". Keep its visual treatment (amber, investigate) clearly different from a threshold breach (red, mismatch).

**Layer 5, public accountability:** public dashboard, public tamper alerts, self-policing through transparency (see A-to-Z 5.N), under the neutral-wording rule in 2.4.

**Device and SIM theft tracking (protects the hardware itself):**
- Location without a GPS chip: the cellular module reports its cell-tower fingerprint. A device reporting from a different tower than its installed baseline raises a **critical `device_relocated` alert** ("possible theft or unauthorised relocation").
- The SIM platform detects IMEI changes and far-away towers and sends a signal; the backend turns it into a critical `sim_anomaly` alert.
- UI: visible to the owner and ops; the owner can acknowledge "I moved it" with step-up verification, which resets the baseline and logs it.

**Trust chain view (all of it, one component):** Transformer Monitor, then Pole (gateway or device), then customer meter or house/room device, shown as linked nodes. The rule is displayed: **if any level does not align, tampering is detected.** Matched link = calm, mismatch = break at the exact level with both numbers.

### 2.7 What the hardware does by itself (the app must reflect it)
Surface these as device-detail facts and as honest states (reads from the capability manifest, A-to-Z 2.3):
- Stores usage locally in flash for months with no connectivity, then uploads on reconnect ("caught up" state).
- Latching relay cuts or restores on command; **overload over 2000 W (default)** alerts and cuts on relay devices; **brownout under 180 V and surge over 250 V (defaults)** cut on relay devices.
- Self-powered from the same wire (no batteries): a supply cut can power the device down; show "device offline, supply likely off" as **unconfirmed**.
- Power and outage timekeeping: the device keeps time through outages and records the outage locally, reporting after recovery; clock-confidence is shown with readings.
- Firmware updates over whichever path the device has (including chunked updates over ESP-NOW), shown in device health as `ota_state` with progress and rollback status. Browsers never execute device code; only signed firmware artefacts.
- Connectivity paths: ESP-NOW (same pole), RS485 (room to hub), GSM (pole gateway and building hub uplinks). Pole/house and Building Hub never talk locally. Show the path in device details so support can diagnose.

### 2.8 Utility / NEPA workspace (full)
Role-restricted workspace, route namespace separate from customers.
- **Community overview:** region selector at the top; below it total connected transformers and poles in scope, aggregate consumption, and a tamper-flag count badge (red above zero). **No individual customer usage graphs by default**; it is a regional aggregate.
- **Correlation and tamper flags drill-down:** tapping the badge lists flagged devices **without customer names or exact addresses unless that specific customer has an active utility-control consent record**. Aggregate counts are always visible; identities are consent-gated.
- **Utility control consent (customer side, in Settings):** a section named "Utility Control", **default off**, plain-language explanation ("Allow [DisCo] to request power actions on your account through SmartClamp. You will always be notified immediately and can revoke this at any time"), a single toggle, grant and revoke both logged. Without an active consent, a utility command is blocked and the block is logged. There is exactly one code path through which a utility command can originate; it cannot proceed without consent. Utility commands always require the customer-facing notification and use the same signed-command mechanism as every other relay command (no weaker path); step-up is always applied.
- **Bill generation:** staff can generate bills from SmartClamp data; such bills carry a `generated_by_utility` marker.
- **"NEPA-Verified" badge** (small, green, on the homeowner dashboard) appears only once the utility's own billing pipeline has actually consumed that customer's SmartClamp data, not merely when integration is theoretically available.
- **Broadcast panel:** message text area, scope selector (a region, or drill down to one building), send, and a history list of previous broadcasts. Recipients get an in-app alert and an SMS; recipient count is logged.
- **Disconnection list generation:** filter form (minimum days overdue, region), a Generate button producing a reviewable, downloadable list. **It is a report, never an action: there is no bulk "Disconnect All" button anywhere**, and each item, if acted on, goes through the customer-consent command path.
- **Audit:** every staff view of aggregate or drill-down data, every bill, broadcast, list and blocked command is written to the audit log and is visible in the internal access audit (2.9, panel K).
- **Meter adapter layer:** build a pluggable per-manufacturer adapter interface (read balance, validate, and later control) now, with real adapters filled in once partnerships exist. Until then the UI shows "Provider not connected", never a simulated result.
- **STS token format:** recharge credits shown to the customer in STS-compliant token format where a meter requires it; certification is an external compliance item tracked in the compliance panel, and the UI must not claim certification before it exists.

### 2.9 Internal ops and fleet dashboard (company only), every panel
Role-gated (super-admin, ops, finance, support, engineering, read-only). Never customer-facing. Every access is itself logged (panel K).

**Minimum view (always present):** basic fleet health (every device, online or offline, last heartbeat), **manual allocation tools** (assign units or balances to pilot or test devices), and a raw error log.

**Panels:**
- **A. Fleet health:** every device by type; map view by location fingerprint; last heartbeat sortable by longest offline; firmware version distribution and OTA rollout tracking; GSM signal strength and **per-SIM data use against the plan cap**; devices with unusually high outage-report frequency; **device provenance and lifecycle** (manufacture batch, install date, installer, full firmware history), so a defective batch can be found in one query.
- **B. Alerts and tamper feed:** real-time feed across all customers and buildings; filter by type, severity, region; **time-to-response** tracking; **false-positive rate per alert type and per individual device** (finds miscalibrated units); **data completeness score per device** (online but silently dropping readings vs fully offline).
- **C. Adoption and growth:** onboarded users over time, adoption within the pilot area, tier breakdown and tier movement, churn, installer/agent/referrer leaderboard with payout liability, acquisition funnel (validation lookups, signups, installs, paid conversions, with drop-off at each stage), channel attribution feeding CAC by channel.
- **D. Revenue and payments:** revenue by stream, gateway reconciliation as a discrepancy list (where webhook idempotency becomes visible), **total customer prepaid wallet balance platform-wide** (outstanding liability), pending payout queue, live unit economics (CAC, payback), burn and runway. Items that cannot be derived from product data are flagged as needing their own input source.
- **E. Disputes and support:** open dispute count, average resolution time, breakdown by deployment type.
- **F. Error and exception logs:** backend errors, device communication failures, failed OTA updates, failed webhook deliveries.
- **G. Compliance tracker:** checklist of every external item (data-protection compliance, STS certification, pole access, utility partnership) with status and next action, and an expiry calendar with advance warnings.
- **H. Field ops:** pending install queue, installer performance, decommission and RMA tracking.
- **I. Inventory and supply chain:** stock per component and finished device type with reorder alerts, supplier lead times, landed cost feeding pricing re-costing.
- **J. Feature flag and rollout control:** toggle any feature globally, by tier, or for specific buildings, without an app release. This is the real control panel for every feature gate in the product (see 2.13).
- **K. Internal access audit:** which staff member viewed or exported customer data and when; a side-effect of the access control itself, not a separately maintained log.
- **L. Regional expansion tracker:** per-region adoption, DisCo and tariff differences, utility relationship status.
- **M. Vendor and partner tracker:** telco contract status vs cap, payment gateway relationship health, installer and agent contractor status at portfolio level.
Use the same instrument language: fleet map with status lights, heartbeat strips, tanks for SIM data caps, funnel and gauge components for KPIs.

### 2.10 Scale features for landlords and partners
- **Multi-property portfolio dashboard:** appears automatically once a landlord owns more than one building (no separate signup). A card per building with a one-line health summary (rooms occupied, revenue this month, active tamper flags), a portfolio total on top, and tap-through into that building's own dashboard.
- **White-label admin console:** separate route namespace for organisations. Platform super-admins create an organisation (name, subdomain, logo, primary colour, plan). An organisation's own admin sees a cut-down ops view scoped to that organisation. **Branding is delivered at load:** the app reads the subdomain, fetches the organisation's logo and colour and injects them as design tokens before render, so the same components serve every client. All data tables gain organisation scoping with matching row-level security.
- **AI-driven pattern study and forecasting:** same slot and same API shape as the current analytics; models fall back to the simple logic automatically when history is too short. UI labels any model output as an estimate.
- **Savings recommendations card:** on the dashboard, 1 to 2 recommendations with an estimated naira saving (for example, shifting a heavy appliance away from peak hours) and a **dismiss control per recommendation**; dismissed items stay dismissed.
- **SmartClamp Socket (smart-plug accessory):** a new device role registered through the same registration and readings path as every other device, shown in the capability-driven UI (per-appliance power, on/off). Honest status until hardware exists.

### 2.11 Payment methods and channels
- **USSD recharge:** dial, enter Device ID, choose amount, confirm PIN, receive SMS confirmation. Buying units is never tier-gated; the balance-check branch is Basic Pro. A shortcode is not advertised until one is allocated.
- **Other channels:** app (payment-only), website (payment-only), bank transfer (Device ID as the reference), full login for the complete dashboard, plus Paystack, OPay, Flutterwave and card.
- **Webhook idempotency:** the gateway confirmation is keyed to its own unique transaction reference; check for an existing transaction before crediting anything; duplicate deliveries never double-credit. Surface pending, verified, failed, reversed and duplicate states honestly in the wallet UI and the ops reconciliation list.
- **Public verification microsite:** a signed public page on its own domain (no login, no app chrome), with long random report tokens (not guessable), showing the usage summary, verification status (aligned or mismatched vs the upstream comparison), the hash-chain integrity badge, and the honest disclaimers.

### 2.12 Multi-utility (water and gas) as a software-only addition
- The homepage validation box and the meter linking flow gain a utility selector (Electricity, Water, Gas).
- Wallet, recharge, payment history, payment webhook and disputes work unchanged for any utility.
- Once a user has more than one utility linked, the dashboard shows a tab switcher (Electricity, Water, Gas) at the top, same page and layout.
- **What does not apply to water and gas, and must not be shown:** live usage and graphs, relay control and schedules and budgets, load signatures, power factor, tamper detection in any tier, under-supply credit. Forecasting from payment history may extend. The water/gas dashboard is honestly simple: balance and payment history. Whether markup and fee percentages match electricity is a business decision.

### 2.13 Feature-flag system (cross-cutting)
- Every gated feature checks a server-side flag and, for hardware features, the device capability manifest. Flags are settable globally, per tier, and per building (ops panel J).
- The client fetches active flags at login and renders only what applies; **elements that cannot work for the account do not render** (A-to-Z 1).
- A flag change takes effect without an app release.

### 2.14 Realtime and device identity (what the UI depends on)
- The dashboard opens a **direct realtime subscription** to the account's own readings for live values (the one sanctioned exception to "everything goes through the API"), with row-level security enforcing that a user only receives their own room or devices.
- **Devices authenticate differently from people:** each device request carries a signature computed with that device's own secret; devices have no passwords or user tokens. The UI never shows device secrets after the one-time installer display.

### 2.15 Legal, privacy and compliance pages
- Terms of service, privacy policy, and the footer disclaimer ("SmartClamp provides sub-metering and verification technology. It does not generate, resell or distribute electricity, or replace your utility meter.") on every public page.
- Data-protection consent capture at signup and in the consent centre (1.7). Staff access to customer data is logged (panel K).
- Position statement stays honest throughout: SmartClamp is not a smart-meter replacement and not a landlord billing tool that takes a cut.

---

## 3. COMPLETE PAGE INVENTORY (all roles; build every one)

Route names are suggestions. Priority is order of polish only, not scope.

**Public (no login)**
| Page | Notes | Priority |
|---|---|---|
| Home | Hero with simulated live-meter demo, meter-number check, positioning | P1 |
| How it works, For your home, For your building, Devices (clamp, IR-Reader), Plans | Instrument visuals, Available/Planned chips | P1 |
| Optical Meter Reader page and order | From validation flow | P1 |
| Support, FAQs, Connection help, Installation, Safety | Help centre (1.3) | P1 |
| Sign up (role cards), Log in, Recover account | 1.1 | P0 |
| Invite join (tenant, viewer) | Role forced | P0 |
| Public device view (Device ID / QR) | Usage, bill, status, pay only | P1 |
| Verification report microsite | Signed, read-only | P0 |
| Community dashboard, report suspicious activity | A-to-Z 5.N | P2 |
| Terms, Privacy, Our story | 2.15 | P2 |
| Interactive demo (scenario simulator) | A-to-Z 14.7 | P1 |

**Tenant / Homeowner**
| Page | Priority |
|---|---|
| Home cockpit; Live (power, voltage, current); Usage and insights (pattern study, compare, accuracy, power factor, load signatures, forecast, credit estimate, savings recommendations) | P0 / P1 / P2 |
| Wallet and bills (recharge, quote, history, monthly bill with dual-tariff breakdown, auto-recharge, generator share, export) | P0 / P1 |
| Control: switch, schedules, budget, protection settings with override sheets | P0 / P1 |
| Alerts feed and notification preferences (sound, channels, quiet hours) | P0 |
| Trust chain and tamper log; Reports (issue, CSV, share, revoke, scheduled delivery) | P1 |
| Disputes, Meeting Mode, payment plans | P1 |
| Linked meter, manual reading entry, linked smart devices | P1 / P2 |
| Access (viewers, guests, multi-user), Language, Offline mode | P1 |
| Settings, Plan and subscription, Verified record, Consent centre, Support requests, Installation requests | P1 |
| Utility switcher tabs (water, gas) | P2 |

**Landlord / Building admin**
| Page | Priority |
|---|---|
| Building dashboard; Rooms and tenants; Invites; Transfer device | P0 / P1 |
| Collections, recharge on behalf, reminders; Pooled wallet (no-meter) with price-per-unit explainer; Generator share; Revenue | P1 |
| Building integrity (reconciliation, unaccounted energy, ranked inspection list, inspection request) | P1 |
| Bulk control (administrative only, step-up) | P1 |
| Reports, Audit log, Disputes, Alert thresholds | P1 |
| Portfolio dashboard (multi-property) | P2 |

**Installer, Agent, Referrer**
| Page | Priority |
|---|---|
| Installer: pair device, diagnostics, safety checklist, install queue, retrofit jobs, earnings | P1 |
| Agent / Referrer: code and link, signups, funnel, accruals, payouts | P2 |

**Utility / Staff**
| Page | Priority |
|---|---|
| Community overview, tamper flags (consent-gated), service messages, bill generation, broadcast, disconnection list (report only), consent status | P1 / P2 |

**Internal ops (company only)**
| Page | Priority |
|---|---|
| Fleet (map, health, firmware, SIM), Alerts and tamper feed, Pole and transformer pages, Adoption, Revenue and wallet liability, Disputes and support, Error logs, Compliance, Field ops and RMA, Inventory, Feature flags, Access audit, Regional and vendor trackers, Manual allocation tools, White-label console | P1 / P2 |

---

## 4. TRACEABILITY: SOURCE DOCUMENT TO WHERE IT IS SPECIFIED

| Source feature or section | Where |
|---|---|
| Highlights: monitoring, billing, alerts, remote control, protection, community, disputes, account, shared housing, landlord | A-to-Z 5, 11 |
| Highlights: Pro control without extra device; product family; smart-home; vision (verified record) | 1.5, 1.6, 2.5, 2.10, A-to-Z 2.3 |
| Highlights: full and partial bypass | A-to-Z J11, 1.5 |
| PRD 03.5-03.8 hardware behaviour and protection | 2.7, A-to-Z 4 |
| PRD 04 connectivity; 05.4 command security | A-to-Z 2, 2.7, 2.8 |
| PRD 05.1-05.3 tiers and features | A-to-Z 5, 1.2, 2.13 |
| PRD 05.5 landlord features and legal correction | A-to-Z 1, 5.Q, 2.4 |
| PRD 05.6-05.7 access and payment methods | A-to-Z 5.O, 2.11 |
| PRD 06 meter integration | 2.2, 2.3, 2.8 |
| PRD 07 deployment models, subscriptions, payouts, NEPA payment gap | 2.4, 2.5, 1.2, 2.1 |
| PRD 08 theft framework, trust chain, device/SIM tracking | 2.6, A-to-Z J11 |
| PRD 12 screens, 12.5.1 safety protocol, 12.6 ops | 2.1, 2.9, A-to-Z 12 |
| PRD 14-15 page specs and deltas, verification microsite | A-to-Z 5, 2.8, 2.11 |
| PRD 16 permissions, 17 business model | 2.15, 1.2, 2.9 (D) |
| Build Guide 3.1-3.11f (all Phase 0/1 pages and analytics suite) | 2.2, 2.1, A-to-Z 5 |
| Build Guide 3.13 ops panels A-K, 4.7 panels L-M | 2.9 |
| Build Guide Phase 2 (meter integration) | 2.3 |
| Build Guide Phase 3 (NEPA, transformer, correlation, consent, broadcast, disconnection list, adapters, STS) | 2.6, 2.8 |
| Build Guide Phase 4 (portfolio, white-label, AI, anomaly, savings, Socket) | 2.10 |
| Build Guide Phase 5 (water and gas) | 2.12 |
| PRD 18 brand | Superseded by the owner's decision: keep the current minimal green identity (A-to-Z 1) |

Anything found in the codebase or in the source documents that is not in the A-to-Z spec or in this supplement must be added to `BUILD_STATUS.md` and specified in the same style before it is built.

---

## 5. OPEN DECISIONS (flagged, not assumed)

1. Whether the bypass broadcast may ever name a room, and the verification step required first (2.4).
2. Settlement cadence for no-meter buildings (running balance vs per-bill reconciliation) (2.4).
3. Who absorbs a building shortfall from unmetered draw (A-to-Z J11).
4. Markup and fee percentages for water and gas vs electricity (2.12).
5. SMS/USSD provider and shortcode allocation (2.11).
6. Utility partnership timing, and which manufacturer adapters come first (2.8).
