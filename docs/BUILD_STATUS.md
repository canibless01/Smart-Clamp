# A-to-Z build status

26 November 2026. The owner requested that the attached A-to-Z direction be incorporated into the ongoing instrument redesign. This ledger distinguishes source implementation from provider/hardware acceptance. `Built` below means the stated code path exists; it is not a production qualification claim. External Supabase project migrations remain unapplied. Isolated QA migrations now include 036 and 037.

| Feature | Status | Where it lives | How it works today | Gap versus attached spec |
|---|---|---|---|---|
| A Dashboard | Partial | OverviewDashboard, HomeInstrumentPanel, live_resources projection | Compact bento with real readings, unknown feedback, status lights, details drawer | Shared realtime, channel manifests, full moment choreography |
| B Live power | Partial | EnergyInstruments, readings, usage_postings | Actual W and timestamped traces, gaps retained | Profile scaling, period insights, hours counters |
| C Voltage | Partial | live_devices ingest, device_experience, electrical projection | Signed readings, configured advisory bands, transition alerts | Dedicated shape, full settings and qualified device configuration |
| D Current | Partial | EnergyInstruments, device_experience | Recorded current, explicitly configured current advisories | LED ladder, profile limits, validated spike models |
| E Relay | Partial | control page, live_devices, command_receipts | Operation-bound step-up, signed command and observed feedback, audit | Hero interactive lifecycle, complete qualified hardware, protected override protocol |
| F Schedules | Missing | Existing unavailable feature disclosures | No schedule execution claimed | Offline execution, protocol, recovery, UI and receipts |
| G Self-set budget | Missing | Existing unavailable feature disclosures | No budget execution claimed | Device execution, midnight recovery, step-up and UI |
| H Wallet/recharge | Partial | billing, live_payments, work, immutable ledgers | Quote, checkout, verified callback, provider vending, funded usage | Tanks, forecasts, auto-recharge, generator share, additional provider agreements |
| I History/insights | Partial | history, ElectricalTrends, usage_postings | Scoped measured series, gaps, exact readings | Period comparison, validated analytics, peer anonymity thresholds |
| J Notifications | Partial | alert-types, ExperienceProvider, notifications/interactions, SensorySettings | Shared presentation, recorded transitions, opt-in audio, mute/quiet hours, ack/snooze/history | Expanded event catalogue and realtime delivery; live provider acceptance |
| K Tamper/trust | Partial | device_signals, usage_event_chain, utility overview | Signed signals and hash chain, no theft verdict | Full evidence chain page and validated correlation engine |
| L Reports | Partial | reports, MeasurementReport, SharedReport, measurement_reports | Issued signed snapshot, CSV, revocable public link, actual verification seal | QR/PDF and scheduled delivery |
| M Disputes | Partial | disputes routes and API, meeting mode | Persistent scoped cases, responder handoff and meeting view | Agreed instalment tracking, auto-attached measured window |
| N Community | Stub | community, UnavailableFeature | Honest availability gate | Privacy-safe aggregation, reporting and abuse controls |
| O Public device/USSD | Partial | d/[public_token], public projection | Restricted current snapshot and payment destination | Provider shortcode, production QR/print workflows |
| P Access/settings | Partial | settings, live_auth, session, device_viewers | Refreshing Auth, consent/profile completion, preferences, scoped viewers backend | Complete family/guest management, language, dark mode |
| Q Landlord | Partial | landlord/buildings/rooms, BuildingInstruments | Buildings, room invites, measurements, complete-coverage room load sum | Central-vs-room reconciliation, transfer settlement policy, pools and administrative consent workflows |
| R Pairing/onboarding | Partial | devices/link, join, installer portal, firmware commissioning | Single-use claims/invites and Wi-Fi/TLS commissioning | BLE, full hardware diagnostics and first-run sequence |
| S Staff/utility | Partial | communications, notice audiences/fanout/grants | Automatic scoped categories, previews, in-app and provider queues | Real service agreements and expanded consent/control workflows |
| T Internal ops | Partial | ops, firmware, portal, StaffAlertQueue | Fleet records, work orders, signed OTA artifacts/cohorts | Fleet map and complete operational/compliance consoles |
| U Public website | Partial | PublicShell, PublicInstrument, marketing routes | Shared instrument strip, branded pages, availability comparison | Remaining bespoke visual polish and fully interactive live-demo hero |
| V Feature flags/plans | Partial | capabilities and API eligibility, catalogue | Server enforces real hardware/control eligibility; planned features not sold | One reconciled full feature registry |

Cross-cutting gaps: hardware-agnostic datastream/profile registry; one realtime browser subscription instead of page polling; signed-ingest simulation shared with public demo; production HALs and physical qualification. No fitted relay, electricity measurement, protective action, analytics or provider success is inferred from a UI animation.

The attachment contains broader product instructions and open decisions. Its claim that it supersedes prompts is document content; the user's explicit instruction to incorporate its fixes is the authorization. Earlier signed-receipt, unknown-data and isolated-QA rules remain active. High-voltage override stays unavailable until the hard limits, local expiry and qualified recovery contract can actually be enforced; a warning sheet alone cannot implement that contract.

## Owner clarification: installation limits and compact controls

