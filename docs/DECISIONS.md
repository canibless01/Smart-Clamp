# Reconciliation and open decisions
Evidence: docs/sources/master.md sections 03–16 and build-guide.md parts 0–7; uploaded OpenAPI remains contracts/openapi.source.yaml. Document wording such as “decided” is source evidence, not a new instruction from the owner. Owner explicitly requested repo reset, readable complete handoff, firmware, and no website build yet. Later clarification permits a proposed generic ESP32 wiring design and confirms GSM units are not built.

| Issue | Resolution / status |
|---|---|
| Master proposes Node/mobile; build guide specifies Next/Flask/Supabase | Adopt Next/Flask/Supabase as proposed implementation; preserve both sources |
| Master says 32 pages and 25 by Phase 1 | Inventory enumerates 31 named entries (26 plus five suffix entries); use stable IDs, not stated totals |
| Four pricing teaser cards omit Basic Pro | Final pricing comparison includes Free, Basic, Basic Pro, Pro, plus building enquiry |
| Phase 0 defers security but allows power switching | Require authentication/replay defense before deployed switching |
| “V × I = real watts” | RMS product is apparent VA; true watts require synchronous waveform average of v(t)i(t), phase calibration, and power factor |
| CT zero while relay ON implies tampering | May be no load or outage; correlate voltage, heartbeat, relay feedback and history; mark suspect only |
| Single home's pole directly compared to transformer | Compare transformer against aggregate complete downstream topology, not one home's unequal total |
| Cell tower changes imply theft | Network reselection is normal; confidence-based investigation, no cutoff |
| Gateway theft delays only its own data | Downstream devices lose that uplink too; retain local records and report dependent connectivity loss |
| Public lookup exposes customer name/address | Provider-approved masking and rate limits; private detailed reports use revocable scoped tokens |
| Bulk maintenance vs tenant protection | Landlord maintenance reason, scope, step-up and audit; never debt/rent enforcement |
| “Burn secret into firmware” | Provision distinct device secrets securely; never compile fleet secrets into shared images |
| 24h offline alarm and supercap outage | Distinguish power loss, poor coverage and tamper; supercap hold-up time is a measured electrical requirement |
| SIM800 vs SIM7000 | Separate modem adapters and carrier viability check; no universal AT implementation assumed |
| IR-Reader LoRa vs GSM | Bench/range decision pending; LoRa radio is additional hardware, not ESP-NOW |
| Native ESP32 Hall sensor | External Hall input in reference design; calibrate threshold and validate interference |
| ESP32 generic board | Proposed classic dual-core ESP32 DevKit; owner hardware still unverified |

## Before field flashing
Confirm board SKU; isolated analog front end, CT variant (current vs voltage output), burden/bias/filter values and ADC input limits; sensor calibration and phase compensation; relay model/coil driver/pulse/auxiliary feedback; mains isolation/creepage/enclosure; power-loss input and measured supercap hold-up; modem/carrier/APN/UART/power supply; RS485 transceiver voltage/termination/addressing; optical meter model/protocol/keys; secure provisioning and rollback/OTA signing plan. These cannot be inferred reliably from “generic ESP32.”

## Before financial pilot
Confirm real utility-vending provider and API contract; central-meter vs room-wallet reconciliation; no-meter settlement cadence and safety margin; tariff ownership; refunds/chargebacks; pricing; data retention/legal review; meter-reading accuracy qualification; gateway/SIM procurement; pole permissions; false-positive review; named operational owners. Analytics promises need measured validation.

## Source completeness
Full Word text is retained, including business model, SWOT-like risks, hiring, rollout, ops panels and future proposals. Future suggestions in master 24.5 (credit data, before/after efficiency, group solar purchase) remain proposals, not required Phase 1 features. Future builders must not silently treat these as approved implementation.
