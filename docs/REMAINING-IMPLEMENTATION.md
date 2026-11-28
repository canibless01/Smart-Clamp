# SmartClamp remaining implementation and launch handoff

Implementation checkpoint: 27 November 2026; handoff finalized 28 November 2026 (Africa/Lagos). Branch `ui-revamp`. Latest implementation commit: **`d236215`**; preceding scheduler commit `4e59b92`, responsive/Auth-readiness commit `d3f6a2b`. New feature work was stopped at the owner’s request. This document records the stop point; it is not a production-ready declaration.

## Current facts

- All implementation through `d236215` is pushed. No account session-management changes were started after that commit; session inventory/sign-out-other-sessions remains A07.
- Full isolated API suite: **99 tests, 98 passed, one dedicated SMTP class skipped**. Main browser suite: **77 passed**, including the three-size responsive matrix. Final targeted UI checks: **4 passed**. Production web build and native/protocol checks passed.
- These are local software checks with labelled, signed QA fixtures. No physical relay operation, genuine merchant charge, live review-account creation or manual publication occurred.
- Local migrations are through **046**. The owner-relayed live Supabase receipt is through **039**. The actual external receipts remain in the other chat’s workspace and have not been read here.
- Target only: Supabase project `fmjzskjkvdbffwkiujnu`. No callable Supabase connector or configured remote administrative/runtime credentials were available in this implementation chat.
- It would be inaccurate to say only SQL and environment variables remain. The feature-code checklist below still contains unfinished work.

## Inventory counts

Counts describe requirements, not a completion percentage. Partial items mix implemented pieces with remaining code or acceptance; they are not all wholly missing features.

| Scope | Built | Partial | Stub | Missing | Total |
|---|---:|---:|---:|---:|---:|
| Launch | 60 | 85 | 3 | 40 | 188 |
| Deferred | 0 | 5 | 5 | 26 | 36 |

## Immediate next implementation priorities

- [ ] A07: account session list and sign out other sessions. Only preliminary inspection was done. Use verified provider semantics; never claim immediate invalidation of already-issued access tokens without evidence.
- [ ] Complete shared-meter/no-meter settlement and bill allocation with explicit participant agreements, real source balances, reviewed adjustments and no inferred resident debt.
- [ ] Implement recurring subscription lifecycle, auto-recharge mandates/consent/caps, cancellation, refunds/uncertain outcomes and provider-backed invoice reconciliation.
- [ ] Finish qualified runtime/protection settings and production hardware adapters after receiving the actual BOM/pins/feedback/network details. Do not invent hardware or certified limits.
- [ ] Complete wider transformer/pole/building topology, source-qualified correlations, scheduled reports, remaining account/privacy/compliance and minimum operations flows.
- [ ] Build guarded populated review-account provisioning and final role-by-role deployed acceptance. No fake Gmail mailboxes or unlabelled production measurements/credits.

## UI: implemented fixes and remaining acceptance

- [x] Approved light forest/sage design preserved; no dark/purple redesign or changed navigation.
- [x] Shared checkbox/radio geometry, shrinking selects/fieldsets, long-link wrapping, card spacing and evidence-rich support-grid overflow corrected.
- [x] Every App Router entry represented in the responsive matrix at 390/768/1440; some entries are guards, redirects or unavailable/not-found states.
- [x] Populated building investigation → scoped utility visibility → owner request → support claim → inspection creation checked in the browser, including mobile.
- [ ] Review all remaining populated/error/empty/long-content states manually. A route geometry check is not complete visual acceptance of every possible state.
- [ ] Finish any UI exposed by the unfinished features below, keeping the approved layout and discoverability.
- [ ] Perform actual deployment/browser/device acceptance, including intended mobile browsers/PWA/notifications, real provider flows and Lighthouse where required. Existing automated WCAG checks do not equal a production Lighthouse run.

See [responsive audit](ui-overhaul/RESPONSIVE-AUDIT-2026-11-27.md), [screen coverage](ui-overhaul/SCREEN-COVERAGE.md), and [changed files](ui-overhaul/CHANGED-FILES.md).

## Database, configuration and deployment still required

- [ ] Compare the live project’s migration names and SHA-256 values against the current checkout before applying anything. Relative to reported 039, pending development migrations are **040–046**. Do not reset the database or overwrite this branch’s 040 transport migration with the other chat’s conflicting draft sequence fix; the sequence fix here is 042.
- [ ] Use the checksum-tracked [project SQL bundle](deployment/fmjzskjkvdbffwkiujnu-bootstrap.sql) and [target instructions](deployment/SUPABASE-fmjzskjkvdbffwkiujnu.md) when execution is authorised. No external migration was performed by this chat.
- [ ] Configure and run the API and durable worker, database TLS/runtime credentials, canonical frontend/API origins and Next.js API proxy. Rebuild the frontend when changing rewrites/public variables. SQL alone does not host or connect these services.
- [ ] Configure Supabase Auth Site URL/allowlisted callbacks, email/password, Google OAuth, SMTP and phone SMS. Last owner-relayed live findings: localhost Site URL, no approved redirects, Google/phone disabled, SMTP unset. Recheck rather than assuming unchanged.
- [ ] Supply approved business rules, tariffs, subscription prices/discounts and report/advisory/comparison policies. Unknown prices stay unset. Configuration must never disable signatures, bypass scope or exceed hardware ratings.
- [ ] Activate/verify Paystack and electricity vending, Resend/OneSignal application email, push, application SMS and their genuine delivery/webhook outcomes. Supabase identity SMTP/SMS is separate from application notices.
- [ ] Provision unique device credentials, CA/network/topology, report/OTA signing keys and physically qualify the exact production hardware and OTA recovery.
- [ ] Provide approved legal/company/story/contact imagery, external utility agreements and compliance evidence. Do not claim certification or provider acceptance from local tests.

