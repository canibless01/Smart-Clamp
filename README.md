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

## Quick start — fully functional after env + sql

### 0. Prerequisites
- Node 20+, Python 3.11+, Docker (for Postgres/Supabase), C++17 + OpenSSL for `verify.sh` crypto gate
- Copy env templates: `cp .env.example .env` then fill values; also `cp apps/api/.env.example apps/api/.env` and `cp apps/web/.env.example apps/web/.env.local`

### 1. Environment variables
All env vars are documented in `.env.example` at root, `apps/api/.env.example`, `apps/web/.env.example`.

| Variable | Where | Required | Default / Example |
|---|---|---|---|
| `DATABASE_URL` | api, worker | For persistence | `sqlite:///smartclamp.db` (demo) or `postgresql://postgres:postgres@localhost:5432/postgres` (docker) or Supabase pooler URL |
| `JWT_SECRET` | api | Yes in prod | `dev-secret-not-for-prod` fallback warns in logs |
| `CORS_ORIGINS` | api | — | `http://localhost:3000,http://127.0.0.1:3000` |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | api, web | For Supabase Auth/Storage/Realtime | `http://localhost:54321` when using `supabase start` |
| `PAYSTACK_SECRET_KEY` | api | For real payments | `sk_test_xxx` — sandbox adapter used if missing |
| `NEXT_PUBLIC_API_BASE` | web | — | `/api/v1` (same-origin proxy) or `http://localhost:5000/api/v1` (direct) |
| `API_PROXY_TARGET` | web (server) | For rewrites | `http://localhost:5000` or `http://api:5000` in docker |

**Never commit `.env` with real secrets.** The repo `.gitignore` excludes `.env` and `.env.local`. Generate `JWT_SECRET` with `openssl rand -hex 32`.

### 2. Database — versioned migrations, RLS, private Storage, Realtime

```bash
# Option A: Local Supabase (requires Docker) — recommended
supabase start          # starts Postgres + Auth + Storage + Realtime on 54321/54322
supabase db reset       # apply 001→008 in order, drift check

# Option B: Plain Postgres / Docker compose
docker-compose up -d db
psql $DATABASE_URL -f database/migrations/001_extensions_enums_identity.sql
psql $DATABASE_URL -f database/migrations/002_buildings_rooms_devices.sql
psql $DATABASE_URL -f database/migrations/003_telemetry_inbox.sql
psql $DATABASE_URL -f database/migrations/004_wallets_ledger.sql
psql $DATABASE_URL -f database/migrations/005_commands_outbox.sql
psql $DATABASE_URL -f database/migrations/006_disputes_evidence_reports.sql
psql $DATABASE_URL -f database/migrations/007_policies_rls.sql
psql $DATABASE_URL -f database/migrations/008_consent_subscriptions_ops.sql
# Verify:
psql $DATABASE_URL -c "\d buildings" -c "\d devices" -c "\d wallets"

# Option C: No DB — API falls back to in-memory stores (demo). You can still sign up/log in,
# create buildings (in-memory), ingest device events (deduped), and test quote→payment→vending flows.
# Health endpoint reports mode: curl http://localhost:5000/api/v1/health
```

Migrations are immutable after deployment; corrections are new migrations. See `database/README.md`.

### 3. API — 128 operations, device HMAC, idempotent payments, OFF-reason resolver

```bash
cd apps/api
pip install -r requirements.txt
# Env already loaded from .env via python-dotenv; or export DATABASE_URL=... JWT_SECRET=...
python -m unittest discover -s tests -v      # 6 core tests: meter validate, auth, scope, ingest dedup, idempotency, payment states
python app.py                                 # http://localhost:5000 (auto-creates tables if DB connected, else in-memory)
# Production:
gunicorn -b 0.0.0.0:5000 "app:create_app()" --workers 2 --timeout 60
```

Health: `curl http://localhost:5000/api/v1/health` — returns `database: connected` or `in-memory` hint.

