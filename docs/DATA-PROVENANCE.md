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