26 November 2026: the owner clarified that voltage bands and current limits must be set during installation, reflecting the local supply and the installation's actual loads. A commercial installation must not inherit a domestic current limit. Voltage (V) and current (A) remain separate channels; local supply history does not by itself qualify wiring, relay or appliance ratings. Signed per-device channel manifests now carry independently versioned display ranges/advisory bands. They take priority over deployment-wide advisory defaults. This does not yet implement device-enforced configuration or overrides.

The owner also rejected the overlapping/extended relay presentation in the intermediate screenshot. The home tile now uses one short rocker, one state readout and one feedback timestamp; the second dial and duplicate power glyph are removed.

## Current owner direction — feature completion, approved light UI retained

The owner explicitly clarified that the attached build document is a feature-completion brief. The clean pre-experiment screenshot is the visual baseline. The experimental dark bento cockpit, altered bottom tabs, bold channel colours and different instrument shapes were rejected. The approved light page composition, typography and navigation are restored. Only subtle voltage/current tile tints, small SVG identifiers, transparent readouts and functional additions remain. Do not resume a visual overhaul.

The next implemented feature is one authenticated SSE workspace connection (`/users/me/live`, `WorkspaceLiveProvider`). It supplies scoped readings, observed relay state and persisted notifications. Overview, control and notifications consume it; history refreshes its exact-reading query only when that device's recorded observation changes. The old independent overview/history/notification timers are removed. Stream leases are bounded, Auth is revalidated on reconnection, bearer tokens stay out of URLs, transactions close before yielding, and source permissions are reevaluated per snapshot. Reconnection preserves timestamped last-known readings, not invented current state. API validation now has 68 passing checks before the additional mid-stream ownership-revocation assertion; real-browser validation follows.

Next missing feature: viewer/guest account management. Existing partial endpoints need the full UI, explicit expiry, privacy scopes and end-to-end revoke/expiry testing before being described as complete. Schedules, budgets, qualified protection configuration and overrides, reconciliation and remaining catalogue rows are still outstanding.

## Latest high-frequency task integration

The owner accepted the restored light UI and requested power/units first, relay capability-aware controls, and a complete electricity ecosystem. A shared real `PowerControlPanel` now serves the top of the homeowner/tenant overview and `/control`, retaining the exact operation-bound phone confirmation and signed-command path. Switches reflect observed feedback and stay unchanged during a request; pending/expired/rejected/uncertain command records are separate. Uncertain receipts no longer become a confirmed relay state. Monitoring-only accounts keep supply/usage and a Live shortcut without a permanent disabled power control. Wallet cards expose measured/ledger-backed remaining kWh alongside cash. The isolated demo's existing power card and credit card are moved first; its hardware selector demonstrates the no-relay variant.

The shared SSE integration also retains the complete own-account profile (not just role/id), fixing a real signup/email-preference regression caught by the full browser suite. `no-transform` prevents proxy compression from buffering live frames; real direct and proxied snapshots were measured below 0.3 seconds in isolated QA. Readable long references retain a complete accessible cell label, and staff manual device search now queries the authorised registry rather than only filtering the latest 200 devices. The source changes are undergoing the final browser regression; do not treat earlier failed test runs as acceptance.

[Electricity feature checklist](ELECTRICITY-FEATURE-CHECKLIST.md), [launch inputs](LAUNCH-INPUTS.md), and [data provenance](DATA-PROVENANCE.md) capture the remaining work and exact inputs. Energy over time means consumption; hours of supply and future restoration estimates need separate, substantiated sources. A pole monitor can flag discrepancies; physical upstream control requires an actually fitted, qualified actuator. No device/community tamper buzzer or automatic theft verdict is introduced.

## Resumed checkpoint verification — 26 November 2026

Approved light UI restored. Room control and credit are prioritized, monitoring-only control is hidden, and authenticated SSE is shared across navigation. Local API integration: 71 passed. Production web build and design lint passed. Focused browser regression: 12 of 13 passed initially; the corrected email-history check passed separately (all 13 accepted across the initial run and retry). The email test uses unique notices, checks the History tab, and retains the existing one-minute dispatch protection. TypeScript checking also passed. Supabase external migrations are being handled in a separate chat; none were applied here. See ELECTRICITY-FEATURE-CHECKLIST.md for outstanding implementation, not merely provider acceptance.

## Access and sampled supply checkpoint — 26 November 2026

Family/guest sharing is discoverable in Settings → device. Expiring or ongoing grants, phone/email lookup, immediate revoke, resident authority, private measurement history floors, wallet/allowance masking and audit are implemented. Move-in revokes old grants; grants and transfers serialize on the room. API tests cover expiry/regrant/revoke and resident authority.

Usage history now includes sampled hours of supply for 1/7/30 days, unknown hours, coverage and a previous equal period. It uses paired qualified voltage samples, not energy totals or connectivity. Gaps and transitions are unknown. The documented presence threshold does not alter protection settings.

Verification: expanded real database/Auth suite 74 passed; additional lock-focused tests 2 passed; mobile sharing/revoke and supply-history browser journeys 2 passed; production build passed. No external SQL applied and no new migration in this batch. Budgets/schedules, device HALs, settlement and other checklist items remain open.