### 4. Web — 48 routes, responsive, accessible

```bash
cd apps/web
npm install
npm run dev    # http://localhost:3000 (proxies /api/v1/* to API via next.config.js rewrites)
npm run build  # production build, verifies all 48 routes static/dynamic
npm start      # serve production build
```

- Auth token stored in `localStorage.smartclamp_token`; role in `smartclamp_role`. Protected routes redirect to `/login` if missing.
- API base resolves: browser uses `NEXT_PUBLIC_API_BASE`; server SSR uses `API_PROXY_TARGET/api/v1`.
- All buttons/forms are wired: no dummy dead-ends. Offline banners, skeletons, empty/error/forbidden/stale states per `WEB-STATE-MACHINES.md`.

### 5. Worker — outbox SKIP LOCKED, idempotent side effects

```bash
pip install -r services/worker/requirements.txt
python services/worker/worker.py   # polls Postgres outbox or API debug endpoint
# With DATABASE_URL=postgres, worker uses SELECT ... FOR UPDATE SKIP LOCKED
# Without, it polls API and logs — still demonstrates idempotent processing
```

### 6. One-command Docker (optional)

```bash
cp .env.example .env   # fill JWT_SECRET etc
docker-compose up --build   # api:5000, web:3000, db:5432, worker
docker-compose down -v
```

### 7. Verify everything

```bash
python3 tools/check_foundation.py
bash tools/verify.sh  # OpenAPI 128 ops, protocol 5 vectors, firmware core/runtime/crypto
cd apps/api && python -m unittest discover -s tests -v
cd apps/web && npm run build
curl http://localhost:5000/api/v1/meters/validate -H "Content-Type: application/json" -d '{"meter_number":"04217839011"}'
curl http://localhost:5000/api/v1/health
```

## Deployment units

`apps/web` (Next.js) → `apps/api` (Flask) → `services/worker` + Postgres/Supabase (Auth/Realtime/Storage). Firmware never writes Supabase directly; API validates JWT/HMAC, commits durable records+outbox in one TX; worker claims via `SKIP LOCKED`.

## Honest validation

Run `bash tools/verify.sh` after `pip install -r tools/requirements.txt` (needs C++17 + OpenSSL). See `docs/VALIDATION.md` for passed/blocked gates and `docs/RELEASE-GATES.md` for 9 gates with measurement requirements.

- Specified: docs + contracts + firmware reference
- Implemented: web + API + migrations + worker + client
- Tested locally: `verify.sh` + API tests + web build + protocol vectors + health endpoint
- Provider sandbox / hardware: labelled sandbox adapters; field qualification requires BOM, calibration, carrier, and procurement facts — no invented success

Do not clear the repo again. Preserve foundation + source references (`docs/sources/`) + this implementation.

## Key invariants (enforced)

Browser / device / grid / physical relay are separate facts. Requested ≠ confirmed. Recharge clears only zero-balance restriction. Subscription expiry never cuts power. Landlords cannot enforce rent via cutoff. Duplicate messages never duplicate credits/vending/actuation. Missing readings never become fabricated zero or false verified. Gateway ACK ≠ durable ACK. Utility control requires authority+scope+consent+step-up. Supercapacitor prioritizes logging, not guaranteed SMS.

## Design

Navy #102A43, canvas #F7F9FC, white surfaces, strong hierarchy, amber/green/red with text labels. Responsive: 320/768/1440, stack/reflow, no page-wide horizontal scroll, 44px touch targets, keyboard + screen-reader + reduced-motion complete. Graphs with units + accessible tables; illustrations for devices; concise cards for balances/status.

## Legal & safety

SmartClamp provides sub-metering/verification technology; it does not generate/resell/distribute electricity and does not replace your utility meter. Wiring/voltage/relay work requires qualified installer + isolation + enclosure. Predictive fire/shock claims are research, not life-safety guarantees. Legal text pending professional review.
