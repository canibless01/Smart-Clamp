# Product and scope
## Mission
Provide Nigerian households with an attributable record of electricity consumption, fair room-level allocation, and self-service control where installed hardware supports it. The first pilot is shared housing with an existing central meter near FUTA; the audience is property owners and residents, not exclusively students.

## Operating models
- Shared housing with meter: building meter plus pole measurement, House Full in each room, RS485 to Building Hub. Each room's own balance pays for its own measured consumption. Central-meter vending and internal room accounting must reconcile separately; never imply payment credits the physical meter until a provider confirms vending.
- Shared housing without meter: incoming building measurement plus per-room devices. The landlord remits the pooled contribution externally. No utility payment API is assumed. Provisional unit price uses latest actual bill / matched-period building kWh, plus a disclosed margin. Final allocation uses room kWh / building kWh × bill. Zero denominator and incomplete readings block automatic allocation. Settlement cadence remains unresolved; do not launch this model until decided.
- Single home Basic: pole measurement, no control. Basic Pro adds analytics. Pro adds a relay on that same pole device; never a redundant in-house Sub device.
- Existing meter: anonymous validation checks account identity only. IR-Reader enables supported meter readings; manufacturer controls are separate integrations with explicit permission. Manual readings retain provenance and are not equivalent to calibrated measurements.

## Roles and permissions
Tenant sees own room and consumption; homeowner sees own devices; read-only invitees see only granted data. Landlord manages owned buildings and occupancy, views building accounting, and requests maintenance bulk control with step-up authentication. No rent-related punitive cutoff or unit resale. Installer handles assigned installations and diagnostics, agent/referrer tracks attributable leads and payouts. Utility staff is provisioned by admins, region-scoped, and sees aggregates by default. Internal staff are separately scoped to ops, finance, support, engineering, superadmin. Public visitors see only deliberately published projections.

## Cross-cutting rules
All money is decimal or integer minor units, never floating point. Wallet electricity and subscription balances are separate. Subscription expiry never cuts power. A confirmed webhook credits once per gateway reference, inside an atomic ledger transaction; checkout redirects are not payment proof. Retried readings and commands must be idempotent. Unknown/stale data is shown explicitly, never as zero usage or verified status.

Verification compares aligned energy intervals and topology: clamp/meter (5%), pole/downstream (8%), transformer/poles (10%) are source-proposed thresholds requiring calibration. Three consecutive valid drift windows are evidence for investigation, not proof of theft. No community-wide cutoff on connectivity failure. Five source detection layers: physical/magnetic symptoms; relay/current correlation; upstream drift; usage-pattern anomalies; public accountability. Privacy and false-positive review apply before public disclosure.

Nine Basic Pro capabilities: load signatures, power factor, under-supply credit estimate, bill forecast, anonymized same-pole benchmarking, hash-chained evidence, scheduled reports, SMS/USSD query, and revocable read-only viewers. Predictions and credit calculations are estimates until validated or settled.

## Phases and acceptance gates
0: public education/validation, account and device read views, minimal fleet tools. Source permits insecure prototypes; this foundation requires identity and command authentication before any deployed relay control.
1: flagship shared-meter pilot, six device roles, signed readings, local buffering, authenticated control, payments, disputes, reports, Basic Pro, SMS/USSD, ops A–K. IR hardware requires supported-meter tests.
2: deeper DLMS/Modbus adapters, manual reading evidence, tariffs, linked smart-home integrations, ops L–M.
3: utility partnership, regional utility views, explicit revocable control consent, transformer-scale correlation, STS work.
4: multi-property analytics, organization branding, validated anomaly models, optional SmartClamp Socket (future hardware, not a seventh current device).
5: water/gas vending through existing wallet patterns, without applying electricity relay/sensor logic to other utilities.

Pricing in sources is an outdated baseline pending procurement. Do not publish final prices, untested accuracy, install-time guarantees, fabricated testimonials, universal meter compatibility, or certification claims.
