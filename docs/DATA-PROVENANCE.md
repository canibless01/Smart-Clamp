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
