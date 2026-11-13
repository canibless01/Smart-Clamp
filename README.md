# SmartClamp — Electricity you can verify

A Next.js website, PostgreSQL-backed Flask API, durable worker and six ESP32 targets with a safe commissioning agent. The core software journeys have been exercised with real local authentication/database services. Merchant services were contract-tested with local test fixtures. Production metrology, actuation and local-link/modem integration remain incomplete, and the whole ecosystem is **not launch-ready**.

For a fresh assistant session, copy [the continuation prompt](docs/NEXT-CHAT-PROMPT.md). Start with [launch readiness](docs/LAUNCH-READINESS.md). It lists tested journeys, unfinished capabilities, external dependencies and owner-supplied launch content. Nothing described as planned becomes implemented merely by setting an environment variable.

## Builder reading order

1. [Launch readiness and remaining work](docs/LAUNCH-READINESS.md).
2. [Action/acceptance matrix](docs/IMPLEMENTATION-MATRIX.md) and [firmware update runbook](docs/FIRMWARE-UPDATES.md).
3. [Implemented API behavior](docs/API-RUNTIME.md), [runtime OpenAPI](contracts/runtime-openapi.yaml) and [registered routes](contracts/runtime-routes.json).
4. [Implementation contract](docs/IMPLEMENTATION-CONTRACT.md), [product](docs/PRODUCT.md) and [source reconciliation](docs/DECISIONS.md).
5. [Architecture](docs/ARCHITECTURE.md), [current UI direction](docs/UI-REVAMP.md) and [original page specifications](docs/pages/INDEX.md).
6. [Database/migrations](database/README.md) and [device protocol](contracts/device-protocol.md).
7. [Firmware limits](firmware/README.md) and [hardware configuration](firmware/HARDWARE-CONFIG.md).

The original 128-operation [product OpenAPI](contracts/openapi.yaml) and 48 page specifications describe the desired scope. The runtime manifest describes actual registered handlers, including explicit unavailable integrations. Additional implemented routes include account device linking, resident invitations, device catalogue and detailed plan pages. Read the current runtime documents before following older aspirational examples.

## Development

Use Node 20+, Python 3.11+, Docker for isolated integration checks, and C++17/OpenSSL for firmware policy tests. Do not use real customer data for QA.

```sh
python -m venv .venv
. .venv/bin/activate
pip install -r apps/api/requirements.txt
python tools/qa_services.py start --config /tmp/smartclamp-qa.json
SMARTCLAMP_QA_CONFIG=/tmp/smartclamp-qa.json python -m unittest discover -s apps/api/tests -v
```

This creates actual disposable PostgreSQL/GoTrue services with **test-only phone auto-confirm**. Config and generated credentials stay in a mode-600 local file. Provider fixtures exist only in tests. No fake authentication or financial success fallback is in the runtime application.

For a real browser integration run, export `SMARTCLAMP_QA_CONFIG` and start `python tools/browser_qa.py --fixture /tmp/smartclamp-browser.json`; this creates isolated users/device credentials and runs the local API. In another terminal:

```sh
cd apps/web
npm ci
npm run dev
```

Then run `SMARTCLAMP_BROWSER_FIXTURE=/tmp/smartclamp-browser.json UI_BASE_URL=http://127.0.0.1:3000 npm run test:ui` from `apps/web`. Regenerate the fixture before repeating the one-use invitation/claim scenario. Without the fixture, browser integration is explicitly skipped; UI-only tests can still run.

Production provider credentials are not supplied by this local runner. The QA auth autoconfirm setting must never be copied to a public service.

## Deployment

Use [server environment template](apps/api/.env.example) and [web template](apps/web/.env.example). Fill settings securely; do not commit credentials. Missing PostgreSQL/provider settings produce an unavailable service. There is no SQLite, global device-key or fake bank/payment fallback.

1. Configure Supabase phone authentication and actual PostgreSQL access.
2. Run `python tools/migrate.py` with `DATABASE_URL` in the process environment. Ordered migrations are checksum-tracked. Review pre-release 007/008 corrections before upgrading an earlier prototype database; never reset production to bypass a checksum conflict.
3. Deploy API: from `apps/api`, run `gunicorn -b 0.0.0.0:5000 'app:create_app()' --workers 2 --timeout 60`.
4. Deploy worker separately from repository root: `python services/worker/worker.py`. It uses the same database/provider configuration.
5. Deploy web with Vercel **Root Directory `apps/web`**, Next.js preset, `npm ci`, `npm run build`. Configure `API_PROXY_TARGET` to the HTTPS API origin and `NEXT_PUBLIC_API_BASE=/api/v1`. Set `SITE_URL` after the public domain is confirmed.
6. Register approved providers/tariffs/fees, staff scopes, factory identities and commissioning evidence. Complete live merchant and physical hardware acceptance gates from the readiness document before taking payments or enabling actuation.

`docker compose` is an alternative application deployment against an already configured Supabase database/auth service. It does not create a pretend replacement for Supabase. Use the migration profile first; see [launch readiness](docs/LAUNCH-READINESS.md).

## Verification

```sh
bash tools/verify.sh
python -m unittest discover -s apps/api/tests -v
cd apps/web
npm run typecheck
npm run build
npm run test:ui
```

API integration requires `SMARTCLAMP_QA_CONFIG`. Firmware/native checks verify portable policy/crypto/runtime; they do not qualify ADCs, relay circuits, modem, optical adapters or power-loss hardware. CI checks the contracts/native policies, six bench builds, frontend and real database/auth journeys. External merchant and physical hardware tests are separate release requirements.