Exact names and separation of Auth-only versus full readiness: [launch inputs](LAUNCH-INPUTS.md) and [configuration inventory](CONFIGURATION-INVENTORY.md). A project URL/anon/service-role HTTP key is not a SQL administration credential.

## Complete unfinished launch checklist

This section includes every Launch requirement whose canonical status is Partial, Stub or Missing. The stated remainder comes directly from the curated register; source IDs make it traceable to the original documents.

### A. Accounts and account lifecycle

- [ ] **A06 — Role cards, invite-forced tenant role, enabled role discovery (Partial).** Customer role cards exist; finish invite-forced role/feature discovery before redirect. Deferred agent/referrer roles now default off server-side.
- [ ] **A07 — Session/device list and sign out other sessions (Missing).** Session inventory, owner-scoped revoke, UI and tests.
- [ ] **A08 — Rate limits, lockout and security messaging (Partial).** Unify configurable bounded limits and genuine lockout states across all entry points.
- [ ] **A10 — Populated real review accounts for all roles (Missing).** Build guarded staging account/data provisioning, secure credential output and role journey matrix; no live fake metrology or real charges.

### B. Configuration, entitlements and rollout

- [ ] **B01 — Server feature flags and capability checks (Partial).** Complete per-building/per-organisation overrides and uniform enforcement on every gated handler.
- [ ] **B03 — Subscription prices and frequencies (Partial).** Approved monthly NGN prices are configurable and shown publicly; subscription cadence/product mapping and paid checkout remain unimplemented.
- [ ] **B04 — Discounts, grace and retention rules (Partial).** Typed scoped quarterly/yearly discounts and grace settings exist; subscription application and retention workflow remain unimplemented.
- [ ] **B06 — Installation protection profiles and approved ranges (Partial).** Separate install-approved limits from display bands; eliminate fixed production protection values.
- [ ] **B07 — Drift windows and privacy thresholds (Partial).** Typed scoped comparison gap, boundary skew and tolerance rules exist; persistence windows, calibrated approval workflow and aggregate privacy cohorts remain unimplemented.
- [ ] **B08 — Alert repeat, quiet hours and report lifetime rules (Partial).** Report link lifetime is scoped/versioned; alert repeat/escalation intervals still need configuration.
- [ ] **B10 — Per-environment defaults with validation (Partial).** Document existing vs proposed keys; missing paid prices remain unset; enforce security/rating bounds.

### C. Device identity, topology and capabilities

- [ ] **C02 — One-time installer key delivery/bootstrap (Partial).** Secure BLE/bootstrap identity and one-time browser delivery with durable installation acknowledgement.
- [ ] **C03 — Device profile and fitted channel manifest (Partial).** Complete hardware role/relay/voltage/uplink declaration and qualified production adapters.
- [ ] **C04 — Room/building/pole/transformer topology registry (Partial).** Landlord-scoped versioned building comparison topology editor is built: immutable interval history, CAS/idempotency, cross-building rejection and audit. Full pole/transformer/meter-source migration, provisioning association and physical wiring qualification remain open.
- [ ] **C07 — Hardware-agnostic adapters and configuration (Partial).** Approved BOM/pins and actual metrology/actuator/GSM/link adapter instantiation.
- [ ] **C08 — Months of durable offline readings and catch-up (Partial).** Qualified storage sizing/wear, outage hold-up and long-duration/backfill testing.
- [ ] **C09 — Device lifecycle and firmware provenance (Partial).** Manufacture batch, install/safety identities and complete lifecycle query/UI.

### D. Daily dashboard and measured history

- [ ] **D05 — Historical charts, counter labels and exact readings (Partial).** Pagination, zoom/brush, compare usage periods and event-window links.
- [ ] **D07 — Source-backed peaks, daily/monthly energy and typical-hour comparison (Partial).** Complete aggregation/coverage and comparison UI without inventing gaps.
- [ ] **D08 — First-link onboarding/checklist and sensory sequence (Partial).** Real account first-run state, checklist persistence and reported-data-only welcome progression.
- [ ] **D09 — Unified meter-only, clamp-only and combined account view (Partial).** Meter-only history/manual entries in one source-aware dashboard; no voltage/relay invented for meter-only accounts.
- [ ] **D10 — Capability-specific voltage/current absence states (Partial).** Audit every unsupported sensor tile and show unavailable once; never infer fitted hardware.

### E. Relay control and actuation integrity

