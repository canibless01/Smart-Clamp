# Copy this prompt into the next chat

**Continuation checkpoint, 13 November 2026:** Read `docs/IMPLEMENTATION-MATRIX.md`, `docs/FIRMWARE-UPDATES.md` and the appended current sections of `docs/API-RUNTIME.md` and `docs/LAUNCH-READINESS.md` before using the older baseline inventory below. Migrations now run through 022. Work-order management, opt-in SMS, signed firmware upload/cohorts, a real safe ESP32 Wi-Fi/TLS commissioning agent, standalone and central-meter payment destinations, actual-unit/FIFO reconciliation, lost-payment callback recovery, and signed measurement reports/CSV are implemented. Production metrology/actuation/GSM/local-link HALs, offline prepaid policy, schedules/budgets, subscriptions and the remaining matrix rows are not complete. Push verified checkpoints frequently; do not accumulate the entire session locally.


Continue implementing `canibless01/Smart-Clamp` from branch `ui-revamp`. Preserve its current approved UI and all verified work. Check out the latest remote commit on that branch; do not restart from main, clear the repository or restore the old prototype. Inspect `git status` and local instructions first. Do not assume local processes, Docker containers, credentials or QA files survived from the previous chat.

My goal is a complete SmartClamp ecosystem that can launch with a documented configuration/provisioning process. Ultimately I want to run the SQL, enter real environment settings, provision/flash the hardware and use the real website. Do the remaining implementation and testing, not just another architecture review. Be explicit whenever a missing implementation or physical qualification means that goal has not yet been achieved. Do not call a static page, fake success response, mocked provider test or bench firmware a completed product.

Read these files in this order before making changes:

1. `README.md`.
2. `docs/LAUNCH-READINESS.md` — current completion limits, tested loops, deployment and pending owner details.
3. `docs/API-RUNTIME.md`, `contracts/runtime-openapi.yaml`, `contracts/runtime-routes.json` — actual API handlers. The older `contracts/openapi.yaml` is the broader 128-operation product specification, not proof of implementation.
4. `docs/IMPLEMENTATION-CONTRACT.md`, `docs/PRODUCT.md`, `docs/DECISIONS.md`, `docs/ARCHITECTURE.md`, `docs/BUILDER-HANDOFF.md`.
5. `docs/sources/master.md` and `docs/sources/build-guide.md` — searchable transcriptions of my original documents. Reconcile overlapping/contradictory requirements explicitly. No Word/PDF reader or re-upload is needed to recover their contents.
6. `docs/pages/INDEX.md`, the relevant page specifications, `docs/UI-REVAMP.md` and `apps/web/data/catalogue.ts`.
7. `firmware/README.md`, `firmware/HARDWARE-CONFIG.md`, all firmware headers/entrypoint, `contracts/device-protocol.md` and test vectors.
8. `database/README.md`, every numbered migration, and actual frontend/API/worker code. Keep applied migration files immutable; use a new numbered migration for further changes.

What already exists:

- Next.js 14.2.35 frontend with the owner-approved white/forest/sage style, self-hosted typography, concept home image, motion with pause/reduced-motion support, accessible navigation, explicit links/actions, responsive layouts and no fabricated account readings.
- A six-device public carousel and individual device pages, detailed plan comparison and plan pages. Paid prices are not confirmed. Features still incomplete are marked planned/unavailable; finish required launch features rather than treating those labels as their implementation.
- Real Supabase Auth integration in Flask, PostgreSQL persistence, scoped room/device relationships, single-use device claims, resident invitations, measured history, preferences, support requests/messages and a durable outbox worker.
- Actual payment provider adapters, itemized quotes, persisted checkout identity before HTTP, HMAC-authenticated and provider-verified callbacks, reserved/available ledger transitions, vending/requery, and explicit meter-token acceptance attestation. There are no runtime fake bank details or financial success fallbacks.
- Real operations fleet/work-order records, including repair requests; NEPA visibility requires explicit organization membership and assigned device scope. This is not yet the entire A–M internal organization system or a completed utility billing/control workflow.
- Signed device ingest/poll/receipts with durable deduplication, source-time handling, protection/tamper signals, independent OFF restrictions and measured usage accounting. Late/out-of-order readings must not duplicate charges or overwrite newer observations. Recharge must not clear unrelated restrictions.
- Factory identity provisioning CLI generates distinct per-device telemetry/command keys and a private mode-600 bundle. It does not commission sensors or implement firmware adapters.
- Versioned SQL through migration 014, deny-by-default direct browser table access and deferred ledger balance/immutability constraints. No fake customer/stock/pricing data is seeded.
- Source contract/native policy verification passes. The latest checkpoint passed 18 real local PostgreSQL/GoTrue integration tests, 15 production-browser tests (including one real API/database landlord→room→claim→invite→resident→quote journey), WCAG AA automated checks for the main public pages, and a Next.js production build. An API container build also succeeded. Re-run relevant checks after changes; do not reuse these results as evidence for new code.

Critical remaining work, in priority order:

1. Audit actual implementations against the source requirements and build a concrete action/acceptance matrix. Follow user actions all the way through persisted state, provider/device outcome, notification, the appropriate dashboards and recovery. Cover homeowner, tenant, landlord, installer, internal ops/finance/support/engineering/admin and NEPA roles. Never call all loops finished because a subset passes.
2. Finish required phase-one backend/UI work: approved prepaid policy and device synchronization, physical credit cutoff/restore behavior, schedules/budgets with trusted clock/offline recovery, subscription provider/entitlements, dispute/report/export flows, notification providers and remaining internal operational workflows. Decide availability honestly from actual implementations. Water/gas remain disabled and must be enforced on the server until implemented and qualified.
3. Resolve unmetered-building settlement and the exact shared-meter payment policy from my source documents. Current code deliberately rejects unmetered-building activation and payments without an approved meter/tariff destination. Do not invent electricity resale, tariff, refund or credit-allocation policy to force this path to appear successful. Implement supported paths and list any specific owner decisions still required.
4. **Firmware is still bench-only.** `firmware/src/main.cpp` currently prints bench status and does not instantiate production hardware adapters. Six successful builds do not prove ADC, relay, modem, radio, flash or optical operation. Implement and test the device adapters and integration that can be specified from the documents: sensor calibration/phase-corrected real power/counters, non-blocking safety task, durable journal/ACK/replay rules, real feedback/interlocked latching relay driver, GSM transport, ESP-NOW forwarding, RS485 hub/room frames, trusted clock/time sync, provisioning, supported optical protocol, safe OTA if in launch scope. Production must refuse unqualified sensing or actuation. Keep physical acceptance requirements explicit where hardware is unknown; no firmware can truthfully be declared flash-and-operate ready solely from a generic ESP32 label.
5. Document power-loss and internet recovery concretely: qualified hold-up/supercapacitor and power-fail sensing, durable event/counter writes, original observation timestamps/clock confidence, replay after reconnection, server deduplication and stale/unknown UI states. Do not invent capacitor capacity, sample accuracy or a mains design without electrical qualification.
6. Research actual official APIs and similar products if networking is available. I suggested **vendr.ng** for its homepage meter lookup, plus Emporia/Sense/Octopus for visual/product inspiration. Previous attempts to reach vendr.ng were blocked by the environment proxy (403); no one has actually reviewed its current implementation. A network draft was saved for Google, Vendr and official Paystack/VTPass domains, but publication was required and I could not save/publish it. Verify effective access in this chat before claiming access. Public UI observation does not reveal a competitor’s private backend. Prefer current official API docs for account validation, service IDs, token delivery, callbacks, transfer/refunds and reconciliation. Public lookup must not promise live balance/history from a meter number or reveal private full addresses.
7. Close deployment/configuration gaps: real Supabase Auth/SMS, merchant activation, webhook setup, approved tariffs/fees, factory device registration, calibration/commissioning and operator membership/scope setup. Use/revise `tools/check_config.py`, `tools/migrate.py`, `tools/provision_device.py`, Docker configuration and exact runbooks so a builder does not need the previous chat to operate them. A Next.js deployment alone does not run Flask or the outbox worker.
8. Verify desktop and mobile user journeys against real local auth/database services, then external provider sandboxes and actual hardware where available. Test uncertain payments, duplicate/reordered messages, rejected invitations/claims, occupancy privacy, lost internet, power failure, stale gateways, relay feedback failure, tamper, over/under-voltage, recovery, debt/zero credit and restrictions that remain after recharge. Test fixtures belong only in tests; never add an application test-success endpoint or mock production record.

Owner preferences and constraints:

- Keep the clean, spacious approved UI. Avoid cramped mobile text, dense prose/card repetition and harsh green/yellow blocks. Use purposeful charts/diagrams/motion when supported by actual data. Links and secondary buttons must visibly look interactive. Product imagery is concept imagery until actual product photographs are supplied.
- Basic/Basic Pro share sensing hardware; Pro control needs a physically fitted, commissioned relay. House Full prepaid/safety is a separate installed service capability. A subscription never creates physical hardware or substitutes for safety qualification.
- The early tabletop MVP image used an ESP8266, a 5A module and an ordinary relay. It is reference context only, **not** the production BOM. Production intent comes from the documents. The exact ESP32/module/wiring/calibration details are not all confirmed. Generic pin proposals are documented as proposals, not measured electrical facts.
- I have no final company/legal/team/support/domain/launch pricing details yet. Keep the owner-input checklist; do not invent those facts or keep asking for them while independent work remains.
- Keep changes reviewable and preserve my work. Push verified changes to the working GitHub branch and report the exact commit/branch. Do not force-push or publish the cloud environment. Distinguish GitHub push, Vercel deployment, external database changes and environment publication.
- Use the supported network/credential settings and never ask for secret values in chat. The previous chat did not create or migrate my external Supabase project. Local test migrations are not proof that a live project has been configured.

Useful commands (read README for full prerequisites):

```sh
python -m pip install -r apps/api/requirements.txt
python tools/qa_services.py start --config /tmp/smartclamp-qa.json
SMARTCLAMP_QA_CONFIG=/tmp/smartclamp-qa.json python -m unittest discover -s apps/api/tests -v
bash tools/verify.sh
```

For browser integration, start `tools/browser_qa.py` against that isolated QA config and pass its private fixture path through `SMARTCLAMP_BROWSER_FIXTURE`. The fixture is single-use for the claim/invitation journey; regenerate before repeating it. Never deploy its phone auto-confirm or test provider fixtures. Vercel Root Directory is **`apps/web`**, not the npm package name `smartclamp-web`.

Continue taking useful actions. When a physical or external prerequisite is unavailable, complete and test independent work, make that exact boundary visible, and leave an executable, specific handoff rather than a generic “connect the API” instruction. My objective is to minimize everything left before launch, not to receive an unsupported promise that nothing remains.
