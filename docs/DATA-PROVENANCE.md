# Where each visible value comes from

Use this for product implementation and investor questions. Unknown means unknown; the isolated demo is explicitly sample data.

| Value or state | Actual source and conversion | What it does not prove |
|---|---|---|
| Voltage (V) | Qualified voltage-sensing channel; signed `voltage_mv` ingestion, divided by 1000 | A current-only CT cannot supply this value. Missing voltage sensing is not zero volts. |
| Current (A) | Qualified current channel; signed `current_ma`, divided by 1000 | A house and a factory need different installed ranges/limits; current alone does not establish supply quality. |
| Real power (W) | Signed `real_power_mw`, divided by 1000; portable metrology averages simultaneous calibrated voltage/current samples | `V × A` is apparent power, not generally real power. No synthetic real-power fallback is used for production. |
| Energy (kWh) | Measured cumulative import counters and eligible interval differences; milli-watt-hours divided by 1,000,000 | A cumulative reading is not the period's consumption. Missing intervals are not zeros. |
| Energy-over-time chart | Eligible measured energy intervals | It is not hours of supply. A separate supply-duration calculation needs trusted supply records and explicit coverage. |
| Supply present/lost | Signed, trusted-time device supply transition with freshness/quality checks | No contact, relay OFF, zero current or a neighbour's supply does not itself prove an outage at this home. |
| Relay ON/OFF | Authenticated signed physical command receipt/feedback with trusted observation time | A tap, queued command, timer or uncertain receipt is not a physical confirmation. |
| Pending/failed command | Durable command record, expiry and signed device result | Expiry says the command is unconfirmed, not that the light changed. |
| Available room units | Wallet/energy funding lots and immutable posted consumption after verified payment/vending | This is not necessarily the remaining balance on a shared upstream utility meter. |
| Shared meter supply balance | A supported actual meter reading or authorised utility integration | Summing tenant balances or reading a pole's energy counter cannot invent the meter's remaining credit. |
| Room totals | Current scoped room readings, summed only when coverage is complete | Unmeasured/common circuits are not included by assumption. |
| Offline/online | Authenticated contact timestamps and the configured connection window | Offline is not automatically no electricity, tamper or theft. |
| Tamper signal | Signed device signal; later qualified correlation can add evidence | A signal requests investigation. Community power plus one offline house is not proof. No community alarm or public accusation is emitted. |
| Voltage/current advice | Installation-specific declared advisory bands; explicitly configured global fallback where appropriate | Display advice is not a device-enforced setting or certified safety action. |
| Push/email/SMS status | Persisted provider request and receipt state | Provider acceptance is not inbox/handset display, reading or human acknowledgement. |
| Signature seal | Verification of the issued stored snapshot's signature | It preserves issued bytes; it is not meter accuracy, liability, theft or refund certification. |
| Firmware status | Signed artifact, approved rollout/cohort, device offer and device feedback | Upload/dispatch is not installation. Physical rollback/recovery needs actual board qualification. |
| GSM usage | Requires modem/network-reported byte counters and an understood provider billing basis | HTTP payload size or database storage size is not billable GSM usage. This value remains unavailable until its source is implemented. |
| Expected restoration time | A sourced utility notice or a validated, explicitly labelled prediction with confidence | Transformer measurements report current/recorded supply, not a guaranteed future restoration time. |

A pole/transformer channel enables upstream-to-downstream comparison only where topology, timestamps and measurement coverage are comparable. A central relay/contactor can only control what is physically downstream of it. Software cannot stop wiring that bypasses every qualified measuring/actuating point. Reconciliation produces inspection flags and evidence, not automatic blame or invented tenant charges.

## Sampled hours of supply

`GET /devices/:id/supply-history?days=1|7|30` pairs adjacent signed readings only when both have valid sensing, trusted timestamps, non-null voltage, the same supply classification and a gap no larger than 180 seconds. Other intervals remain unknown. The current and previous equal periods both expose coverage. No coverage returns null hours, never fabricated zero. The configurable `SUPPLY_PRESENT_MIN_MV` defaults to 50000 (50 V), the reference presence threshold, and does not configure protection. These sampled hours are not a continuous-availability guarantee, theft evidence or a utility credit determination. Scope starts at the tenant occupancy/viewer grant where applicable.

## Operations and cellular data

Onboarding counts come from persisted profiles; fleet qualification and contact counts come from the device registry; queue/outcome counts come from outbox and commands. Cellular usage comes only from authenticated gateway modem counter reports, paired within the same counter session and trusted source time. Missing or reset intervals are unknown. Signal strength is current only with trusted time and observation age below 180 seconds. Stored JSON text byte size is shown separately and is not network traffic or a SIM billing estimate. The production modem HAL remains dependent on the approved BOM.

## Downloaded reports

