# SmartClamp implementation and launch dependencies

This report supersedes any suggestion that the UI, API or six firmware builds are already a complete production system. The original source documents describe the intended ecosystem. They are not proof that every feature is implemented. The website now distinguishes implemented workflows from planned and unavailable functionality.

## What was exercised

Automated checks use actual isolated PostgreSQL and GoTrue authentication, with local provider HTTP fixtures in tests only. They do not contact a merchant account or switch a physical relay.

| Journey | Software evidence | Still needs live verification |
|---|---|---|
| Sign up and log in | Persistent profile, correct password required, returned role routes workspace | Supabase phone/SMS configuration, OTP delivery/recovery |
| Landlord creates building/room | Real persisted room list; scoped access | Building deployment and approved billing setup |
| Link SmartClamp | Staff-issued single-use claim code; owner claims into owned room; code cannot be reused | Factory registration, unique keys and physical commissioning |
| Resident joins | Private one-use invitation, role check, occupancy association | Real resident/landlord pilot |
| Measurements | Signed telemetry → durable inbox → outbox → measured readings/projection | Sensors, calibration, network/flash/clock adapters on real hardware |
| Electricity purchase | Itemized quote → real adapter checkout → authenticated provider webhook → reserved balance → delivery → credit | Merchant activation, provider catalogue, actual tariffs/fees, delivery reconciliation |
| STS token | Token remains pending entry until payer attests acceptance | Actual meter entry; attestation is not physical verification |
| Usage accounting | Counter deltas debit once, late messages do not repeat consumption, balanced ledgers | Meter accuracy and tariff/settlement validation |
| Outage/recovery | Repeated outage deduped, restoration closes episode, in-app messages | Hold-up circuit, RTC, original event time and offline replay |
| Tamper/protection | Signed signal persists; protection restriction recorded; never fabricated physical OFF | Detection hardware, signal qualification, measured relay feedback |
| NEPA review | Explicit organization membership + assigned device scope; no customer identity published | Contracted deployment, approved consent and investigation process |
| Internal operations | Real fleet counts and persisted installation/repair/inspection requests | Physical commissioning/payables, financial inputs and complete A–M panel scope |
| Remote command | Bound phone challenge → signed expiring command → device poll → signed physical receipt | SMS verification, firmware adapters and physical interlocks; rollout defaults disabled |

A real browser journey additionally covers landlord login, building and room creation, claiming a device, creating an invitation, resident login/join, private history and an itemized quote. Browser navigation is not a substitute for physical or merchant acceptance testing.

## What is not complete

The six PlatformIO targets currently build **bench firmware**. `firmware/src/main.cpp` now instantiates a private Wi-Fi/TLS commissioning agent with signed time, LittleFS retries and signed-OTA support. It still does not instantiate production sensor, GSM, ESP-NOW, RS485, optical-meter or actuator adapters; the sensing/safety task remains inert. Portable safety/runtime/cryptographic policy exists and has native tests. This does not make the firmware flash-and-operate ready. Exact module interfaces and field qualification cannot safely be replaced with invented pin/calibration values. See [hardware configuration](../firmware/HARDWARE-CONFIG.md).

Signed immutable measurement reports and CSV exports, opt-in SMS dispatch, actual-unit vending reconciliation, standalone meter-payment destinations, shared central-meter setup and field-work management are now implemented. Remaining application work includes physical factory provisioning/commissioning, automatic prepaid device-policy synchronization, schedules/budgets, approved unmetered-building settlement, scheduled/PDF reports and full dispute resolution, forecast/appliance models, subscription collection, auto-recharge mandates, generator sharing, customer consent/utility control, push/email/USSD, community publication, inventory/vendor/compliance/financial operations and organization administration. These must not appear to succeed in the UI. Water/gas are disabled; the API refuses unsupported utility quotes. A public flag cannot enable an unimplemented water integration.

A successful recharge clears only the wallet restriction. It cannot clear protection, maintenance, manual, budget or utility restrictions. Until prepaid policy synchronization is implemented and qualified, cloud wallet accounting alone does **not** enforce physical credit cutoff.