- [ ] **E03 — Latching driver interlocks, feedback and durable intent (Partial).** Instantiate qualified hardware adapters; electrical and reboot failure testing.
- [ ] **E04 — Independent protection/wallet/budget/schedule/manual restrictions (Partial).** Integrate all policies and receipts into the actual application; no automatic clearing of unrelated reasons.
- [ ] **E05 — Current resident owns write/financial authority (Partial).** API scope tests and full browser regression passed; production account/device acceptance remains.
- [ ] **E06 — Maintenance-only landlord bulk actions (Missing).** Consent/notice, scoped step-up, per-room requests/receipts; no rent or punitive action.
- [ ] **E07 — Last relay events with source and actor (Partial).** Include local schedule/budget/protection receipts, not only manual cloud commands.

### F. Offline schedules and budgets

- [ ] **F01 — Daily/monthly durable offline budget engine (Partial).** Qualified store/counter/clock/actuator application integration and physical acceptance.
- [ ] **F02 — Weekly offline allowed windows and manual-OFF rule (Partial).** Templates/grid editor, per-trigger execution receipts and full runtime integration.
- [ ] **F03 — Versioned action-confirmed cloud settings (Partial).** Cloud/UI/configuration receipt path tested; qualified runtime execution and per-trigger feedback remain unfinished.
- [ ] **F04 — Signed poll offer and configuration receipts (Partial).** Commissioning image truthfully rejects unqualified execution; qualified firmware must actually apply/journal policy.
- [ ] **F05 — Extra daily allowance and midnight/month reset (Partial).** Device-reported remaining units, reset events and physical receipts; wallet funding remains separate.
- [ ] **F06 — 80/100 percent alerts and budget progress (Missing).** Signed live policy state, threshold transitions and source-backed remaining allowance.
- [ ] **F07 — Schedule templates, preview and hours saved (Missing).** Templates/preview; saved-hours calculation requires trustworthy relay+supply intervals.
- [ ] **F08 — Handover disables old policy and reanchors new resident (Partial).** Native/API handover and new-subject anchor tests pass; real hardware acceptance remains.

### G. Protection, override and appliance guidance

- [ ] **G02 — Installer-approved physical operating limits (Partial).** Replace fixed reference thresholds with validated signed installation profiles.
- [ ] **G03 — Alert-only/auto-cut/auto-restore protection modes (Missing).** Persist, step-up, signed sync, offline enforcement and receipts; monitoring-only devices have alert settings only.
- [ ] **G04 — Stable-window restore and reported countdown (Partial).** Device-reported stable interval and qualified restoration receipt; do not timer-confirm switching.
- [ ] **G05 — Low-voltage bounded override (Missing).** Risk sheet, acknowledged appliance guidance, step-up, signed timebox and local expiry/hard-floor enforcement.
- [ ] **G06 — High-voltage strict bounded override (Missing).** Stronger warning/hold-or-type confirmation, approved hardware envelope, expiry/recovery and receipts.
- [ ] **G07 — Current/power overload and spike policy (Partial).** Qualified load thresholds/dwell and current/power trip receipts.
- [ ] **G08 — Appliance inventory and sensitivity guidance (Missing).** User appliance list, guidance rules and event-specific checklist; no appliance identification guessed.

### H. Electricity wallet and payment lifecycle

- [ ] **H05 — STS delivery, key-change tokens and entry acknowledgement (Partial).** Actual meter compatibility/entry evidence and external STS certification; no certification claim.
- [ ] **H06 — Duplicate/failed/pending/reversed payment outcomes (Partial).** Complete provider reversal/refund lifecycle and visible reconciliation cases.
- [ ] **H07 — Automatic recharge with consent and caps (Missing).** Verified reusable mandate, durable charge identity, limits, pause/cancel, uncertain reconciliation and user UI.
- [ ] **H08 — Subscription collection separate from electricity (Stub).** Paid checkout, verified plan invoices, grace, downgrade/cancel and history; never cut power on lapse.
- [ ] **H09 — Payment receipts and billing export (Partial).** Complete PDF/Excel/payment receipt delivery and provider-specific refunds.
- [ ] **H10 — Dual tariff and transparent monthly bill (Partial).** Time-qualified tariff splits and bill UI; supplied rates must be approved.
- [ ] **H11 — Low credit percentage, zero and restored allowance loop (Partial).** Configurable percentage reference; qualified local cutoff/restore receipts and user warnings.
- [ ] **H12 — Days-left estimate and reminders (Partial).** Measured-coverage pace estimate and dedicated administrative reminder actions.

### I. Shared housing with a central meter

- [ ] **I04 — Resident transfer, viewer revoke and settled balance guard (Partial).** Finish qualified handover/late usage handling, disputed legacy balances and physical release receipts.
- [ ] **I05 — Central supply credit versus tenant liability ledger (Missing).** Source-backed physical meter balance, room credit totals and supply shortfall view.
- [ ] **I06 — Aligned central-versus-room energy reconciliation (Partial).** Qualified comparisons and an immutable residual evidence register are built; a residual is not a financial charge. Physical topology qualification, approved unaccounted-energy settlement and source/utility adapters remain open.
- [ ] **I07 — Neutral building shortfall alert (Missing).** Notify participants with measured source and coverage; no room accusation.
- [ ] **I08 — Optional joint purchase allocation (Stub).** Production explicit payer allocation, actual vend units, per-beneficiary receipts and idempotent ledger; not the default independent-purchase model.

### J. No-meter pooled settlement

