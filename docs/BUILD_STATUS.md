# Complete SmartClamp build register

Updated 2026-11-27 (Africa/Lagos). 224 curated requirements across A–Z. This is the authoritative current register; [historical status](BUILD_STATUS-HISTORY-2026-11-27.md) is retained separately.

The owner approved a focused electricity launch. Deferred requirements remain in this inventory, with flags off and no claim of launch availability. Preserve the approved light UI and familiar navigation. Status describes the named software path, not provider approval, certification, hardware qualification or live deployment.

**Built:** described software path exists and has local evidence. **Partial:** working pieces exist but the complete flow/acceptance is unfinished. **Stub:** schema/page/gate exists without full execution. **Missing:** execution is not implemented. Verified Git checkpoints do not imply production hardware readiness.

The machine-readable source is [complete-register.json](implementation/complete-register.json). [Work packages and scope decisions](IMPLEMENTATION-WORK-PACKAGES.md) explain how another chat can contribute without migration collisions. [Configuration inventory](CONFIGURATION-INVENTORY.md) distinguishes existing settings from required future controls.

## Status by scope

| Scope | Built | Partial | Stub | Missing | Total |
|---|---:|---:|---:|---:|---:|
| Launch | 59 | 84 | 3 | 42 | 188 |
| Deferred | 0 | 5 | 5 | 26 | 36 |

Counts are an inventory, not a completion percentage. One missing physical adapter can block several otherwise implemented loops.

## Sources and conflict handling

