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