- [ ] **J01 — Whole-building and per-room measurement view (Missing).** Qualified upstream measurement, topology and scoped totals with coverage.
- [ ] **J02 — Provisional self-loading price formula (Missing).** Use actual bill/qualified energy inputs, confidence, correction date and pass-through explanation.
- [ ] **J03 — Running balance and per-bill settlement modes (Missing).** Both ledgers/views, versioned per-building mode and transition rules.
- [ ] **J04 — Pooled contributions versus utility amount due (Missing).** Bounded participant funding, deadline, liability, shortfall and receipt states.
- [ ] **J05 — Human utility payment and evidence confirmation (Missing).** Landlord external payment, evidence review and exact settlement; no assumed automated NEPA API.
- [ ] **J06 — Price correction and disputed allocation (Missing).** No silent retroactive debit; attributable adjustment proposal and agreed allocation.
- [ ] **J07 — Upstream actuator option and bypass limits (Missing).** Capabilities must describe physical control; a pole sensor is not a utility meter or cutoff.

### K. Signals, reconciliation and investigation

- [ ] **K03 — Reading hash chain and integrity surface (Partial).** Dedicated verified chain traversal/UI; distinguish integrity from metrology accuracy.
- [ ] **K04 — Topology chain with aligned numbers/coverage (Partial).** Qualified building incoming/branch values and evidence are implemented. Full transformer/pole/building/room chain, source provisioning and multi-level break visualisation remain unimplemented.
- [ ] **K06 — Relay/current and zero-balance correlation (Missing).** Qualified feedback/current/time alignment; missing source stays unknown.
- [ ] **K07 — Partial bypass and neighbour-pattern review (Missing).** Validated statistical flags, no suspect naming, contested period and inspection flow.
- [ ] **K08 — Enclosure/clamp removal/loose-contact signals (Partial).** Actual fitted sensors/classifier qualification; no inference from ordinary zero load alone.
- [ ] **K09 — Cell-tower relocation and SIM provider anomalies (Missing).** Signed modem baseline/provider webhook, confirmation, step-up reset and owner/ops view; tower handover alone is not theft.
- [ ] **K10 — Ranked inspection evidence and disputed shortfall (Missing).** Evidence-ranked reasons, scoped visibility, agreed loss allocation and no punitive cutoff.

### L. Reports and verified records

- [ ] **L05 — Scheduled report delivery (Missing).** Period scheduler, source readiness, issue once, purpose/channel consent, retries and history.
- [ ] **L06 — Verified payment-and-usage record page (Missing).** Own verified records only, purpose-named revocable consent and signed export.
- [ ] **L07 — Upstream alignment and chain evidence in report (Partial).** Actual reconciled chain numbers/status and source qualification; never fabricate verification.

### M. Disputes and resolution

- [ ] **M03 — Automatic measured-period evidence attachment (Missing).** Attach reports/readings/quality and source provenance at case creation.
- [ ] **M04 — Contest allocation without power consequences (Partial).** Durable disputed-amount hold and scoped review; no rent/punitive restriction.
- [ ] **M05 — Propose/counter/accept instalment plan (Missing).** Versioned agreement, instalment schedule, payment linking, fulfilled/missed states and audit.
- [ ] **M06 — Agreed corrections, refunds and evidence exports (Partial).** Reviewed balanced monetary reversals and evidence pack export; never rewrite ledgers.

### N. Notifications and sensory experience

- [ ] **N09 — Full event catalogue and expiry/clear/escalation rules (Partial).** Budget/schedule/overload/reconciliation/SIM/retention events and configurable lifecycle.

### O. Public site, help and access

- [ ] **O02 — Plans and hardware-required/available disclosures (Partial).** Wire configured products/entitlements; do not sell unimplemented features.
- [ ] **O04 — Connection help and service connectivity test (Partial).** Working scoped browser/API/device/supply diagnostic rather than a generic online claim.
- [ ] **O05 — Installation, safety, glossary and FAQ help (Partial).** Approved electrical safety copy and complete readings glossary.
- [ ] **O07 — Hardware/IR installation request and cancellation (Partial).** Scheduling, installer contact, retrofit type, warranty and completion flow.
- [ ] **O09 — Legal pages, footer and data-rights requests (Partial).** Approved final legal copy, retention/export/deletion workflow.

### P. Access, consent and personal settings

- [ ] **P03 — Viewer read/access audit (Partial).** Record scoped viewer reads/exports, not only grant/revoke events.
- [ ] **P04 — Unified consent centre (Partial).** Own legal acceptances, audited channel changes, optional-channel withdrawal, shared-viewing inventory and recipient self-revocation are built. Purpose-specific analytics/verified-record sharing remains unimplemented; issued viewing grants are managed on each device.
- [ ] **P08 — Account export/retention/deletion requests (Missing).** Verified request, retention/legal holds and auditable fulfilment.

### Q. Landlord and property management

- [ ] **Q02 — Attention-sorted rooms, collections/owed indicators (Partial).** Use appropriate bill data; do not reveal private tenant wallet or invent debt.
- [ ] **Q03 — Tenant assignment, invites and transfer (Partial).** Current resident authority, pending usage and automation clearance guards are WIP locally tested.
- [ ] **Q04 — Administrative reminders and recharge on behalf (Partial).** Dedicated clear actions; pass-through only; tenant scope maintained.
- [ ] **Q05 — Building integrity and inspection list (Missing).** Aligned totals, gap trace, supply-vs-liability and evidence-ranked inspection.
- [ ] **Q06 — Landlord audit/export and scoped usage reports (Partial).** Separate authorised aggregate reports from public sharing of a tenant’s private device report.
- [ ] **Q08 — Building alert thresholds and maintenance bulk workflow (Missing).** Scoped threshold editor, notice/consent and per-room actuation receipts.