Read [source reconciliation](IMPLEMENTATION-WORK-PACKAGES.md#source-reconciliation) before applying older document instructions. Business values must be configured, validated and audited; cryptographic integrity and rated hardware constraints remain enforced. The supplement is preserved [verbatim](sources/SmartClamp-Supplement-Complete-Coverage.md).

## A. Accounts and account lifecycle

Source: AtoZ P,R; supplement 1.1.

| ID / feature | Status / scope | Code evidence and current boundary | Remaining work | Configuration / lane |
|---|---|---|---|---|
| A01 Phone and email/password signup, login and verification | Built / Launch | apps/api/app/live_auth.py; apps/web/components/AuthPage.tsx | Live project phone provider is disabled; configure and verify real handset/inbox delivery. | Current: Supabase Auth provider settings; Core |
| A02 Google PKCE signup/login and profile completion | Built / Launch | apps/api/app/live_auth.py; apps/web/app/auth/callback/page.tsx | Google credentials and approved redirects need live acceptance. | Current: Supabase Google provider; APP_ORIGIN; Core |
| A03 Explicit versioned terms/privacy acceptance | Built / Launch | apps/api/app/live_auth.py; apps/web/app/account/complete-profile/page.tsx | Replace provisional legal text/version with approved copy. | Current: LEGAL_TERMS_VERSION; LEGAL_PRIVACY_VERSION; Core |
| A04 Verified contact enrollment and account recovery | Built / Launch | apps/api/app/live_auth.py; apps/api/tests/test_email_enrollment.py | Live SMTP/SMS acceptance; local real GoTrue/SMTP OTP checks pass. | Current: Supabase Auth SMTP/SMS/recovery settings; Core |
| A05 Persistent refresh, logout and private-route guards | Built / Launch | apps/web/lib/session.ts; apps/web/components/useWorkspaceSession.ts | Deployed API/session acceptance and browser/device coverage. | Current: Supabase JWT/refresh settings; Core |
| A06 Role cards, invite-forced tenant role, enabled role discovery | Partial / Launch | apps/web/components/AuthPage.tsx; apps/api/app/live_auth.py | Customer role cards exist; finish invite-forced role/feature discovery before redirect. Deferred agent/referrer roles now default off server-side. | Current: ROLE_AGENT_ENABLED; ROLE_REFERRER_ENABLED; proposed: scoped role.*.enabled; Core |
| A07 Session/device list and sign out other sessions | Missing / Launch | No executable implementation identified. | Session inventory, owner-scoped revoke, UI and tests. | Proposed: auth.session_retention; Core |
| A08 Rate limits, lockout and security messaging | Partial / Launch | apps/api/app/live_auth.py; apps/api/app/providers.py | Unify configurable bounded limits and genuine lockout states across all entry points. | Proposed: auth.rate_limits; Core |
| A09 Action-bound step-up verification | Built / Launch | apps/api/app/live_auth.py; apps/api/app/live_devices.py | Live SMS provider acceptance; retain distinct hashes per sensitive action. | Current: Supabase phone verification; Core |
| A10 Populated real review accounts for all roles | Missing / Launch | No executable implementation identified. | Build guarded staging account/data provisioning, secure credential output and role journey matrix; no live fake metrology or real charges. | Proposed: review environment; isolated project guards; Review/Deployment |
## B. Configuration, entitlements and rollout

Source: AtoZ V; supplement 2.1b,2.13.

| ID / feature | Status / scope | Code evidence and current boundary | Remaining work | Configuration / lane |
|---|---|---|---|---|
| B01 Server feature flags and capability checks | Partial / Launch | apps/api/app/live_resources.py; apps/api/app/live_devices.py | Complete per-building/per-organisation overrides and uniform enforcement on every gated handler. | Current: feature_flags; proposed: scoped flag overrides; Business configuration |
| B02 Versioned audited configuration editor | Built / Launch | apps/api/app/business_rules.py; apps/web/app/ops/settings/page.tsx | Typed 14-key registry and administrator editor; immutable scope versions, CAS, effective dates, restore-as-new-version and old/new audit. Provider approval remains external. | Current: typed business_rule_versions registry, scoped environment fallback; see CONFIGURATION-INVENTORY.md; Business configuration |
| B03 Subscription prices and frequencies | Partial / Launch | apps/web/app/settings/subscription/page.tsx; apps/api/app/business_rules.py; apps/web/app/ops/settings/page.tsx | Approved monthly NGN prices are configurable and shown publicly; subscription cadence/product mapping and paid checkout remain unimplemented. | Current: typed business_rule_versions registry, scoped environment fallback; see CONFIGURATION-INVENTORY.md; Business configuration |
| B04 Discounts, grace and retention rules | Partial / Launch | apps/api/app/business_rules.py; apps/web/app/ops/settings/page.tsx | Typed scoped quarterly/yearly discounts and grace settings exist; subscription application and retention workflow remain unimplemented. | Current: typed business_rule_versions registry, scoped environment fallback; see CONFIGURATION-INVENTORY.md; Business configuration |
| B05 Configurable payment markup/fees and tariff provenance | Built / Launch | apps/api/app/live_payments.py; apps/api/app/providers.py; apps/api/app/business_rules.py; apps/web/app/ops/settings/page.tsx | Scoped audited fee/markup rules resolve into immutable quotes with rule-version provenance. Approved actual values and provider acceptance remain external. | Current: typed business_rule_versions registry, scoped environment fallback; see CONFIGURATION-INVENTORY.md; Business configuration |
| B06 Installation protection profiles and approved ranges | Partial / Launch | apps/api/app/datastreams.py; firmware/include/core.hpp | Separate install-approved limits from display bands; eliminate fixed production protection values. | Proposed: installation.protection_profiles; hardware hard limits; Business configuration |
| B07 Drift windows and privacy thresholds | Partial / Launch | apps/api/app/business_rules.py; apps/api/app/energy_reconciliation.py | Typed scoped comparison gap, boundary skew and tolerance rules exist; persistence windows, calibrated approval workflow and aggregate privacy cohorts remain unimplemented. | Proposed: reconciliation.*; privacy.minimum_cohort; Business configuration |
| B08 Alert repeat, quiet hours and report lifetime rules | Partial / Launch | apps/api/app/alert_experience.py; apps/api/app/reports.py; apps/api/app/business_rules.py; apps/web/app/ops/settings/page.tsx | Report link lifetime is scoped/versioned; alert repeat/escalation intervals still need configuration. | Current: typed business_rule_versions registry, scoped environment fallback; see CONFIGURATION-INVENTORY.md; Business configuration |
| B09 Role and payout programme switches | Partial / Deferred | apps/api/app/business_rules.py; apps/web/app/ops/settings/page.tsx | Deferred agent/referrer signup remains unavailable through typed registry; programme/training/payout implementation remains deferred. | Current: typed business_rule_versions registry, scoped environment fallback; see CONFIGURATION-INVENTORY.md; Business configuration |
| B10 Per-environment defaults with validation | Partial / Launch | .env.example; apps/api/.env.example | Document existing vs proposed keys; missing paid prices remain unset; enforce security/rating bounds. | Environment defaults plus approved persisted rules; Business configuration |
## C. Device identity, topology and capabilities

Source: AtoZ 2,R; supplement 2.1c,2.14.

| ID / feature | Status / scope | Code evidence and current boundary | Remaining work | Configuration / lane |
|---|---|---|---|---|
| C01 Unique factory credentials and hashed customer claims | Built / Launch | tools/provision_device.py; apps/api/app/live_workflows.py | Secure operational issuance and physical identity acceptance. | Current: DEVICE_HMAC_ENCRYPTION_KEY; Core |
| C02 One-time installer key delivery/bootstrap | Partial / Launch | tools/provision_device.py | Secure BLE/bootstrap identity and one-time browser delivery with durable installation acknowledgement. | Proposed: bootstrap lease and provisioning transport; Core |
| C03 Device profile and fitted channel manifest | Partial / Launch | apps/api/app/datastreams.py; contracts/datastreams.json | Complete hardware role/relay/voltage/uplink declaration and qualified production adapters. | Current: signed channel manifests; proposed: install capabilities; Core |
| C04 Room/building/pole/transformer topology registry | Partial / Launch | apps/api/app/live_resources.py; database/migrations/002_buildings_rooms_devices.sql | Complete explicit upstream edges, provisioning association and topology editing/audit. | Proposed: topology and installation rules; Core |
| C05 Signed device ingest, deduplication and replay checks | Built / Launch | apps/api/app/live_devices.py; firmware/include/crypto.hpp | Physical secure key storage and recovery qualification. | Current: key/config epochs and device credentials; Core |
| C06 Signed polling, trusted-time binding and epochs | Built / Launch | apps/api/app/live_devices.py; firmware/include/cloud_agent.hpp | Physical clock drift, power-loss and key-rotation acceptance. | Current: device epochs; deployment HTTPS/CA; Core |
| C07 Hardware-agnostic adapters and configuration | Partial / Launch | firmware/include/hardware_config.hpp; firmware/HARDWARE-CONFIG.md | Approved BOM/pins and actual metrology/actuator/GSM/link adapter instantiation. | Proposed: qualified per-board manifest; Hardware |
| C08 Months of durable offline readings and catch-up | Partial / Launch | firmware/include/runtime.hpp; firmware/include/cloud_agent.hpp | Qualified storage sizing/wear, outage hold-up and long-duration/backfill testing. | Proposed: journal retention/report cadence; Hardware |
| C09 Device lifecycle and firmware provenance | Partial / Launch | apps/api/app/firmware.py; apps/api/app/live_workflows.py | Manufacture batch, install/safety identities and complete lifecycle query/UI. | Proposed: lifecycle records; Core |
## D. Daily dashboard and measured history

Source: AtoZ A-D,I; supplement 2.3.

| ID / feature | Status / scope | Code evidence and current boundary | Remaining work | Configuration / lane |
|---|---|---|---|---|
| D01 Approved light dashboard and familiar navigation | Built / Launch | apps/web/components/OverviewDashboard.tsx; apps/web/components/AppShell.tsx | Keep current appearance; no repeated visual redesign. | No business value introduced by this item.; Core |
| D02 Room power and credit priority; monitoring-only variant | Built / Launch | apps/web/components/PowerControlPanel.tsx; apps/web/components/WalletCard.tsx | Physical relay/credit acceptance and current high-priority browser checks. | No business value introduced by this item.; Core |
| D03 Power/voltage/current gauges, traces and unknown states | Built / Launch | apps/web/components/EnergyInstruments.tsx | Hardware qualification and full installation scale coverage. | Current: signed channel declaration; Core |
| D04 Shared authenticated live stream | Built / Launch | apps/api/app/live_stream.py; apps/web/components/WorkspaceLiveProvider.tsx | Production streaming capacity; finish non-core role dataset live updates. | Current: bounded SSE; direct Supabase Realtime is not enabled; Core |
| D05 Historical charts, counter labels and exact readings | Partial / Launch | apps/web/app/history/page.tsx; apps/api/app/live_resources.py | Pagination, zoom/brush, compare usage periods and event-window links. | Proposed: history windows/page sizes; Core |
| D06 Sampled supply hours and unknown coverage | Built / Launch | apps/api/app/supply_history.py; apps/web/components/SupplyHistory.tsx | Continuous qualified device supply-duration acceptance; do not equate kWh with uptime. | Current: SUPPLY_PRESENT_MIN_MV; proposed: bounded coverage gap; Core |
| D07 Source-backed peaks, daily/monthly energy and typical-hour comparison | Partial / Launch | apps/api/app/live_resources.py; apps/web/app/history/page.tsx | Complete aggregation/coverage and comparison UI without inventing gaps. | Proposed: history aggregation windows; Core |
| D08 First-link onboarding/checklist and sensory sequence | Partial / Launch | apps/web/components/ExperienceProvider.tsx; apps/web/components/InvestorDemo.tsx | Real account first-run state, checklist persistence and reported-data-only welcome progression. | No business value introduced by this item.; Core |
| D09 Unified meter-only, clamp-only and combined account view | Partial / Launch | apps/web/components/OverviewDashboard.tsx; apps/api/app/live_resources.py | Meter-only history/manual entries in one source-aware dashboard; no voltage/relay invented for meter-only accounts. | No business value introduced by this item.; Core |
| D10 Capability-specific voltage/current absence states | Partial / Launch | apps/web/components/EnergyInstruments.tsx; apps/api/app/datastreams.py | Audit every unsupported sensor tile and show unavailable once; never infer fitted hardware. | No business value introduced by this item.; Core |
## E. Relay control and actuation integrity

Source: AtoZ E,4, J2-J7.

| ID / feature | Status / scope | Code evidence and current boundary | Remaining work | Configuration / lane |
|---|---|---|---|---|
| E01 Operation-bound manual request and phone confirmation | Built / Launch | apps/web/components/PowerControlPanel.tsx; apps/api/app/live_devices.py | Deployed phone/provider and physical device acceptance. | No business value introduced by this item.; Core |
| E02 Signed receipt-only ON/OFF and explicit uncertain/expired states | Built / Launch | apps/api/app/live_devices.py; apps/web/components/PowerControlPanel.tsx | Extend equivalent physical receipts to local protection/schedule/budget transitions. | No business value introduced by this item.; Core |
| E03 Latching driver interlocks, feedback and durable intent | Partial / Launch | firmware/include/latching_driver.hpp; firmware/include/runtime.hpp | Instantiate qualified hardware adapters; electrical and reboot failure testing. | Proposed: qualified pulse/cooldown/hard limits; Hardware |
| E04 Independent protection/wallet/budget/schedule/manual restrictions | Partial / Launch | firmware/include/runtime.hpp; firmware/include/prepaid_policy.hpp | Integrate all policies and receipts into the actual application; no automatic clearing of unrelated reasons. | No business value introduced by this item.; Core |
| E05 Current resident owns write/financial authority | Partial / Launch | apps/api/app/db.py; apps/api/tests/test_resident_authority.py | API scope tests and full browser regression passed; production account/device acceptance remains. | No business value introduced by this item.; Core |
| E06 Maintenance-only landlord bulk actions | Missing / Launch | No executable implementation identified. | Consent/notice, scoped step-up, per-room requests/receipts; no rent or punitive action. | Proposed: maintenance authority and notice rules; Core |
| E07 Last relay events with source and actor | Partial / Launch | apps/web/app/devices/[id]/commands/page.tsx | Include local schedule/budget/protection receipts, not only manual cloud commands. | No business value introduced by this item.; Core |
## F. Offline schedules and budgets

Source: AtoZ F,G,J7.

| ID / feature | Status / scope | Code evidence and current boundary | Remaining work | Configuration / lane |
|---|---|---|---|---|
| F01 Daily/monthly durable offline budget engine | Partial / Launch | firmware/include/automation_policy.hpp; firmware/tests/automation_test.cpp | Qualified store/counter/clock/actuator application integration and physical acceptance. | Proposed: per-device signed user budgets; Core |
| F02 Weekly offline allowed windows and manual-OFF rule | Partial / Launch | firmware/include/automation_policy.hpp | Templates/grid editor, per-trigger execution receipts and full runtime integration. | Current WIP: explicit preserve-manual-OFF policy; Core |
| F03 Versioned action-confirmed cloud settings | Partial / Launch | apps/api/app/automation.py; apps/web/components/AutomationSettings.tsx | Cloud/UI/configuration receipt path tested; qualified runtime execution and per-trigger feedback remain unfinished. | Current WIP: AUTOMATION_ENABLED; qualification flag; Core |
| F04 Signed poll offer and configuration receipts | Partial / Launch | apps/api/app/automation.py; firmware/include/cloud_agent.hpp | Commissioning image truthfully rejects unqualified execution; qualified firmware must actually apply/journal policy. | No business value introduced by this item.; Core |
| F05 Extra daily allowance and midnight/month reset | Partial / Launch | firmware/include/automation_policy.hpp; apps/web/components/AutomationSettings.tsx | Device-reported remaining units, reset events and physical receipts; wallet funding remains separate. | No business value introduced by this item.; Core |
| F06 80/100 percent alerts and budget progress | Missing / Launch | No executable implementation identified. | Signed live policy state, threshold transitions and source-backed remaining allowance. | Proposed: budget warning fractions and notification rules; Core |
| F07 Schedule templates, preview and hours saved | Missing / Launch | No executable implementation identified. | Templates/preview; saved-hours calculation requires trustworthy relay+supply intervals. | Proposed: schedule templates; estimate methodology; Core |
| F08 Handover disables old policy and reanchors new resident | Partial / Launch | apps/api/app/automation.py; firmware/include/automation_policy.hpp | Native/API handover and new-subject anchor tests pass; real hardware acceptance remains. | No business value introduced by this item.; Core |
## G. Protection, override and appliance guidance

Source: AtoZ C,D,4.1-4.3; supplement 2.7.

| ID / feature | Status / scope | Code evidence and current boundary | Remaining work | Configuration / lane |
|---|---|---|---|---|
| G01 Installation-specific voltage/current display advisories | Built / Launch | apps/api/app/datastreams.py; apps/api/app/device_experience.py | Production manifest/calibration acceptance; display bands do not configure protection. | No business value introduced by this item.; Core |
| G02 Installer-approved physical operating limits | Partial / Launch | firmware/include/core.hpp; firmware/include/hardware_config.hpp | Replace fixed reference thresholds with validated signed installation profiles. | Proposed: voltage/current/power bands, dwell, restore and rated hard limits; Core |
| G03 Alert-only/auto-cut/auto-restore protection modes | Missing / Launch | No executable implementation identified. | Persist, step-up, signed sync, offline enforcement and receipts; monitoring-only devices have alert settings only. | Proposed: protection mode/profile; Core |
| G04 Stable-window restore and reported countdown | Partial / Launch | firmware/include/core.hpp; apps/api/app/live_devices.py | Device-reported stable interval and qualified restoration receipt; do not timer-confirm switching. | Proposed: approved restore stability window; Core |
| G05 Low-voltage bounded override | Missing / Launch | No executable implementation identified. | Risk sheet, acknowledged appliance guidance, step-up, signed timebox and local expiry/hard-floor enforcement. | Proposed: approved override durations and hard floor; Core |
| G06 High-voltage strict bounded override | Missing / Launch | No executable implementation identified. | Stronger warning/hold-or-type confirmation, approved hardware envelope, expiry/recovery and receipts. | Proposed: approved override policy; never arbitrary unsafe limits; Core |
| G07 Current/power overload and spike policy | Partial / Launch | apps/api/app/device_experience.py; firmware/include/runtime.hpp | Qualified load thresholds/dwell and current/power trip receipts. | Proposed: install-specific current/power limits; Core |
| G08 Appliance inventory and sensitivity guidance | Missing / Launch | No executable implementation identified. | User appliance list, guidance rules and event-specific checklist; no appliance identification guessed. | Proposed: guidance classification rules; Core |
| G09 Linked smart-plug turn-off action | Stub / Deferred | apps/web/app/settings/smart-devices/page.tsx | Partner adapter, consent, state receipts and actual accessory availability. | Proposed: plug provider flags; Core |
## H. Electricity wallet and payment lifecycle

Source: AtoZ H,J3; supplement 1.2,2.11.

| ID / feature | Status / scope | Code evidence and current boundary | Remaining work | Configuration / lane |
|---|---|---|---|---|
| H01 Private unit/cash/reserved balances and immutable ledgers | Built / Launch | apps/api/app/live_payments.py; apps/api/app/work.py; database/migrations/010_financial_guardrails.sql | Real merchant/physical prepaid qualification; occupied-room owner privacy tightening is WIP. | No business value introduced by this item.; Core |
| H02 Itemized frozen quote, fees and destination | Built / Launch | apps/api/app/live_payments.py | Live tariff/catalogue/merchant configuration. | Current: tariffs; payment fee/markup environment settings; Core |
| H03 Paystack checkout, verified callback and reconciliation | Built / Launch | apps/api/app/live_payments.py; apps/api/app/providers.py | Actual merchant credentials, live transactions and callback deployment. | Current: PAYSTACK_*; Core |
| H04 VTPass vending/requery and actual delivered units | Built / Launch | apps/api/app/providers.py; apps/api/app/work.py | Real merchant/device acceptance; no claim meter loaded merely from account payment. | Current: VTPASS_*; Core |
| H05 STS delivery, key-change tokens and entry acknowledgement | Partial / Launch | apps/api/app/live_payments.py | Actual meter compatibility/entry evidence and external STS certification; no certification claim. | No business value introduced by this item.; Core |
| H06 Duplicate/failed/pending/reversed payment outcomes | Partial / Launch | apps/api/app/live_payments.py; apps/api/app/work.py | Complete provider reversal/refund lifecycle and visible reconciliation cases. | Proposed: provider-specific reconciliation policies; Core |
| H07 Automatic recharge with consent and caps | Missing / Launch | No executable implementation identified. | Verified reusable mandate, durable charge identity, limits, pause/cancel, uncertain reconciliation and user UI. | Proposed: recharge mandate, threshold, per-day/month caps; Core |
| H08 Subscription collection separate from electricity | Stub / Launch | apps/web/app/settings/subscription/page.tsx | Paid checkout, verified plan invoices, grace, downgrade/cancel and history; never cut power on lapse. | Proposed: approved prices/cadence/discount/grace; Core |
| H09 Payment receipts and billing export | Partial / Launch | apps/web/app/billing/page.tsx | Complete PDF/Excel/payment receipt delivery and provider-specific refunds. | No business value introduced by this item.; Core |
| H10 Dual tariff and transparent monthly bill | Partial / Launch | database/migrations/004_wallets_ledger.sql; apps/api/app/live_resources.py | Time-qualified tariff splits and bill UI; supplied rates must be approved. | Current: tariffs; proposed: period tariff rules; Core |
| H11 Low credit percentage, zero and restored allowance loop | Partial / Launch | apps/api/app/work.py; apps/api/app/prepaid.py; firmware/include/prepaid_policy.hpp | Configurable percentage reference; qualified local cutoff/restore receipts and user warnings. | Current: LOW_CREDIT_WARNING_MWH; proposed: percentage basis; Core |
| H12 Days-left estimate and reminders | Partial / Launch | apps/api/app/communications.py; apps/web/components/WalletCard.tsx | Measured-coverage pace estimate and dedicated administrative reminder actions. | Proposed: pace coverage and reminder policies; Core |
## I. Shared housing with a central meter

Source: AtoZ Q,J8-J11; supplement 2.4.

| ID / feature | Status / scope | Code evidence and current boundary | Remaining work | Configuration / lane |
|---|---|---|---|---|
| I01 Building/room creation and existing central meter setup | Built / Launch | apps/api/app/live_resources.py; apps/api/app/live_workflows.py | Physical meter/room mapping and provider acceptance. | No business value introduced by this item.; Core |
| I02 Independent tenant purchases and own-room measured debit | Built / Launch | apps/api/app/live_payments.py; apps/api/app/work.py | Live central meter prepaid reconciliation; each payer funds its own device, not a landlord resale wallet. | No business value introduced by this item.; Core |
| I03 Room invitation and scoped occupancy | Built / Launch | apps/api/app/live_resources.py | Current handover authority/accounting changes need final regression. | No business value introduced by this item.; Core |
| I04 Resident transfer, viewer revoke and settled balance guard | Partial / Launch | apps/api/app/live_resources.py; apps/api/app/automation.py | Finish qualified handover/late usage handling, disputed legacy balances and physical release receipts. | No business value introduced by this item.; Core |
| I05 Central supply credit versus tenant liability ledger | Missing / Launch | No executable implementation identified. | Source-backed physical meter balance, room credit totals and supply shortfall view. | Proposed: central balance adapter and ledger rules; Core |
| I06 Aligned central-versus-room energy reconciliation | Partial / Launch | apps/api/app/energy_reconciliation.py; apps/web/components/EnergyReconciliation.tsx; apps/api/tests/test_energy_reconciliation.py | Read-only qualified incoming/branch counter comparison is built with stable recorded topology, scoped timing/tolerance policy, signed-source hashes and unknown coverage. Unaccounted-energy ledger, physical topology qualification, persistent consecutive-window engine and settlement remain unimplemented; no automatic debit or theft verdict. | Current: reconciliation.max_gap_ms; reconciliation.boundary_skew_ms; reconciliation.tolerance_bps (unset until approved); Core |
| I07 Neutral building shortfall alert | Missing / Launch | No executable implementation identified. | Notify participants with measured source and coverage; no room accusation. | Proposed: shortfall/coverage alert rules; Core |
| I08 Optional joint purchase allocation | Stub / Launch | apps/web/components/InvestorDemo.tsx | Production explicit payer allocation, actual vend units, per-beneficiary receipts and idempotent ledger; not the default independent-purchase model. | No business value introduced by this item.; Core |
| I09 Generator contribution sharing | Missing / Deferred | No executable implementation identified. | Approved participant allocation, fuel evidence, contribution ledger and visible consent. | Proposed: generator allocation policy; Core |
## J. No-meter pooled settlement

Source: AtoZ J10; supplement 2.4.

| ID / feature | Status / scope | Code evidence and current boundary | Remaining work | Configuration / lane |
|---|---|---|---|---|
| J01 Whole-building and per-room measurement view | Missing / Launch | No executable implementation identified. | Qualified upstream measurement, topology and scoped totals with coverage. | Proposed: no-meter building mode; Core |
| J02 Provisional self-loading price formula | Missing / Launch | No executable implementation identified. | Use actual bill/qualified energy inputs, confidence, correction date and pass-through explanation. | Proposed: approved formula parameters; no hidden margin; Core |
| J03 Running balance and per-bill settlement modes | Missing / Launch | No executable implementation identified. | Both ledgers/views, versioned per-building mode and transition rules. | Proposed: building.settlement_mode; Core |
| J04 Pooled contributions versus utility amount due | Missing / Launch | No executable implementation identified. | Bounded participant funding, deadline, liability, shortfall and receipt states. | Proposed: pooled custody and contribution rules; Core |
| J05 Human utility payment and evidence confirmation | Missing / Launch | No executable implementation identified. | Landlord external payment, evidence review and exact settlement; no assumed automated NEPA API. | Proposed: evidence/approval rules; Core |
| J06 Price correction and disputed allocation | Missing / Launch | No executable implementation identified. | No silent retroactive debit; attributable adjustment proposal and agreed allocation. | Proposed: correction and dispute rules; Core |
| J07 Upstream actuator option and bypass limits | Missing / Launch | No executable implementation identified. | Capabilities must describe physical control; a pole sensor is not a utility meter or cutoff. | Qualified hardware + approved settlement policy; Hardware |
## K. Signals, reconciliation and investigation

Source: AtoZ K,J11; supplement 1.5,2.6.

| ID / feature | Status / scope | Code evidence and current boundary | Remaining work | Configuration / lane |
|---|---|---|---|---|
| K01 Authenticated tamper/protection log and packet evidence | Built / Launch | apps/api/app/trust.py; apps/web/components/DeviceTrust.tsx | Physical source acceptance; signed symptoms never prove theft. | No business value introduced by this item.; Core |
| K02 Resident/utility scoped review and inspection handoff | Built / Launch | apps/api/app/trust.py; database/migrations/039_signal_investigations.sql | Field findings and full closed-case evidence policy acceptance. | No business value introduced by this item.; Core |
| K03 Reading hash chain and integrity surface | Partial / Launch | apps/api/app/work.py; apps/api/app/reports.py | Dedicated verified chain traversal/UI; distinguish integrity from metrology accuracy. | No business value introduced by this item.; Core |
| K04 Topology chain with aligned numbers/coverage | Missing / Launch | No executable implementation identified. | Transformer/pole/building/room links and break evidence. | Proposed: topology, sampling and coverage rules; Core |
| K05 Persistent drift confirmation engine | Missing / Launch | No executable implementation identified. | Configurable comparison-specific tolerance and valid consecutive windows; no single-sample accusation. | Proposed: calibration-approved drift/window rules; Core |
| K06 Relay/current and zero-balance correlation | Missing / Launch | No executable implementation identified. | Qualified feedback/current/time alignment; missing source stays unknown. | Proposed: correlation noise floors/persistence; Core |
| K07 Partial bypass and neighbour-pattern review | Missing / Launch | No executable implementation identified. | Validated statistical flags, no suspect naming, contested period and inspection flow. | Proposed: minimum history and anomaly thresholds; Core |
| K08 Enclosure/clamp removal/loose-contact signals | Partial / Launch | apps/api/app/live_devices.py | Actual fitted sensors/classifier qualification; no inference from ordinary zero load alone. | Qualified sensor manifest; Hardware |
| K09 Cell-tower relocation and SIM provider anomalies | Missing / Launch | No executable implementation identified. | Signed modem baseline/provider webhook, confirmation, step-up reset and owner/ops view; tower handover alone is not theft. | Proposed: relocation confirmation and telco adapter; Core |
| K10 Ranked inspection evidence and disputed shortfall | Missing / Launch | No executable implementation identified. | Evidence-ranked reasons, scoped visibility, agreed loss allocation and no punitive cutoff. | Proposed: loss allocation requires explicit agreement; Core |
| K11 Neutral public/community alert policy | Missing / Deferred | No executable implementation identified. | Privacy-safe aggregation and review/abuse handling; room naming remains disabled pending an explicit policy decision. | Proposed: public disclosure controls; Core |
## L. Reports and verified records

Source: AtoZ L; supplement 1.6,2.11.

| ID / feature | Status / scope | Code evidence and current boundary | Remaining work | Configuration / lane |
|---|---|---|---|---|
| L01 Signed immutable completed-period measurement snapshot | Built / Launch | apps/api/app/reports.py | Production signing key custody and hardware-derived evidence acceptance. | Current: REPORT_SIGNING_KEY_FILE; Core |
| L02 CSV, signed JSON evidence and independent verification | Built / Launch | apps/web/components/MeasurementReport.tsx; apps/web/tests/operations-journey.spec.ts | Consumer must establish issuer key trust independently of embedded key. | No business value introduced by this item.; Core |
| L03 Local QR, seven-day share, expiry and revoke | Built / Launch | apps/web/components/ReportSharingQr.tsx; apps/api/app/reports.py | Configurable approved lifetime; printed/downloaded copies cannot be recalled. | Proposed: reports.link_lifetime; Core |
| L04 Print/save PDF with qualification and QA provenance | Built / Launch | apps/web/components/MeasurementReport.tsx; apps/web/app/experience.css | Manual browser export acceptance on supported devices. | No business value introduced by this item.; Core |
| L05 Scheduled report delivery | Missing / Launch | No executable implementation identified. | Period scheduler, source readiness, issue once, purpose/channel consent, retries and history. | Proposed: report schedules and delivery rules; Core |
| L06 Verified payment-and-usage record page | Missing / Launch | No executable implementation identified. | Own verified records only, purpose-named revocable consent and signed export. | Proposed: verified-record sharing purposes; Core |
| L07 Upstream alignment and chain evidence in report | Partial / Launch | apps/api/app/reports.py | Actual reconciled chain numbers/status and source qualification; never fabricate verification. | No business value introduced by this item.; Core |
## M. Disputes and resolution

Source: AtoZ M; supplement 1.5.

| ID / feature | Status / scope | Code evidence and current boundary | Remaining work | Configuration / lane |
|---|---|---|---|---|
| M01 Scoped dispute records, finance review and immutable bill evidence | Built / Launch | apps/api/app/live_resources.py; apps/web/app/disputes/[id]/page.tsx | Production workflow acceptance; no monetary adjustment is implied by case closure. | No business value introduced by this item.; Core |
| M02 Meeting Mode | Built / Launch | apps/web/app/disputes/[id]/meeting/page.tsx | Accessibility/real-user acceptance; preserve disputed scope. | No business value introduced by this item.; Core |
| M03 Automatic measured-period evidence attachment | Missing / Launch | No executable implementation identified. | Attach reports/readings/quality and source provenance at case creation. | No business value introduced by this item.; Core |
| M04 Contest allocation without power consequences | Partial / Launch | apps/api/app/live_resources.py | Durable disputed-amount hold and scoped review; no rent/punitive restriction. | Proposed: dispute allocation rules; Core |
| M05 Propose/counter/accept instalment plan | Missing / Launch | No executable implementation identified. | Versioned agreement, instalment schedule, payment linking, fulfilled/missed states and audit. | Proposed: agreement/cadence limits; Core |
| M06 Agreed corrections, refunds and evidence exports | Partial / Launch | apps/api/app/live_resources.py | Reviewed balanced monetary reversals and evidence pack export; never rewrite ledgers. | No business value introduced by this item.; Core |
## N. Notifications and sensory experience

Source: AtoZ J,3,4; supplement 1.3,2.8.

| ID / feature | Status / scope | Code evidence and current boundary | Remaining work | Configuration / lane |
|---|---|---|---|---|
| N01 Canonical recorded event bus and presentation | Built / Launch | contracts/alert-types.json; apps/web/components/ExperienceProvider.tsx | Expand catalogue only with genuine data-layer event sources. | No business value introduced by this item.; Core |
| N02 Opt-in sound/haptics, mute, volume and quiet hours | Built / Launch | apps/web/components/SensorySettings.tsx; apps/web/public/sounds | Actual browser/OS/handset acceptance. | Current: per-user sensory preferences; Core |
| N03 Acknowledge/snooze/history and delivery honesty | Built / Launch | apps/api/app/live_resources.py; apps/web/app/alerts/page.tsx | Complete filter chips/deep links, accessible badge counts and escalation policy. | No business value introduced by this item.; Core |
| N04 In-app, Web Push and OneSignal push | Built / Launch | apps/api/app/web_push.py; apps/api/app/onesignal_push.py | Live provider/browser delivery and OneSignal feedback acceptance. | Current: WEB_PUSH_*, VAPID_*, ONESIGNAL_*; Core |
| N05 SMS notifications and uncertainty-safe dispatch | Built / Launch | apps/api/app/notifications.py | Live sender, consent and handset acceptance. | Current: SMS provider settings; Core |
| N06 Resend to OneSignal email routing and quota | Built / Launch | apps/api/app/email_routing.py; apps/api/app/email_delivery.py | Live providers/inbox acceptance; owner chose 100/day, provider boundaries remain explicit. | Current: RESEND_DAILY_EMAIL_LIMIT; RESEND_MONTHLY_EMAIL_LIMIT; ONESIGNAL_EMAIL_ENABLED; Core |
| N07 Signed email feedback, suppression and reconciliation | Built / Launch | apps/api/app/email_receipts.py | Live callback delivery and OneSignal-specific delivery feedback. | Current: provider signing/encryption keys; Core |
| N08 Automatic region/owing/category staff audience | Built / Launch | apps/api/app/audiences.py; apps/api/app/communications.py | More scoped categories/coverage and deployed sender acceptance. | Current: service area membership and notice grants; Core |
| N09 Full event catalogue and expiry/clear/escalation rules | Partial / Launch | apps/api/app/device_experience.py; apps/web/components/ExperienceProvider.tsx | Budget/schedule/overload/reconciliation/SIM/retention events and configurable lifecycle. | Proposed: notification policies; Core |
## O. Public site, help and access

Source: AtoZ O,U; supplement 1.3,2.2,2.15.

| ID / feature | Status / scope | Code evidence and current boundary | Remaining work | Configuration / lane |
|---|---|---|---|---|
| O01 Home, how-it-works, audience and device pages | Built / Launch | apps/web/app/page.tsx; apps/web/components/PublicShell.tsx | Approved story/images/product facts and concise feature availability copy. | No business value introduced by this item.; Core |
| O02 Plans and hardware-required/available disclosures | Partial / Launch | apps/web/data/catalogue.ts; apps/web/app/pricing/page.tsx | Wire configured products/entitlements; do not sell unimplemented features. | Proposed: approved plan catalogue; Core |
| O03 Anonymous meter validation with masked identity | Built / Launch | apps/api/app/providers.py; apps/web/app/page.tsx | Live provider acceptance. Full customer name/address is not exposed anonymously despite source example. | No business value introduced by this item.; Core |
| O04 Connection help and service connectivity test | Partial / Launch | apps/web/app/connection-help/page.tsx | Working scoped browser/API/device/supply diagnostic rather than a generic online claim. | No business value introduced by this item.; Core |
| O05 Installation, safety, glossary and FAQ help | Partial / Launch | apps/web/app/install/page.tsx; apps/web/app/faqs/page.tsx | Approved electrical safety copy and complete readings glossary. | No business value introduced by this item.; Core |
| O06 Support requests, replies and electrical emergency notice | Built / Launch | apps/api/app/live_resources.py; apps/web/app/support/page.tsx | Attachments, SLA/escalation rules and deployed delivery. | Proposed: support SLA; Core |
| O07 Hardware/IR installation request and cancellation | Partial / Launch | apps/api/app/live_resources.py; apps/web/app/orders/page.tsx | Scheduling, installer contact, retrofit type, warranty and completion flow. | Proposed: hardware order catalogue and warranty policy; Core |
| O08 Public device view with deliberate payment destination | Built / Launch | apps/web/app/d/[public_token]/page.tsx | Printed device QR, approved publication policy and no personal history/tamper leakage. | No business value introduced by this item.; Core |
| O09 Legal pages, footer and data-rights requests | Partial / Launch | apps/web/app/terms/page.tsx; apps/web/app/privacy/page.tsx | Approved final legal copy, retention/export/deletion workflow. | Proposed: legal and retention rules; Core |
| O10 Isolated interactive walkthrough and screenshots | Built / Launch | apps/web/components/InvestorDemo.tsx; docs/investor-demo/README.md | Retain separately from real review accounts; never treat sample readings as physical evidence. | No business value introduced by this item.; Core |
## P. Access, consent and personal settings

Source: AtoZ P; supplement 1.7.

| ID / feature | Status / scope | Code evidence and current boundary | Remaining work | Configuration / lane |
|---|---|---|---|---|
| P01 Family viewer and expiring guest management | Built / Launch | apps/web/components/DeviceViewers.tsx; apps/api/app/live_resources.py | Live account acceptance; preserve read-only finance/control boundaries. | No business value introduced by this item.; Core |
| P02 Viewer grant floor, expiry/revoke and resident authority | Built / Launch | apps/api/app/db.py; apps/api/tests/test_viewers.py | Current occupied-room authority changes need final browser regression. | No business value introduced by this item.; Core |
| P03 Viewer read/access audit | Partial / Launch | apps/api/app/live_resources.py | Record scoped viewer reads/exports, not only grant/revoke events. | Proposed: access audit retention; Core |
| P04 Unified consent centre | Partial / Launch | apps/api/app/live_auth.py; apps/web/components/ConsentHistory.tsx; apps/api/tests/test_consent_history.py | Own legal acceptances, audited channel changes, optional-channel withdrawal, shared-viewing inventory and recipient self-revocation are built. Purpose-specific analytics/verified-record sharing remains unimplemented; issued viewing grants are managed on each device. | Proposed: consent purposes and disclosure versions; Core |
| P05 Personal profile and source-aware settings | Built / Launch | apps/web/app/settings/page.tsx | Complete missing source/policy links without changing approved navigation. | No business value introduced by this item.; Core |
| P06 Language and cosmetic dark-mode choice | Missing / Deferred | No executable implementation identified. | Localisation and optional theme, preserving approved green default. | Proposed: enabled locales/theme preference; Core |
| P07 PWA install/offline shell and reconnect honesty | Built / Launch | apps/web/public/sw.js; apps/web/components/PwaControls.tsx | Deployed install/browser push acceptance; never cache private account data in shared offline assets. | No business value introduced by this item.; Core |
| P08 Account export/retention/deletion requests | Missing / Launch | No executable implementation identified. | Verified request, retention/legal holds and auditable fulfilment. | Proposed: approved retention and deletion rules; Core |
## Q. Landlord and property management

Source: AtoZ Q; supplement 2.10.

| ID / feature | Status / scope | Code evidence and current boundary | Remaining work | Configuration / lane |
|---|---|---|---|---|
| Q01 Building list and per-room measured monitoring | Built / Launch | apps/web/app/dashboard/landlord/page.tsx; apps/api/app/live_resources.py | Physical source and occupancy acceptance. | No business value introduced by this item.; Core |
| Q02 Attention-sorted rooms, collections/owed indicators | Partial / Launch | apps/web/components/BuildingInstruments.tsx | Use appropriate bill data; do not reveal private tenant wallet or invent debt. | No business value introduced by this item.; Core |
| Q03 Tenant assignment, invites and transfer | Partial / Launch | apps/api/app/live_resources.py | Current resident authority, pending usage and automation clearance guards are WIP locally tested. | No business value introduced by this item.; Core |
| Q04 Administrative reminders and recharge on behalf | Partial / Launch | apps/api/app/communications.py; apps/api/app/live_payments.py | Dedicated clear actions; pass-through only; tenant scope maintained. | No business value introduced by this item.; Core |
| Q05 Building integrity and inspection list | Missing / Launch | No executable implementation identified. | Aligned totals, gap trace, supply-vs-liability and evidence-ranked inspection. | No business value introduced by this item.; Core |
| Q06 Landlord audit/export and scoped usage reports | Partial / Launch | apps/api/app/reports.py; apps/api/app/live_resources.py | Separate authorised aggregate reports from public sharing of a tenant’s private device report. | No business value introduced by this item.; Core |
| Q07 Multi-property portfolio summaries | Partial / Deferred | apps/web/app/dashboard/landlord/page.tsx | Actual portfolio aggregates/switcher; no landlord electricity-resale revenue. | Proposed: portfolio availability; Core |
| Q08 Building alert thresholds and maintenance bulk workflow | Missing / Launch | No executable implementation identified. | Scoped threshold editor, notice/consent and per-room actuation receipts. | Proposed: building alert/maintenance policies; Core |
## R. Installer and safe commissioning

Source: AtoZ R; supplement 2.1,2.1a,2.1c.

| ID / feature | Status / scope | Code evidence and current boundary | Remaining work | Configuration / lane |
|---|---|---|---|---|
| R01 Assigned jobs and versioned field workflow | Built / Launch | apps/api/app/live_workflows.py; apps/web/app/portal/jobs/[id]/page.tsx | Live field/evidence acceptance; completion is not proof of calibrated hardware. | No business value introduced by this item.; Core |
| R02 BLE/local setup transport adapter | Missing / Launch | No executable implementation identified. | Secure pairing, identity, uplink/peer settings, bootstrap and recoverable installation flow. | Proposed: qualified provisioning transport; Hardware |
| R03 Signal/sensor/clock/relay diagnostic receipts | Partial / Launch | apps/api/app/live_workflows.py; firmware/include/runtime.hpp | Actual on-device tests and diagnostic UI; never fabricated pass lamps. | Qualified sensor/actuator adapters; Hardware |
| R04 Signed physical safety checklist | Missing / Launch | No executable implementation identified. | PPE, tools, qualified electrician, de-energisation confirmation and immutable sign-off before commissioning. | Proposed: checklist/disclosure versions; Core |
| R05 Commissioning and first authenticated online confirmation | Partial / Launch | tools/provision_device.py; firmware/include/cloud_agent.hpp | Qualified diagnostics + safety + scope approval; heartbeat alone cannot certify a safe install. | No business value introduced by this item.; Core |
| R06 Network path setup and visible support facts | Partial / Launch | firmware/include/link_frames.hpp; apps/api/app/live_resources.py | Actual ESP-NOW peer/RS485 bus/GSM adapter setup and UI. | Proposed: per-device uplink/peer config; Hardware |
| R07 Retrofit installation, training and verification | Partial / Launch | apps/api/app/live_workflows.py | Retrofit job type, qualification record and hardware acceptance. | Proposed: training requirements; Core |
| R08 Installer earnings and payout-trigger records | Missing / Deferred | No executable implementation identified. | Approved payable ledger only after configured verified prerequisites; no payment on a random heartbeat. | Proposed: payout rules; Commercial programmes |
## S. Payment/provider and non-smartphone channels

Source: AtoZ O,H; supplement 2.8,2.11.

| ID / feature | Status / scope | Code evidence and current boundary | Remaining work | Configuration / lane |
|---|---|---|---|---|
| S01 Provider adapter boundary and allowlisted utilities | Built / Launch | apps/api/app/providers.py | Complete supported providers without fake success fallbacks. | Current: provider URLs/credentials/catalogue; Core |
| S02 Additional OPay/Flutterwave channels | Missing / Deferred | No executable implementation identified. | Verified initialization/callback/requery/refund adapters and configuration. | Proposed: enabled payment providers; Core |
| S03 USSD Buy Units and tier-aware Check Balance | Missing / Deferred | No executable implementation identified. | Provider adapter, session state/PIN rules, idempotent payment and SMS response. | Proposed: approved shortcode/provider; do not advertise an unallocated code; Core |
| S04 Bank transfer with attributable device reference | Partial / Launch | apps/web/app/payments/transfer/[quote_id]/page.tsx | Actual provider-issued bank details and reference reconciliation; no fabricated account number. | No business value introduced by this item.; Core |
| S05 Manufacturer meter balance/control adapters | Missing / Deferred | No executable implementation identified. | Per-manufacturer interface, authorised contract/key handling and genuine result states. | Proposed: approved meter adapters; Core |
| S06 IR supported-meter reading and setup | Partial / Launch | apps/web/app/ir-reader/setup/page.tsx | Qualified optical protocol/reader HAL and source-aware meter history. | Proposed: supported meter models; Hardware |
| S07 Manual meter reading with photo provenance | Partial / Launch | apps/api/app/live_resources.py | UI, optional safe attachment, history/dispute/report propagation; always manual-labelled. | No business value introduced by this item.; Core |
| S08 Meter linking states and no-live-balance honesty | Built / Launch | apps/api/app/live_resources.py | Provider/reader physical acceptance; account validation is not optical connectivity. | No business value introduced by this item.; Core |
## T. Utility and NEPA workspace

Source: AtoZ S; supplement 2.8.

| ID / feature | Status / scope | Code evidence and current boundary | Remaining work | Configuration / lane |
|---|---|---|---|---|
| T01 Provisioned role, membership and contracted device scope | Built / Launch | apps/api/app/live_workflows.py | Live scope/contract acceptance; no self-assigned utility role. | No business value introduced by this item.; Core |
| T02 Scoped signal queue and review requests | Built / Launch | apps/api/app/trust.py; apps/web/app/dashboard/utility/page.tsx | Extend region aggregates and consent-gated drill-down; keep customer identity excluded by default. | No business value introduced by this item.; Core |
| T03 Reviewed utility service messages and audience history | Built / Launch | apps/api/app/communications.py; apps/api/app/audiences.py | Real sender/contract/customer opt-in acceptance. | No business value introduced by this item.; Core |
| T04 Regional aggregate supply and consumption overview | Missing / Launch | No executable implementation identified. | Transformer/pole totals, coverage and privacy-safe comparisons. | Proposed: region scope and privacy thresholds; Core |
| T05 Utility-control consent centre and named capabilities | Stub / Launch | apps/web/app/settings/utility-control/page.tsx | Explicit per-organisation consent, revoke, disclosures and one hardened command entry path. | Proposed: utility control grant/contract rules; Core |
| T06 Consent-bound individual utility commands | Missing / Launch | No executable implementation identified. | Staff step-up, capability/contract/consent checks, immediate customer notice, signed receipt and blocked-attempt audit. | Proposed: approved utility command policies; Core |
| T07 Utility bill generation and consumed-data verification badge | Missing / Launch | No executable implementation identified. | Source-backed bill marker and evidence the utility actually consumed data; no theoretical verified badge. | Proposed: billing integration adapter; Core |
| T08 Disconnection list report only | Missing / Launch | No executable implementation identified. | Overdue/region filters, review/download/audit; no bulk disconnect action. | Proposed: reviewed report thresholds; Core |
| T09 Every utility view/export and blocked action audit | Partial / Launch | apps/api/app/live_workflows.py | Extend audit to all new scoped aggregate, bill, export and command handlers. | No business value introduced by this item.; Core |
## U. Internal operations panels A–M

Source: AtoZ T; supplement 2.9.

| ID / feature | Status / scope | Code evidence and current boundary | Remaining work | Configuration / lane |
|---|---|---|---|---|
| U01 A Fleet/contact/qualification/profile/firmware views | Partial / Launch | apps/api/app/ops_metrics.py; apps/web/components/OperationsMetrics.tsx | Map, lifecycle/batch, firmware distribution and outage frequency. | Proposed: fleet retention and map privacy; Core |
| U02 A Reported modem counters, RSSI and observed traffic | Built / Launch | apps/api/app/ops_metrics.py; database/migrations/040_transport_reports.sql | Production GSM HAL; carrier-plan cap/billing adapter. Stored JSON size is not SIM traffic. | No business value introduced by this item.; Core |
| U03 B Alert/tamper queue, response time and false positives | Partial / Launch | apps/web/components/StaffAlertQueue.tsx | Scoped cross-fleet feed, review outcomes, device completeness score and response metrics. | Proposed: incident SLA and completeness rules; Core |
| U04 C Onboarding and basic adoption | Partial / Launch | apps/api/app/ops_metrics.py | Time-series cohort adoption and tier movement from genuine data. | No business value introduced by this item.; Core |
| U05 C Acquisition attribution/CAC/leaderboards | Missing / Deferred | No executable implementation identified. | Requires explicit attribution, spend sources and approved programmes. | Proposed: attribution/spend/payout sources; Core |
| U06 D Reconciliation and outstanding wallet liability | Partial / Launch | apps/api/app/live_workflows.py | Exact liability/revenue summaries and discrepancy cases; no invented financial metrics. | No business value introduced by this item.; Core |
| U07 D Burn/runway/payback economics | Missing / Deferred | No executable implementation identified. | Approved external finance/cost sources and definitions. | Proposed: finance inputs; Core |
| U08 E Support/dispute metrics and review ownership | Partial / Launch | apps/api/app/live_resources.py | Resolution-time and deployment-type summaries; existing case workflow retained. | No business value introduced by this item.; Core |
| U09 F Error, communication, webhook and OTA exceptions | Partial / Launch | apps/api/app/live_workflows.py; apps/api/app/firmware.py | Unified sanitised exception records and operator resolution UI. | Proposed: error retention/redaction rules; Core |
| U10 G Compliance statuses, evidence and expiry warnings | Missing / Launch | No executable implementation identified. | Track data protection, STS, pole access, utility agreements and next action; never claim certification. | Proposed: compliance requirements and warning intervals; Core |
| U11 H Field dispatch, diagnostics, RMA and decommission | Partial / Launch | apps/api/app/live_workflows.py | Complete lifecycle/decommission and documented safety/commissioning prerequisites. | No business value introduced by this item.; Core |
| U12 I Inventory, suppliers and re-costing | Missing / Deferred | No executable implementation identified. | Stock ledger, reorder alerts, suppliers/lead times and approved cost inputs. | Proposed: stock/reorder/pricing inputs; Core |
| U13 J Real feature/rules editor | Missing / Launch | No executable implementation identified. | Typed global/tier/building/organisation controls, effective versions and rollback; see B. | Proposed: business_rules; Core |
| U14 K Staff access/export audit | Partial / Launch | apps/api/app/db.py; apps/api/app/live_workflows.py | Cover every staff read/export and add a scoped query/export UI. | Proposed: access audit retention; Core |
| U15 L Regional expansion tracker | Missing / Deferred | No executable implementation identified. | Region adoption, tariff differences and relationship records. | Proposed: regional records; Core |
| U16 M Vendor/partner/contractor tracker | Missing / Deferred | No executable implementation identified. | Telco/payment/contractor status and caps; evidence-backed portfolio view. | Proposed: contract/partner records; Core |
| U17 Reviewed manual pilot allocation tools | Missing / Launch | No executable implementation identified. | Balanced attributable QA/pilot adjustments separated from real-money vending, permissions, reason and audit. | Proposed: adjustment approval policy; Core |
## V. Agents, referrers and commercial payouts

Source: Supplement 2.1,2.1a,2.1b.

| ID / feature | Status / scope | Code evidence and current boundary | Remaining work | Configuration / lane |
|---|---|---|---|---|
| V01 Enabled-role applications and referral code issuance | Stub / Deferred | apps/api/app/live_resources.py | No live referral implementation; role flags and approval workflow required. | Proposed: role.agent.*; role.referrer.*; Commercial programmes |
| V02 Attributable signups and conversion funnel | Missing / Deferred | No executable implementation identified. | Persist invite/code attribution with abuse controls and source-qualified conversions. | Proposed: attribution and qualification rules; Commercial programmes |
| V03 Accrued versus paid commission ledger | Stub / Deferred | apps/api/app/live_resources.py | Rule-version snapshots, reversals and balanced payable accounting. | Proposed: payout amounts/currency/hold/effective dates; Commercial programmes |
| V04 Scheduled payable review and disbursement | Missing / Deferred | No executable implementation identified. | Weekly/monthly configurable batches, approved beneficiary, provider reconciliation and audit. | Proposed: payout.schedule; provider credentials; Commercial programmes |
| V05 Installer/agent/referrer dashboards and earnings | Partial / Deferred | apps/web/app/portal/page.tsx | Only installer jobs work today; role-specific programme pages remain deferred. | No business value introduced by this item.; Commercial programmes |
## W. Evidence-backed insights and recommendations

Source: AtoZ I,6; supplement 2.10.

| ID / feature | Status / scope | Code evidence and current boundary | Remaining work | Configuration / lane |
|---|---|---|---|---|
| W01 Bill forecast and confidence/coverage | Missing / Deferred | No executable implementation identified. | Current approved tariff plus sufficiently complete measured history; labelled estimate. | Proposed: minimum history and forecast rules; Analytics |
| W02 Pattern-study heat map and habits | Missing / Deferred | No executable implementation identified. | Qualified 24x7 usage aggregation with honest gaps. | Proposed: period/history rules; Analytics |
| W03 Appliance fingerprints with confidence | Missing / Deferred | No executable implementation identified. | Validated model/source hardware; no appliance guesses as facts. | Proposed: approved model versions and thresholds; Analytics |
| W04 Qualified power factor | Partial / Deferred | firmware/include/core.hpp | Uplink/storage/profile capability and UI require simultaneous calibrated V/I data. | No business value introduced by this item.; Analytics |
| W05 Under-supply credit statement estimate | Missing / Deferred | No executable implementation identified. | Qualified outage hours plus approved method; not an entitled utility refund. | Proposed: estimate methodology and tariff source; Analytics |
| W06 Anonymous same-pole peer comparison | Missing / Deferred | No executable implementation identified. | Server aggregates, cohort/quality minimum, distribution, own marker and period views. | Proposed: privacy/comparability thresholds; Analytics |
| W07 Alignment score, not accuracy certification | Missing / Deferred | No executable implementation identified. | Aligned upstream evidence and coverage; score must not be marketed as electrical accuracy. | Proposed: calibration-approved scoring rules; Analytics |
| W08 Dismissible savings recommendations | Missing / Deferred | No executable implementation identified. | Source-backed kWh/naira estimates and persisted dismiss state. | Proposed: recommendation policy; Analytics |
| W09 Advanced model adapter with simple fallback | Missing / Deferred | No executable implementation identified. | Same API, model version/confidence and history-based fallback; no fabricated output. | Proposed: model rollout and validation policy; Analytics |
## X. Organisation and white-label scaling

Source: Supplement 2.10.

| ID / feature | Status / scope | Code evidence and current boundary | Remaining work | Configuration / lane |
|---|---|---|---|---|
| X01 Organisation branding lookup | Partial / Deferred | apps/api/app/live_resources.py | Load-time subdomain branding is not wired into every shell. | No business value introduced by this item.; Organisation platform |
| X02 Scoped organisation administrator console | Stub / Deferred | apps/web/app/admin/organizations/[id]/page.tsx | Provisioned organisation admins, branding/plan editing and scoped ops. | No business value introduced by this item.; Organisation platform |
| X03 Organisation isolation across all data | Missing / Deferred | No executable implementation identified. | Explicit organisation keys, scoped API/RLS, migration and cross-organisation adversarial tests. | No business value introduced by this item.; Organisation platform |
| X04 SmartClamp Socket/accessory role | Missing / Deferred | No executable implementation identified. | Real approved hardware profile, registration/readings/control path and manufacturer acceptance. | Proposed: accessory capability flags; Organisation platform |
## Y. Water and gas later additions

Source: Supplement 2.12; owner explicitly deferred launch.

| ID / feature | Status / scope | Code evidence and current boundary | Remaining work | Configuration / lane |
|---|---|---|---|---|
| Y01 Provider adapters and payment-only utility selector | Stub / Deferred | apps/web/app/utilities/page.tsx | Actual provider validation/vending adapters; default disabled. | Proposed: utility enable flags and approved providers; Later utilities |
| Y02 Source-aware per-utility wallet/history/disputes | Missing / Deferred | No executable implementation identified. | Payment-only fields, utility-specific units and approved fees. | Proposed: utility-specific pricing/fee rules; Later utilities |
| Y03 Multi-utility tabs without electrical instruments | Missing / Deferred | No executable implementation identified. | Show only linked/enabled utilities; no voltage/relay/tamper invention for water/gas. | No business value introduced by this item.; Later utilities |
## Z. Launch, QA, deployment and truthful review

Source: AtoZ 1,9,14; supplement 0,2.14.

| ID / feature | Status / scope | Code evidence and current boundary | Remaining work | Configuration / lane |
|---|---|---|---|---|
| Z01 External migrations and immutable checksums | Partial / Launch | tools/supabase_migrate.py; docs/deployment/SUPABASE-fmjzskjkvdbffwkiujnu.md | Owner reports 001–039 externally verified. Pending development migrations stay local until one final bundle. | No business value introduced by this item.; Core |
| Z02 Browser sequence privilege fix | Partial / Launch | database/migrations/042_revoke_browser_sequence_access.sql; apps/api/tests/test_sequence_security.py | Locally tested; include in final consolidated migration, not the other chat’s conflicting draft 040. | No business value introduced by this item.; Core |
| Z03 Live Auth/SMTP/Google/SMS and redirect configuration | Partial / Launch | docs/LAUNCH-INPUTS.md | Other chat reports SMTP unset, Google/phone disabled, localhost Site URL and no redirects; configure approved deployment values. | No business value introduced by this item.; Core |
| Z04 Backend database TLS/API/worker and preview access | Partial / Launch | apps/api/app/__init__.py; docs/LAUNCH-INPUTS.md | Production API/worker credentials, health and routing unverified; protected Vercel preview prevents user testing. | No business value introduced by this item.; Core |
| Z05 Real ESP production HAL and hardware acceptance | Missing / Launch | No executable implementation identified. | Approved BOM/pins, sensing, actuator feedback, GSM, RS485/ESP-NOW, BLE and outage persistence; native libraries are not complete firmware. | Qualified hardware configuration; Hardware |
| Z06 OTA signed artifacts, staged rollout and rollback | Partial / Launch | apps/api/app/firmware.py; firmware/include/cloud_agent.hpp | Direct Wi-Fi commissioning path exists; actual GSM/relayed resumable OTA and physical rollback qualification remain. | No business value introduced by this item.; Core |
| Z07 Isolated simulator and full-loop review data | Partial / Launch | apps/web/components/InvestorDemo.tsx; tools/browser_qa.py | Real connected review accounts need safe data/environment isolation and secure admin access; no silent fake production readings. | No business value introduced by this item.; Core |
| Z08 Viewport, accessibility, keyboard and reduced-motion QA | Partial / Launch | apps/web/tests; tools/verify.sh | Repeat relevant final journeys at 390/768/1440; no blanket pass for untouched screens. | No business value introduced by this item.; Core |
| Z09 Configuration/provisioning and one final launch handoff | Partial / Launch | docs/LAUNCH-INPUTS.md; docs/DATA-PROVENANCE.md | Final exact environment/settings/SQL/account/provider/hardware checklist after implementation; no repeated interim SQL requests. | No business value introduced by this item.; Core |
| Z10 Backups, rollback/recovery and data-rights operations | Partial / Launch | tools/migrate.py; apps/api/app/firmware.py | Document/verify database restore, provider uncertainty, key rotation and operational runbooks. | Proposed: backup/retention and recovery policies; Core |
| Z11 Security invariants and launch scope enforcement | Partial / Launch | apps/api/app/db.py; apps/api/app/live_devices.py | Finish review of every new flow; cryptographic checks and physical rated limits are not arbitrary editable business rules. | No business value introduced by this item.; Core |

## Current external and acceptance boundaries

- Owner reports external migrations 001–039 verified with matching checksums. 039 hash: `80d823892481e1b2a3390c65d146e2f52d19c76ed7e22ad1a8de50170778b7e8`. The receipts are in the other chat’s checkout; this workspace has not read those files.
- Development migrations 040–043 are local pending work for one final consolidated handoff. The other chat’s proposed sequence fix must not overwrite this branch’s existing 040 transport migration.
- Supabase project health now responds HTTP 401 here. No callable Supabase connector or configured administrative/runtime credentials are exposed in this chat. No review accounts have been created here.
- Live Auth findings relayed by the owner: email confirmation on; SMTP unset; Google and phone disabled; localhost Site URL; no redirect allowlist; JWT 3600s, refresh rotation enabled. Production API/worker/TLS and app-level checks remain unverified behind the protected preview.
- Latest full API checkpoint: 89 tests run, one separate SMTP class skipped (88 passed). Reconciliation browser journeys passed 2/2; prior main regression: 50 passed plus corrected consent-history retry 1 passed across two runs. The actual SMTP suite separately passed two API checks and one browser journey. Repeat relevant checks after new code changes.
- All six ESP profiles compiled in the automation checkpoint; native policy tests pass. This does not instantiate production sensing, actuation, BLE, GSM or local-link adapters.
- Exact launch BOM/pin map is still requested. No new price, payout, loss-allocation policy or claimed certification is invented.