The signed JSON download preserves the server's exact canonical bytes, SHA-256, signature, public key and key fingerprint, alongside the parsed snapshot and qualification wording. New snapshots sign their issuing environment, including isolated QA. Integrity verification must use the canonical bytes and establish trust in the issuer's key fingerprint independently; an embedded public key alone is not proof of issuer identity. Print/save-PDF retains the signature reference, source coverage, limitations and QA disclosure. Sharing QR codes are generated locally from the issued revocable link, without third-party QR requests. Revocation blocks future public access but cannot erase copies already downloaded or printed.

## Automation and resident handover

Cloud policy acceptance is a signed configuration receipt, not a physical relay observation. Requested daily/monthly caps and weekly windows are labelled as requested. The commissioning image explicitly rejects automation enforcement because its production counter/storage/actuator adapters are not qualified. No timer or policy ACK changes the relay display.

Native budget state binds the signed resident UUID, key/config/counter epochs and monotonically versioned settings. Same-resident edits preserve measured consumption. A signed change to the current resident scope requires a new qualified anchor and fresh observation before readiness. A room cannot transfer while an old active automation policy remains or a disabled policy lacks its device acknowledgement. Pending reading work must settle before a transfer. Counter intervals crossing the occupancy boundary are not assigned to the incoming tenant: they remain unavailable for charging, with an immutable unallocated-usage audit record for reconciliation. This is not a forgiven or invented zero-energy interval.

Physical owners in occupied rooms retain authorised monitoring, but cannot control the tenant's relay, manage their viewers, publish their private report or inspect/spend their wallet merely because they own the hardware. Every write still checks current server authority.

## Building energy comparison

`GET /buildings/{id}/energy-reconciliation` is landlord-scoped and read-only. A single recorded parent and every recorded branch must stay in the same building/topology for the comparison window. Each source requires commissioned/qualified sensing, a qualified persistent counter, trusted valid readings, unchanged config/key epochs, nondecreasing counters, bounded sample gaps and policy-approved boundary skew. Sources expose actual first/last timestamps, reading IDs and signed inbox payload hashes. No interpolation or inferred zero fills a missing observation. Unconfigured timing/tolerance, reset, changed topology, excessive observations or absent coverage yields unknown. A genuine zero incoming delta is shown as zero but has no defined percentage reference.

The integer comparison uses `abs(incoming - sum(branches)) * 10000 > incoming * tolerance_bps`; the displayed ratio is informational. Approved skew allows different actual intervals, which remain visible. Recorded topology does not prove physical wiring or account for an uninstrumented/common branch. This is not a persistent theft-detection engine, financial settlement, unit allocation, live meter-balance adapter or relay policy. A residual never automatically debits a tenant or accuses anyone.

Building owners can record a single incoming/branch comparison group from the building rooms page. `GET/POST /buildings/{id}/topology` is ownership-scoped, checks the expected topology version, locks building/device rows, preserves old edges with end times and appends new edges/audit. POST is idempotent. An incoming room device, duplicate/self branch, foreign device, future topology or external/meter-source link is rejected. This declaration is explicitly not a physical wiring certificate. It does not change profile/capabilities, relay state, installed calibration, money or device credentials. The dedicated source still needs secure provisioning/installation association.

## Persistent comparison evidence

Migration 044 stores immutable closed-window snapshots and their policy/snapshot SHA-256 checksums. The owner explicitly requests recording after a configured collection delay. Snapshot policy resolution uses the window end timestamp, not a later newly published rule. Records retain actual source intervals, signed inbox references, topology version and qualifications. A late reassessment appends new evidence; the latest assessment for a time window counts once. Unknown coverage, a missing adjacent window, or changed topology/policy breaks consecutive review. A configured number of consecutive qualified differences produces `persistent_review`, which asks for investigation and does not prove theft. This is not automatic fleet scheduling, a wallet posting, utility vending, a cutoff policy or electrical certification. No charge is allocated to residents by this evidence register.

Closed-window downloads include exact canonical snapshot bytes as base64 with SHA-256 and explicit environment provenance; a separate `signature: null` prevents checksum integrity being presented as public-key issuer authentication. An owner-scoped export checks stored bytes against their checksum and lists retained assessment IDs for the same interval. Other owners cannot fetch these records.

## Automatic building comparisons

Migration 045 adds owner-opted schedules and explicit `recording_mode`. Automatic records have no impersonated resident creator; the snapshot records the schedule version and automatic mode. The worker processes full UTC-aligned windows after an approved delay, advancing the window cursor in the same transaction as immutable evidence. Retries after failure do not skip a window. Concurrent workers lock building then schedule and skip busy buildings. Unknown measurements become unknown evidence; a missing policy pauses the cursor. Ownership changes disable the former owner's schedule. Re-enabling or changing the interval starts a full new window rather than inventing past history. Last completion is shown only after a committed worker record.

Worker throughput knobs are `ENERGY_COMPARISON_SCHEDULER_BATCH_SIZE` (1–100, default 5) and `ENERGY_COMPARISON_SCHEDULER_TICK_SECONDS` (1–300, default 30). These bound operational capacity; approved timing/tolerance remains scoped business data. Scheduling is not utility escalation, hardware qualification, a financial allocation or a relay permission.