### R. Installer and safe commissioning

- [ ] **R02 — BLE/local setup transport adapter (Missing).** Secure pairing, identity, uplink/peer settings, bootstrap and recoverable installation flow.
- [ ] **R03 — Signal/sensor/clock/relay diagnostic receipts (Partial).** Actual on-device tests and diagnostic UI; never fabricated pass lamps.
- [ ] **R04 — Signed physical safety checklist (Missing).** PPE, tools, qualified electrician, de-energisation confirmation and immutable sign-off before commissioning.
- [ ] **R05 — Commissioning and first authenticated online confirmation (Partial).** Qualified diagnostics + safety + scope approval; heartbeat alone cannot certify a safe install.
- [ ] **R06 — Network path setup and visible support facts (Partial).** Actual ESP-NOW peer/RS485 bus/GSM adapter setup and UI.
- [ ] **R07 — Retrofit installation, training and verification (Partial).** Retrofit job type, qualification record and hardware acceptance.

### S. Payment/provider and non-smartphone channels

- [ ] **S04 — Bank transfer with attributable device reference (Partial).** Actual provider-issued bank details and reference reconciliation; no fabricated account number.
- [ ] **S06 — IR supported-meter reading and setup (Partial).** Qualified optical protocol/reader HAL and source-aware meter history.
- [ ] **S07 — Manual meter reading with photo provenance (Partial).** UI, optional safe attachment, history/dispute/report propagation; always manual-labelled.

### T. Utility and NEPA workspace

- [ ] **T04 — Regional aggregate supply and consumption overview (Missing).** Transformer/pole totals, coverage and privacy-safe comparisons.
- [ ] **T05 — Utility-control consent centre and named capabilities (Stub).** Explicit per-organisation consent, revoke, disclosures and one hardened command entry path.
- [ ] **T06 — Consent-bound individual utility commands (Missing).** Staff step-up, capability/contract/consent checks, immediate customer notice, signed receipt and blocked-attempt audit.
- [ ] **T07 — Utility bill generation and consumed-data verification badge (Missing).** Source-backed bill marker and evidence the utility actually consumed data; no theoretical verified badge.
- [ ] **T08 — Disconnection list report only (Missing).** Overdue/region filters, review/download/audit; no bulk disconnect action.
- [ ] **T09 — Every utility view/export and blocked action audit (Partial).** Extend audit to all new scoped aggregate, bill, export and command handlers.

### U. Internal operations panels A–M

- [ ] **U01 — A Fleet/contact/qualification/profile/firmware views (Partial).** Map, lifecycle/batch, firmware distribution and outage frequency.
- [ ] **U03 — B Alert/tamper queue, response time and false positives (Partial).** Scoped cross-fleet feed, review outcomes, device completeness score and response metrics.
- [ ] **U04 — C Onboarding and basic adoption (Partial).** Time-series cohort adoption and tier movement from genuine data.
- [ ] **U06 — D Reconciliation and outstanding wallet liability (Partial).** Exact liability/revenue summaries and discrepancy cases; no invented financial metrics.
- [ ] **U08 — E Support/dispute metrics and review ownership (Partial).** Resolution-time and deployment-type summaries; existing case workflow retained.
- [ ] **U09 — F Error, communication, webhook and OTA exceptions (Partial).** Unified sanitised exception records and operator resolution UI.
- [ ] **U10 — G Compliance statuses, evidence and expiry warnings (Missing).** Track data protection, STS, pole access, utility agreements and next action; never claim certification.
- [ ] **U11 — H Field dispatch, diagnostics, RMA and decommission (Partial).** Complete lifecycle/decommission and documented safety/commissioning prerequisites.
- [ ] **U13 — J Real feature/rules editor (Missing).** Typed global/tier/building/organisation controls, effective versions and rollback; see B.
- [ ] **U14 — K Staff access/export audit (Partial).** Cover every staff read/export and add a scoped query/export UI.
- [ ] **U17 — Reviewed manual pilot allocation tools (Missing).** Balanced attributable QA/pilot adjustments separated from real-money vending, permissions, reason and audit.

### Z. Launch, QA, deployment and truthful review

