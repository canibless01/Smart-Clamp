# SmartClamp — Electricity you can verify

**Integrated product — from device reading → authenticated ingestion → durable storage → processing → authorized dashboard, and quote → verified payment → vending → room credit → eligible command → device feedback.**

This repository was a documented ecosystem with firmware reference; it now contains a working, integrated implementation. See `ARCHITECTURE-OVERVIEW.md` for vertical slices.

## Start here

- [Implementation contract](docs/IMPLEMENTATION-CONTRACT.md) — normative precedence, gap closures, loop catalog
- [Builder handoff](docs/BUILDER-HANDOFF.md) — sequence and definition of done
- [Product](docs/PRODUCT.md) — mission, operating models, roles, phases
- [Architecture](docs/ARCHITECTURE.md) and `ARCHITECTURE-OVERVIEW.md` — deployment units and proven slices
- [Page inventory](docs/pages/INDEX.md) — 48 specifications, `contracts/routes.json` is the machine-readable registry
- [Landing sequence](docs/pages/LANDING-SEQUENCE.md) + [Design system](docs/DESIGN.md)
- [API](contracts/openapi.yaml) (128 ops, canonical) + [Device protocol](contracts/device-protocol.md)
- [Firmware](firmware/README.md) — 6 profiles, shared policy/runtime/crypto, bench-only entrypoint

## Quick start

```bash
# Foundation checks (no DB needed)
python3 tools/check_foundation.py
bash tools/verify.sh  # OpenAPI, protocol vectors, firmware core/runtime/crypto

# Web — 48 routes, responsive, accessible
cd apps/web && npm install && npm run dev    # http://localhost:3000
npm run build                                # production build, verifies all routes

# API — 128 operations, device HMAC, idempotent payments, OFF-reason resolver
cd apps/api && pip install -r requirements.txt
python -m unittest discover -s tests -v      # 6 core tests: meter validate, auth, scope, ingest dedup, idempotency, payment states
DATABASE_URL=sqlite:///smartclamp.db python app.py  # http://localhost:5000

# Database — versioned migrations, RLS, private Storage, Realtime
supabase start          # requires Docker
supabase db reset       # apply 001→008, drift check
# or: psql $DATABASE_URL -f database/migrations/*.sql in order

# Worker — outbox SKIP LOCKED, idempotent side effects
python services/worker/worker.py

# Client
cd packages/api-client && npm install && npm run generate
```

## Deployment units

`apps/web` (Next.js) → `apps/api` (Flask) → `services/worker` + Postgres/Supabase (Auth/Realtime/Storage). Firmware never writes Supabase directly; API validates JWT/HMAC, commits durable records+outbox in one TX; worker claims via `SKIP LOCKED`.

## Honest validation

Run `bash tools/verify.sh` after `pip install -r tools/requirements.txt` (needs C++17 + OpenSSL). See `docs/VALIDATION.md` for passed/blocked gates and `docs/RELEASE-GATES.md` for 9 gates with measurement requirements.

- Specified: docs + contracts + firmware reference
- Implemented: web + API + migrations + worker + client
- Tested locally: `verify.sh` + API tests + web build + protocol vectors
- Provider sandbox / hardware: labelled sandbox adapters; field qualification requires BOM, calibration, carrier, and procurement facts — no invented success

Do not clear the repo again. Preserve foundation + source references ( `docs/sources/` ) + this implementation.

## Key invariants (enforced)

Browser / device / grid / physical relay are separate facts. Requested ≠ confirmed. Recharge clears only zero-balance restriction. Subscription expiry never cuts power. Landlords cannot enforce rent via cutoff. Duplicate messages never duplicate credits/vending/actuation. Missing readings never become fabricated zero or false verified. Gateway ACK ≠ durable ACK. Utility control requires authority+scope+consent+step-up. Supercapacitor prioritizes logging, not guaranteed SMS.

## Design

Navy #102A43, canvas #F7F9FC, white surfaces, strong hierarchy, amber/green/red with text labels. Responsive: 320/768/1440, stack/reflow, no page-wide horizontal scroll, 44px touch targets, keyboard + screen-reader + reduced-motion complete. Graphs with units + accessible tables; illustrations for devices; concise cards for balances/status.

## Legal & safety

SmartClamp provides sub-metering/verification technology; it does not generate/resell/distribute electricity and does not replace your utility meter. Wiring/voltage/relay work requires qualified installer + isolation + enclosure. Predictive fire/shock claims are research, not life-safety guarantees. Legal text pending professional review.
