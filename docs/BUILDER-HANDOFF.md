# Builder handoff

Read [launch readiness](LAUNCH-READINESS.md) first, then [runtime API](API-RUNTIME.md), README and the source product/page specifications. The owner has authorized website and backend implementation. Preserve the approved UI and extend the actual persisted workflows; do not restore the removed demo API, fake bank details or timer-confirmed state.

The current frontend/API/worker and ordered migrations exist. The broader original contract includes unimplemented scope; the runtime manifest enumerates actual handlers. Continue from the explicit missing-work list in launch readiness. Unique factory identity provisioning exists, but hardware commissioning and production firmware adapters remain incomplete.

For every remaining workflow, implement all user steps, authorization, persisted records, provider side effects, observed physical outcome where applicable, notification, dashboard update and recovery. Test actual database/auth paths and isolate provider fixtures to tests. Record external acceptance gates separately. A successful build or a static page is not an end-to-end acceptance pass.

Do not invent company facts, plan prices, tariffs, meter support, payment settlement, legal claims or calibration. Owner-supplied launch inputs are listed in the readiness document. Hardware interfaces that remain unspecified require a qualified BOM/adapter and bench tests; they are not one-line naming changes.

[Implementation contract](IMPLEMENTATION-CONTRACT.md) remains the source of normative product precedence and the loop catalogue. Original Word documents have readable transcriptions in sources/.
