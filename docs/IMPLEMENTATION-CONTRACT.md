# Normative implementation contract, revision 2
This document closes design gaps for the next builder. Read it before source transcriptions. Rules marked **foundation decision** are new engineering decisions chosen to make the uploaded product implementable, not quotations or independently field-proven facts. Original source files remain unchanged. The website is still specified, not implemented.

## Precedence
Owner instructions > this revision's explicit reconciliation decisions > PRODUCT/DESIGN and page specifications > uploaded build-guide > uploaded master for product intent > source snippets. A contradiction must be resolved in DECISION-LOG, never silently guessed. Device protocol v1 in contracts/device-protocol.md overrides the source's underspecified rotating-code mechanism. Canonical HTTP paths/schema are in contracts/openapi.yaml; source YAML is historical evidence.

## Build without inventing behavior
Read LOOP-CATALOG, DOMAIN-RULES, ACCESS-MATRIX, NOTIFICATIONS, DATA-CONTRACT and RELEASE-GATES. These define the cross-component loops, not just page appearance. All defaults below are configurable product policy with explicit provenance. No builder should need the original attachments to understand intended behavior. External credentials, calibrated electrical parameters and provider contracts cannot be supplied by documentation; use defined unavailable/sandbox states rather than invented success.

## Deployment units
apps/web Next.js → apps/api Flask → services/worker + Postgres/Supabase. Firmware never directly writes Supabase. API validates identities/permissions, commits durable records and outbox in one transaction. Worker claims outbox rows using SKIP LOCKED, performs side effects idempotently and records outcome. Realtime emits committed dashboard projections; clients do not compute wallet or control decisions. Every dashboard reads the same versioned projections, not separately maintained business state.

## Build order
1. Contract validators/reference tests and database migrations/RLS tests.
2. Shared-meter sandbox vertical slice (reading → durable ingest → energy ledger → dashboard; verified payment → credit/vend → relay ACK).
3. Responsive public and auth pages, then customer/building flows and ops. The owner has requested this documentation/firmware handoff; website implementation waits for separate instruction.
4. Disputes/evidence, automation, notifications, manual collection and hardware qualification.
5. Phase2+ integrations behind explicit flags; utility access remains disabled without partnership/region/consent.

No model or static document can guarantee that an unknown future hardware BOM requires only two line changes. Configuration centralizes pins/calibration/timing; changing electrical interfaces or meter protocols requires an adapter and tests. This is an engineering boundary, not a missing UX decision.
