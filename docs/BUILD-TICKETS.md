# Ordered implementation tickets
These are the next builder's work packages, not claims already implemented. Depend on IMPLEMENTATION-CONTRACT and its normative companions, not original Word access. Every ticket produces code, migration/config as applicable, meaningful tests and deployment notes. Sandbox/provider/hardware unavailable states are required, never fake success. Website implementation still needs the owner's separate instruction.

| ID | Depends | Deliverable | Acceptance evidence |
|---|---|---|---|
| T01 | — | canonical API clients/validators; route registry | OpenAPI validation, client/server contract tests; no unresolved refs or duplicate IDs |
| T02 | T01 | full Supabase schema, migrations and Auth/Storage/Realtime settings | clean reset+upgrade+drift check, restore drill; all DATA-CONTRACT entities |
| T03 | T02 | trusted membership/occupancy and scoped policies | cross-role/cross-tenant/old-occupancy/viewer-revoke tests; no service-key client exposure |
| T04 | T02/03 | durable ingest, deduping, journal ACK and outbox | identical retry credits once; conflicting same-seq quarantine; restart/ACK-loss tests |
| T05 | T04 | topology+coverage+outage read models | L03–06 incomplete coverage, clock uncertainty and delayed recovery scenarios |
| T06 | T02/03 | quote/payment/vending/ledger engine | L07/08 duplicate webhook, vendor failure, unknown outcome, refund and double-spend tests |
| T07 | T03/04 | command signing/outbox/receipt and step-up | golden vectors; replay/wrong-device/expiry/refusal; uncertain physical outcome |
| T08 | T07 | schedules/budgets/independent OFF-reason resolver | L10 recharge does not bypass protection/manual/budget; policy revoke and late schedule skip |
| T09 | T01/03 | web shells/roles/onboarding and public landing | DESIGN, LANDING-SEQUENCE,48 route registry; phone/tablet/desktop + accessibility |
| T10 | T04/05/06/09 | customer/building/homeowner read models and UI | same committed event updates scoped dashboards, freshness and reconnect states |
| T11 | T06/09 | checkout/status/bank transfer/subscription/order screens | uncertain payment doesn't double charge; subscriptions never cut supply |
| T12 | T05/07/09 | device diagnostics/command activity/connection help | WEB-STATE-MACHINES browser vs device vs source failure; no optimistic false state |
| T13 | T02/03/09 | disputes/evidence/report/support | immutable report verifies stored bytes; no private token leakage; scoped case attachments |
| T14 | T05/06/13 | notifications/SMS/USSD/ops A–K | deduped episode delivery, verified callbacks, finance reconciliation and staff access audit |
| T15 | hardware BOM | qualified sensor/relay/power-fail/flash adapters | POWER-LOSS measurements, waveform calibration, fail-safe feedback, cut-at-every-write tests |
| T16 | T04/07/15 | ESP-NOW/RS485/GSM device adapters | preserved original signatures, bounded framing/queues, durable ACK deletion, TLS verified |
| T17 | T15/16 | authenticated BLE and signed OTA/key lifecycle | secure provisioning, per-device keys, physical reset policy, canary rollback and secure boot qualification |
| T18 | T05/10/14 | metered shared-housing pilot | complete L01–15 applicable slice on real calibrated devices/provider sandbox; no fake payment success |
| T19 | T18 | supported meter/IR, tariffs, Tuya/Matter, ops L–M | actual meter association/model/keys and live adapter evidence; unsupported explicit |
| T20 | partnership | scoped utility dashboard/consent/bills/broadcast | L13 regional access, revocation at dispatch, disconnection list cannot actuate |
| T21 | T18 | multi-property/white-label analytics | organization isolation, confidence/cohort/privacy tests and measured model validity |
| T22 | utility provider | water/gas vending | utility-aware accounting; no borrowed electricity relay assumptions |

Release gates and external dependencies remain visible in RELEASE-GATES; a blank checkbox is preferable to invented proof. Source forecast/signature/predictive-safety statements are product aims until qualification. This repository's portable runtime and protocol tests support T07/08/15 design work, but do not close those implementation tickets by themselves.
