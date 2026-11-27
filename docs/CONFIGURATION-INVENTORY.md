# Configuration inventory

27 November 2026. Versioned typed settings are now available at `/ops/settings` (administrator edits; ops/engineering read-only). Scope order is device → building → organisation → region → global → environment/default. Every edit appends an audited effective version; restoring never rewrites history. Migration 043 is local-tested and pending the final live handoff. **Current** means the named setting/storage exists. **Required** is a work item, not a callable setting yet. Unknown approved monetary values stay unset; old examples are not production prices. All business edits need role/scope checks, validation, effective versions and old/new audit. The complete register identifies each feature and owner.

| Domain | Current implementation | Required configurable controls |
|---|---|---|
| Runtime and identity | `APP_ORIGIN`, API proxy/base, `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`; Supabase provider configuration | Approved live URLs/redirects, environment/review boundary, deployment/worker health |
| Secrets | Device encryption/HMAC, report/OTA signing, push/VAPID/email encryption and provider keys | Secure provisioning/rotation; never exposed by a public config endpoint or stored in the business-rules editor |
| Signup roles | Fixed safe customer-role allowlist; professional/staff role grants are privileged | Enabled role switches, installer training/approval, deferred programme defaults off; public flags never grant staff authority |
| Feature availability | `feature_flags` global/tier table and device capabilities | Scoped `features.automation`, `features.pro_relay_control`, `features.public_reports` now enforced; complete other feature-specific rollout checks. Hardware and authority guards remain separate |
| Subscription catalogue | Tier enums and current-plan read view; paid checkout disabled | Typed `billing.plan_prices` (nullable NGN minor units), `billing.discount_bps`, `billing.grace_days` now exist. Remaining: provider products/cadence, lifecycle application and cancellation/retention; checkout remains disabled |
| Electricity fees | Typed `payments.platform_markup_bps`, `payments.fee_bps`, `payments.fixed_fee_kobo`; environment fallbacks; frozen quotes record rule provenance | Approve actual scoped values; no retroactive quote/ledger rewrite |
| Tariffs | Versioned tariff rows with day/night fields | Approved tariff periods/source, region/org applicability and itemised bill computation |
| Recharge mandates | No active mandate implementation | Consent, threshold/reference balance, per-charge/day/month caps, cooling-off/uncertainty/cancel rules |
| Provider catalogue | Configured Paystack/VTPass, messaging, email and push adapters | Enabled providers/methods/regions; manufacturer's supported capability/version; allocated USSD shortcode only |
| Email quota | `RESEND_DAILY_EMAIL_LIMIT` (owner chose 100/day), monthly limit and OneSignal email fallback | Approved provider-plan changes and visible quota/reset provenance; never count an uncertain send twice |
| Notifications | User sensory/audio/haptic/per-type/quiet-hours settings and opt-in channel preferences | Typed repeat/escalation/clear rules, per-type channel matrix, digests and reminders |
| Supply analytics | `SUPPLY_PRESENT_MIN_MV`; explicitly sampled coverage | Validated observation-gap/coverage rules and source threshold provenance; never confuse this threshold with protection |
| Protection | Display manifests/advisory ranges; reference firmware still has fixed limits | Signed installer-approved per-device V/A/W limits, noise/debounce, modes, stability, override durations and immutable rated bounds |
| Budgets/schedules | WIP signed per-device settings; `AUTOMATION_ENABLED`; separate device qualification | Qualified runtime integration, per-trigger feedback, reported remaining allowance, thresholds/templates and period policy; edits cannot mint paid energy |
| Reconciliation | No complete drift engine | Calibrated comparison-specific tolerance, persistence/window/coverage, topology, statistical history and privacy cohort size |
| Shared-meter settlement | Private room wallets; actual vend/funded FIFO accounting | Central-source balance/credit adapter, unallocated energy and transparent participant agreement for any gap |
| No-meter settlement | Deliberately gated | Per-building running/per-bill mode, approved pass-through formula/correction inputs, custody, due dates, external payment evidence and shortfall agreement |
| Disputes | Versioned cases and immutable bill evidence | Proposed agreements, instalment cadence/limits, monetary adjustment approval, evidence/SLA and hold/release rules |
| Reports | Signed snapshots, source qualifications, QR/CSV/JSON/print | Typed `reports.link_lifetime_days` (1–31, environment fallback/default seven) and `features.public_reports`; remaining:, maximum period within safety/capacity bounds, schedules/purposes/retention |
| Installer/agent/referrer payouts | No complete accrual/disbursement path | Enabled programme, trigger, amount/range/currency, qualification, hold, weekly/monthly schedule, region/org overrides; deferred |
| Inventory and costs | No complete stock/re-costing workflow | Supplier/landed-cost/reorder rules; deferred |
| Legal/privacy/compliance | Legal versions and scoped consent records | Approved disclosures, data retention/subject requests, certifications/evidence/expiry warning intervals; no fabricated compliance |
| Later utilities/accessories | Server gates/unavailable pages | Default-off utility/accessory/provider flags and approved utility-specific fees/capabilities |

Operational configuration must remain distinct from cryptographic/security invariants: do not create a switch that disables signatures, exposes device secrets, bypasses RLS/ownership, fabricates a physical receipt or exceeds a qualified component's electrical rating. Configurable values require validated types/bounds and appropriate delegated authority.