- [ ] **Z01 — External migrations and immutable checksums (Partial).** Owner reports 001–039 externally verified. Pending development migrations stay local until one final bundle.
- [ ] **Z02 — Browser sequence privilege fix (Partial).** Locally tested; include in final consolidated migration, not the other chat’s conflicting draft 040.
- [ ] **Z03 — Live Auth/SMTP/Google/SMS and redirect configuration (Partial).** Other chat reports SMTP unset, Google/phone disabled, localhost Site URL and no redirects; configure approved deployment values.
- [ ] **Z04 — Backend database TLS/API/worker and preview access (Partial).** Production API/worker credentials, health and routing unverified; protected Vercel preview prevents user testing.
- [ ] **Z05 — Real ESP production HAL and hardware acceptance (Missing).** Approved BOM/pins, sensing, actuator feedback, GSM, RS485/ESP-NOW, BLE and outage persistence; native libraries are not complete firmware.
- [ ] **Z06 — OTA signed artifacts, staged rollout and rollback (Partial).** Direct Wi-Fi commissioning path exists; actual GSM/relayed resumable OTA and physical rollback qualification remain.
- [ ] **Z07 — Isolated simulator and full-loop review data (Partial).** Real connected review accounts need safe data/environment isolation and secure admin access; no silent fake production readings.
- [ ] **Z08 — Viewport, accessibility, keyboard and reduced-motion QA (Partial).** Repeat relevant final journeys at 390/768/1440; no blanket pass for untouched screens.
- [ ] **Z09 — Configuration/provisioning and one final launch handoff (Partial).** Final exact environment/settings/SQL/account/provider/hardware checklist after implementation; no repeated interim SQL requests.
- [ ] **Z10 — Backups, rollback/recovery and data-rights operations (Partial).** Document/verify database restore, provider uncertainty, key rotation and operational runbooks.
- [ ] **Z11 — Security invariants and launch scope enforcement (Partial).** Finish review of every new flow; cryptographic checks and physical rated limits are not arbitrary editable business rules.

## Acceptance still attached to implemented launch paths

Built means the named software path exists, not that real providers, hardware or deployment are accepted. Keep these stated boundaries alongside the code checklist.