## Meter lookup and privacy

A meter number plus a selected electricity service is sent to the configured VTPass `merchant-verify` endpoint. No signup is required. Configure `VTPASS_API_KEY`, `VTPASS_SECRET_KEY` and `VTPASS_ELECTRICITY_SERVICES_JSON` (or the single-service fallback). Service identifiers must come from the actual approved provider catalogue. Validation returns a masked customer name and provider, not a public full address, live balance or usage history. Those live data require a supported installed reader or a formal utility integration. Linking the account saves a pending record and does not pretend optical connectivity is confirmed.

The current environment can reach vendr.ng. Its public homepage and official provider/device documentation were reviewed in this continuation; see [research notes](RESEARCH.md). Earlier proxy failures are historical. Public observation does not reveal its private backend.

## Deployment sequence

1. Deploy a Supabase project; configure phone authentication and an SMS provider. Obtain its Auth URL and anon key. Browser roles never grant staff privileges; approved staff and scoped organization memberships must be provisioned by an operator.
2. Configure server settings from [API environment template](../apps/api/.env.example), including a PostgreSQL connection and a durable Fernet encryption key. Do not put server secrets in `NEXT_PUBLIC_*` variables. Preserve key material across deployments.
3. Run `python tools/migrate.py` with `DATABASE_URL` provided securely. It applies ordered SQL, records checksums and refuses modified applied migrations. The pre-release 007/008 corrections must be reviewed if an earlier prototype schema already ran elsewhere; do not reset a deployed database to silence checksum errors.
4. Deploy the Flask API and the separate worker. Next.js alone does not process durable payments/readings. Configure the provider webhook URL `/api/v1/webhooks/payment` and verify merchant signing/transaction verification.
5. Set Vercel Root Directory to `apps/web`, Next.js preset, `npm ci`, `npm run build`. Set server `API_PROXY_TARGET` to the HTTPS API origin; browser `NEXT_PUBLIC_API_BASE=/api/v1`; set `SITE_URL` after the real domain is confirmed.
6. Load **approved** provider services, tariffs, destination wallet configuration, factory devices/keys, commissioning records and scoped staff access. No fake customer, inventory, price, bank account or operational records should be seeded as launch data.
7. Qualify actual hardware and integrations, then enable only implemented rollout flags. Run real purchase/refund/reconciliation, offline/replay, device protection and recovery acceptance tests before taking customer payments or enabling actuation.

SQL and environment variables are necessary, but they do not replace merchant onboarding, tariffs, factory provisioning or unfinished adapters. This is the exact remaining work, not an implication that configuration will complete missing software.

## Owner-supplied launch content

- Confirmed company/legal name and required registration disclosures.
- Public founder/team details and approved brand story.
- Verified support email/phone, hours and escalation policy.
- Live domain, launch geography, availability and installation lead times.
- Final hardware images/enclosures, supported meter models and qualified specifications.
- Paid plan prices, periods, retention limits, cancellation/refund terms.
- Approved electricity tariff/fee/markup and unmetered-building settlement policies.
- Legal privacy/terms, data processing/retention, consent and report wording.

Until confirmed, do not invent those facts. Product pictures are explicitly concept illustrations. Paid plans and unimplemented capabilities remain labelled accordingly.

## Reproduce checks

Install `apps/api/requirements.txt`, then start a fresh disposable local service stack:

```sh
python tools/qa_services.py start --config /tmp/smartclamp-qa.json
SMARTCLAMP_QA_CONFIG=/tmp/smartclamp-qa.json python -m unittest discover -s apps/api/tests -v
python tools/qa_services.py stop --config /tmp/smartclamp-qa.json
```

Docker is required. This stack permits test-only phone auto-confirm and must never be deployed publicly. Its generated credentials stay in a mode-600 config file. Tests use local provider fixtures, never runtime fallback payment success.

For the frontend, run `npm ci`, `npm run typecheck`, `npm run build` and `npm run test:ui` inside `apps/web`. Browser integration test `live-journey.spec.ts` requires the isolated API/fixture; its absence explicitly skips that test, not a readiness pass.