- [ ] **A01 — Phone and email/password signup, login and verification.** Live project phone provider is disabled; configure and verify real handset/inbox delivery.
- [ ] **A02 — Google PKCE signup/login and profile completion.** Google credentials and approved redirects need live acceptance.
- [ ] **A03 — Explicit versioned terms/privacy acceptance.** Replace provisional legal text/version with approved copy.
- [ ] **A04 — Verified contact enrollment and account recovery.** Live SMTP/SMS acceptance; local real GoTrue/SMTP OTP checks pass.
- [ ] **A05 — Persistent refresh, logout and private-route guards.** Deployed API/session acceptance and browser/device coverage.
- [ ] **A09 — Action-bound step-up verification.** Live SMS provider acceptance; retain distinct hashes per sensitive action.
- [ ] **B02 — Versioned audited configuration editor.** Typed setting registry and administrator editor; immutable scope versions, CAS, effective dates, restore-as-new-version and old/new audit. Provider approval remains external.
- [ ] **B05 — Configurable payment markup/fees and tariff provenance.** Scoped audited fee/markup rules resolve into immutable quotes with rule-version provenance. Approved actual values and provider acceptance remain external.
- [ ] **C01 — Unique factory credentials and hashed customer claims.** Secure operational issuance and physical identity acceptance.
- [ ] **C05 — Signed device ingest, deduplication and replay checks.** Physical secure key storage and recovery qualification.
- [ ] **C06 — Signed polling, trusted-time binding and epochs.** Physical clock drift, power-loss and key-rotation acceptance.
- [ ] **D01 — Approved light dashboard and familiar navigation.** Keep current appearance; no repeated visual redesign.
- [ ] **D02 — Room power and credit priority; monitoring-only variant.** Physical relay/credit acceptance and current high-priority browser checks.
- [ ] **D03 — Power/voltage/current gauges, traces and unknown states.** Hardware qualification and full installation scale coverage.
- [ ] **D04 — Shared authenticated live stream.** Production streaming capacity; finish non-core role dataset live updates.
- [ ] **D06 — Sampled supply hours and unknown coverage.** Continuous qualified device supply-duration acceptance; do not equate kWh with uptime.
- [ ] **E01 — Operation-bound manual request and phone confirmation.** Deployed phone/provider and physical device acceptance.
- [ ] **E02 — Signed receipt-only ON/OFF and explicit uncertain/expired states.** Extend equivalent physical receipts to local protection/schedule/budget transitions.
- [ ] **G01 — Installation-specific voltage/current display advisories.** Production manifest/calibration acceptance; display bands do not configure protection.
- [ ] **H01 — Private unit/cash/reserved balances and immutable ledgers.** Real merchant/physical prepaid qualification; occupied-room owner privacy tightening is WIP.
- [ ] **H02 — Itemized frozen quote, fees and destination.** Live tariff/catalogue/merchant configuration.
- [ ] **H03 — Paystack checkout, verified callback and reconciliation.** Actual merchant credentials, live transactions and callback deployment.
- [ ] **H04 — VTPass vending/requery and actual delivered units.** Real merchant/device acceptance; no claim meter loaded merely from account payment.
- [ ] **I01 — Building/room creation and existing central meter setup.** Physical meter/room mapping and provider acceptance.
- [ ] **I02 — Independent tenant purchases and own-room measured debit.** Live central meter prepaid reconciliation; each payer funds its own device, not a landlord resale wallet.
- [ ] **I03 — Room invitation and scoped occupancy.** Current handover authority/accounting changes need final regression.
- [ ] **K01 — Authenticated tamper/protection log and packet evidence.** Physical source acceptance; signed symptoms never prove theft.
- [ ] **K02 — Resident/utility scoped review and inspection handoff.** Signed-signal and persistent-building-difference review paths are implemented. Physical field findings, authority/contract acceptance and full closed-case evidence policy remain external.
- [ ] **K05 — Persistent drift confirmation engine.** Qualified building drift review, owner opt-in, worker catch-up, scoped utility notices, claimed support inspection and closure/reopen paths are implemented. Physical sensor/wiring qualification and live utility/provider acceptance remain external; wider topology chain is tracked under K04.
- [ ] **L01 — Signed immutable completed-period measurement snapshot.** Production signing key custody and hardware-derived evidence acceptance.
- [ ] **L02 — CSV, signed JSON evidence and independent verification.** Consumer must establish issuer key trust independently of embedded key.
- [ ] **L03 — Local QR, seven-day share, expiry and revoke.** Configurable approved lifetime; printed/downloaded copies cannot be recalled.
- [ ] **L04 — Print/save PDF with qualification and QA provenance.** Manual browser export acceptance on supported devices.
- [ ] **M01 — Scoped dispute records, finance review and immutable bill evidence.** Production workflow acceptance; no monetary adjustment is implied by case closure.
- [ ] **M02 — Meeting Mode.** Accessibility/real-user acceptance; preserve disputed scope.
- [ ] **N01 — Canonical recorded event bus and presentation.** Expand catalogue only with genuine data-layer event sources.
- [ ] **N02 — Opt-in sound/haptics, mute, volume and quiet hours.** Actual browser/OS/handset acceptance.
- [ ] **N03 — Acknowledge/snooze/history and delivery honesty.** Complete filter chips/deep links, accessible badge counts and escalation policy.
- [ ] **N04 — In-app, Web Push and OneSignal push.** Live provider/browser delivery and OneSignal feedback acceptance.
- [ ] **N05 — SMS notifications and uncertainty-safe dispatch.** Live sender, consent and handset acceptance.
- [ ] **N06 — Resend to OneSignal email routing and quota.** Live providers/inbox acceptance; owner chose 100/day, provider boundaries remain explicit.
- [ ] **N07 — Signed email feedback, suppression and reconciliation.** Live callback delivery and OneSignal-specific delivery feedback.
- [ ] **N08 — Automatic region/owing/category staff audience.** More scoped categories/coverage and deployed sender acceptance.
- [ ] **O01 — Home, how-it-works, audience and device pages.** Approved story/images/product facts and concise feature availability copy.
- [ ] **O03 — Anonymous meter validation with masked identity.** Live provider acceptance. Full customer name/address is not exposed anonymously despite source example.
- [ ] **O06 — Support requests, replies and electrical emergency notice.** Attachments, SLA/escalation rules and deployed delivery.
- [ ] **O08 — Public device view with deliberate payment destination.** Printed device QR, approved publication policy and no personal history/tamper leakage.
- [ ] **O10 — Isolated interactive walkthrough and screenshots.** Retain separately from real review accounts; never treat sample readings as physical evidence.
- [ ] **P01 — Family viewer and expiring guest management.** Live account acceptance; preserve read-only finance/control boundaries.
- [ ] **P02 — Viewer grant floor, expiry/revoke and resident authority.** Current occupied-room authority changes need final browser regression.
- [ ] **P05 — Personal profile and source-aware settings.** Complete missing source/policy links without changing approved navigation.
- [ ] **P07 — PWA install/offline shell and reconnect honesty.** Deployed install/browser push acceptance; never cache private account data in shared offline assets.
- [ ] **Q01 — Building list and per-room measured monitoring.** Physical source and occupancy acceptance.
- [ ] **R01 — Assigned jobs and versioned field workflow.** Live field/evidence acceptance; completion is not proof of calibrated hardware.
- [ ] **S01 — Provider adapter boundary and allowlisted utilities.** Complete supported providers without fake success fallbacks.
- [ ] **S08 — Meter linking states and no-live-balance honesty.** Provider/reader physical acceptance; account validation is not optical connectivity.
- [ ] **T01 — Provisioned role, membership and contracted device scope.** Live scope/contract acceptance; no self-assigned utility role.
- [ ] **T02 — Scoped signal queue and review requests.** Extend region aggregates and consent-gated drill-down; keep customer identity excluded by default.
- [ ] **T03 — Reviewed utility service messages and audience history.** Real sender/contract/customer opt-in acceptance.
- [ ] **U02 — A Reported modem counters, RSSI and observed traffic.** Production GSM HAL; carrier-plan cap/billing adapter. Stored JSON size is not SIM traffic.

## Deferred requirements — remain off

These are retained requirements, not silently removed or launch promises. The owner approved deferral of agents/referrers/commissions, installer payout automation, white-label, advanced growth/finance analytics, water/gas/accessories and expanded inventory/business trackers.

- [ ] **B09 — Role and payout programme switches (Partial).** Deferred agent/referrer signup remains unavailable through typed registry; programme/training/payout implementation remains deferred.
- [ ] **G09 — Linked smart-plug turn-off action (Stub).** Partner adapter, consent, state receipts and actual accessory availability.
- [ ] **I09 — Generator contribution sharing (Missing).** Approved participant allocation, fuel evidence, contribution ledger and visible consent.
- [ ] **K11 — Neutral public/community alert policy (Missing).** Privacy-safe aggregation and review/abuse handling; room naming remains disabled pending an explicit policy decision.
- [ ] **P06 — Language and cosmetic dark-mode choice (Missing).** Localisation and optional theme, preserving approved green default.
- [ ] **Q07 — Multi-property portfolio summaries (Partial).** Actual portfolio aggregates/switcher; no landlord electricity-resale revenue.
- [ ] **R08 — Installer earnings and payout-trigger records (Missing).** Approved payable ledger only after configured verified prerequisites; no payment on a random heartbeat.
- [ ] **S02 — Additional OPay/Flutterwave channels (Missing).** Verified initialization/callback/requery/refund adapters and configuration.
- [ ] **S03 — USSD Buy Units and tier-aware Check Balance (Missing).** Provider adapter, session state/PIN rules, idempotent payment and SMS response.
- [ ] **S05 — Manufacturer meter balance/control adapters (Missing).** Per-manufacturer interface, authorised contract/key handling and genuine result states.
- [ ] **U05 — C Acquisition attribution/CAC/leaderboards (Missing).** Requires explicit attribution, spend sources and approved programmes.
- [ ] **U07 — D Burn/runway/payback economics (Missing).** Approved external finance/cost sources and definitions.
- [ ] **U12 — I Inventory, suppliers and re-costing (Missing).** Stock ledger, reorder alerts, suppliers/lead times and approved cost inputs.
- [ ] **U15 — L Regional expansion tracker (Missing).** Region adoption, tariff differences and relationship records.
- [ ] **U16 — M Vendor/partner/contractor tracker (Missing).** Telco/payment/contractor status and caps; evidence-backed portfolio view.
- [ ] **V01 — Enabled-role applications and referral code issuance (Stub).** No live referral implementation; role flags and approval workflow required.
- [ ] **V02 — Attributable signups and conversion funnel (Missing).** Persist invite/code attribution with abuse controls and source-qualified conversions.
- [ ] **V03 — Accrued versus paid commission ledger (Stub).** Rule-version snapshots, reversals and balanced payable accounting.
- [ ] **V04 — Scheduled payable review and disbursement (Missing).** Weekly/monthly configurable batches, approved beneficiary, provider reconciliation and audit.
- [ ] **V05 — Installer/agent/referrer dashboards and earnings (Partial).** Only installer jobs work today; role-specific programme pages remain deferred.
- [ ] **W01 — Bill forecast and confidence/coverage (Missing).** Current approved tariff plus sufficiently complete measured history; labelled estimate.
- [ ] **W02 — Pattern-study heat map and habits (Missing).** Qualified 24x7 usage aggregation with honest gaps.
- [ ] **W03 — Appliance fingerprints with confidence (Missing).** Validated model/source hardware; no appliance guesses as facts.
- [ ] **W04 — Qualified power factor (Partial).** Uplink/storage/profile capability and UI require simultaneous calibrated V/I data.
- [ ] **W05 — Under-supply credit statement estimate (Missing).** Qualified outage hours plus approved method; not an entitled utility refund.
- [ ] **W06 — Anonymous same-pole peer comparison (Missing).** Server aggregates, cohort/quality minimum, distribution, own marker and period views.
- [ ] **W07 — Alignment score, not accuracy certification (Missing).** Aligned upstream evidence and coverage; score must not be marketed as electrical accuracy.
- [ ] **W08 — Dismissible savings recommendations (Missing).** Source-backed kWh/naira estimates and persisted dismiss state.
- [ ] **W09 — Advanced model adapter with simple fallback (Missing).** Same API, model version/confidence and history-based fallback; no fabricated output.
- [ ] **X01 — Organisation branding lookup (Partial).** Load-time subdomain branding is not wired into every shell.
- [ ] **X02 — Scoped organisation administrator console (Stub).** Provisioned organisation admins, branding/plan editing and scoped ops.
- [ ] **X03 — Organisation isolation across all data (Missing).** Explicit organisation keys, scoped API/RLS, migration and cross-organisation adversarial tests.
- [ ] **X04 — SmartClamp Socket/accessory role (Missing).** Real approved hardware profile, registration/readings/control path and manufacturer acceptance.
- [ ] **Y01 — Provider adapters and payment-only utility selector (Stub).** Actual provider validation/vending adapters; default disabled.
- [ ] **Y02 — Source-aware per-utility wallet/history/disputes (Missing).** Payment-only fields, utility-specific units and approved fees.
- [ ] **Y03 — Multi-utility tabs without electrical instruments (Missing).** Show only linked/enabled utilities; no voltage/relay/tamper invention for water/gas.

## Resume and verification references

- Start with [NEXT-CHAT-PROMPT.md](NEXT-CHAT-PROMPT.md), this handoff, [BUILD_STATUS.md](BUILD_STATUS.md), and the canonical [complete-register.json](implementation/complete-register.json). Newest checkpoint notes override historical entries.
- Change the canonical JSON when a requirement genuinely changes, then run `tools/render_build_register.py`. Do not turn Partial into Built merely because a page or table exists.
- Latest detailed proof: [energy investigations](verification/2026-11-27-energy-investigations.md), [responsive/Auth checks](verification/2026-11-27-responsive-auth.md), and [closed-window evidence](verification/2026-11-27-energy-history.md).
- Preserve signed-receipt-only physical ON/OFF, unknown/stale values, isolated-QA provenance, opt-in sound, current ownership/viewer/utility scope, immutable evidence and independent protection reasons.
- Push verified checkpoints normally to `ui-revamp`; no force push, reset, manual publication or provider messaging was authorised as part of this stop-and-record request.