To run the real browser journey, start the isolated QA stack, export `SMARTCLAMP_QA_CONFIG`, then run `python tools/browser_qa.py --fixture /tmp/smartclamp-browser.json`. Start Next.js locally and run `SMARTCLAMP_BROWSER_FIXTURE=/tmp/smartclamp-browser.json UI_BASE_URL=http://127.0.0.1:3000 npm run test:ui -- --grep 'real auth/database'` from `apps/web`. Regenerate the browser fixture before repeating its single-use claim/invitation flow. The runner seeds only the isolated QA database and the provider fixture remains test-only.

Factory identity registration is provided by `tools/provision_device.py`: supply an approved staff profile ID, profile, HTTPS API origin and private output path while `DATABASE_URL` and `DEVICE_HMAC_ENCRYPTION_KEY` are set securely. It generates distinct per-device telemetry/command keys, encrypts server copies, audits registration and writes a mode-600 provisioning bundle. It deliberately leaves hardware uncalibrated and uncommissioned. A factory claim code can then be issued through the authenticated ops endpoint. Firmware adapter/commissioning implementation still remains.

Docker deployment uses repository-root context for the API image, so the worker, migration files and runtime contract are actually present. With secure `.env` settings in place, run `docker compose --profile tools run --rm migrate`, then `docker compose up -d api worker web`. The web image bakes its same-origin API rewrite during build; rebuild after changing that target or public build variables. Builds preserve TLS verification and accept a CA bundle through the `proxy_ca` build secret; Linux defaults to the system certificate bundle, configurable with `BUILD_CA_BUNDLE`. Docker does not activate merchant services or finish hardware adapters.

## Verified checkpoint

The latest local checkpoint passed 18 PostgreSQL/GoTrue integration tests, 15 production-browser tests (including a real backend journey), contract/native firmware policy checks, the Next.js 14.2.35 production build and an API container build. Provider fixtures were local test servers; no live merchant or physical device acceptance is implied. Migration 014 distinguishes measured usage intervals from an initial baseline/unknown interval, so the dashboard chart does not turn missing evidence into zero usage.

For a fresh assistant session use [the complete continuation prompt](NEXT-CHAT-PROMPT.md). Environment-specific temporary credentials/containers do not need to survive: the repository contains the scripts to create isolated QA services again.

## Current continuation

Read the [action/acceptance matrix](IMPLEMENTATION-MATRIX.md), [firmware update runbook](FIRMWARE-UPDATES.md) and [official-source research](RESEARCH.md). Migrations now run through 022. Applied migrations 001–014 were preserved. New quoted purchases pin their destination and separate estimated from actual provider units. Existing pre-018 credit without attributable funding lots must be reconciled before consumption processing; no historic provenance is fabricated. The report key is separate from the firmware key; `tools/bootstrap_secrets.py` prepares private files and `tools/check_config.py --database` verifies configuration and migration checksums.

A prepared website, SQL and credentials still do **not** complete the remaining software or unknown electrical integration. OTA upload/canary/receipt paths now exist, but their physical qualification is not implied. The safe provisioning agent is deliberately not advertised as a complete flash-and-operate device.

## Verification checkpoint, 13 November 2026

33 actual local PostgreSQL/GoTrue API integration tests passed, including lost initialization response/webhook recovery, same-reference retries, quote-expiry recovery, token/KCT retrieval, no credit for missing tokens, per-room actual-unit assignment and immutable signed reports/CSV. The 18-browser production checkpoint passed public UI checks and real landlord/resident, work-order, built-binary upload/canary and report/download/revocation journeys. All six ESP32 targets, the cross-language compiled firmware JSON/HMAC/RSA suite and API container build passed. Final payment-recovery UI changes are being rechecked after that browser checkpoint; the earlier browser result is not evidence for untested new changes. Provider fixtures remain test-only; no live merchant or physical hardware gate is implied.

A subsequent batch adds migration 023 and [signed prepaid allowance synchronization](PREPAID-POLICY.md). The API/native policy checks now cover 35 local integration cases plus durable allowance tests. This closes the software grant/receipt path, not physical cutoff/restore or persistent sensing integration.
