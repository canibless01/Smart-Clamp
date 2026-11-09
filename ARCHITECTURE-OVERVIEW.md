# SmartClamp — Integrated Product Overview

**This is an integrated, working product skeleton — not a collection of static screens.** Every feature traces a complete loop from initiating event → durable storage → rules → device actions → notifications → dashboard → recovery.

## Deployment units

```
apps/web (Next.js 14) ──→ apps/api (Flask) ──→ Postgres/Supabase (RLS + Realtime + Storage)
                               │
                               ├── services/worker (outbox claim SKIP LOCKED, idempotent side effects)
                               └── device ingress (/device/events, /device/poll, /device/receipts) — HMAC-SHA256 signed envelopes
Firmware (ESP32) ──→ Pole Gateway / Building Hub (ESP-NOW / RS485) ──→ TLS ingestion
```

- **Firmware never writes Supabase directly.** API validates identity/permissions, commits durable inbox + reading + outbox in one transaction; worker claims via SKIP LOCKED.
- **Realtime** emits committed dashboard projections; clients invalidate/refetch on version gap — no dashboards sending commands to one another.
- **Browser / device / grid / relay are separate facts** — never flattened to one ON badge.

## Verified vertical slices

### 1. Reading → durable ingest → dashboard
1. Sensor task samples calibrated waveforms (real watts via mean(v·i), PF, import/export counters, quality, gap ranges)
2. Device appends signed record to durable journal before queueing; Pole Device → Pole Gateway via encrypted ESP-NOW; House Full → Building Hub via RS485
3. Gateway/Hub forwards original signed envelope over TLS to `POST /device/events`; server verifies HMAC, checks `(device_id,key_epoch,boot_id,seq)` uniqueness, commits `device_inbox` + `readings` + `outbox` atomically, returns durable ACK
4. Only cloud ACK authorizes journal deletion; lost ACK → safe duplicate retry; conflicting same-seq with different hash → 409 quarantine
5. Worker computes interval energy, updates projections; tenant sees own occupancy, landlord sees building aggregate, homeowner sees own pole, utility sees permitted regional aggregates — all from same event pipeline
6. Dashboard shows `snapshot_version`, `generated_at`, `supply_state`, `connectivity` (online/stale/offline/dependent_unknown), `relay{requested,observed,off_reasons}`, `measurement{value,unit,observed_at,quality,coverage}`, `wallet{available,reserved,ledger_version}`

### 2. Quote → payment → vending → credit → command → feedback
1. Frontend calls `POST /payments/quotes` (idempotent, 24h payer+hash binding, immutable tariff version, amount_kobo in kobo)
2. `POST /payments/checkout` → provider (Paystack sandbox) → redirect; **redirect ≠ proof**
3. Paystack calls `POST /webhooks/payment` — verify raw-body HMAC-SHA512, fetch transaction status, check amount/currency/account, atomically post money ledger + fulfillment outbox once per gateway reference
4. Shared-meter: `money paid` vs `vending` vs `reserved credit` vs `usable credit` separated; publish `paid_pending_vend`, retry provider fulfillment with same reference, timeout → reconciliation/refund (never double-vend)
5. Confirmed vend releases room credit exactly once; `notify payer`
6. ON intent clears only `wallet_zero` OFF reason; `protection/manual/budget/schedule/consent` remain; physical ON shown only after device feedback ACK
7. Manual control: `POST /devices/{id}/relay` → 202 pending → step-up challenge (5 min, one-use, 5 attempts) → `pending_delivery` → signed `relay_command` (HMAC binds device+target+expiry+sequence, persistent monotonic seq, 120s max) → device validates TLS/HMAC, target/config epoch, expiry, monotonic seq, commissioning, persists receipt before pulse → bounded coil pulse → auxiliary feedback → `POST /device/receipts` signed → worker updates state/audit → UI confirms only after ACK

## Responsive + accessible

- **Design tokens**: navy #102A43, canvas #F7F9FC, surface #FFFFFF, text #172B4D, muted #526477, amber #F4B544, green #176B46, red #B33A48, border #CBD5E1; spacing 4-96px; cards 16px; inputs 10px; touch 44px; focus 3px
- **Breakpoints**: 320-599 one col 16px gutters, 600-1023 two cols 24px, 1024+ persistent 240px sidebar 12-col grid; tables → cards on mobile; charts with textual summary + downloadable data
- **Motion**: navbar solidifies on scroll, hero fade 240ms, section reveal 200ms, hover 120ms; `prefers-reduced-motion` disables auto-advance/counters/transforms; demo ticks labelled simulated
- **States**: loading (dimension-stable skeletons, aria-busy), empty (how to obtain data), validation-error (field-specific), forbidden (no cross-account disclosure), unavailable (provider down with retry), stale (last observed time), offline (You’re offline + reconnect help), unknown outcome (query by idempotency key, never resubmit fresh)

## Invariants preserved

- Requested ≠ confirmed physical action (relay feedback authority)
- Recharge clears only its own zero-balance restriction
- Subscription expiry never disconnects electricity
- Landlords cannot enforce rent via power control
- Payment receipt, vending, credit, restoration are distinct stages
- Duplicate messages never duplicate credits/consumption/vending/actuation
- Missing readings never become fabricated zero or false verified badge
- Gateway ACK ≠ durable cloud ACK
- Utility control requires authority+scope+consent+step-up+dispatch recheck; revocation invalidates queued commands by policy_epoch
- Supercapacitor hold-up prioritizes logging; no guaranteed SMS before shutdown
- Historical evidence & corrections remain auditable

## Running

```bash
# Web
cd apps/web && npm install && npm run dev   # → http://localhost:3000

# API
cd apps/api && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
DATABASE_URL=sqlite:///smartclamp.db python app.py  # → http://localhost:5000

# Or via Supabase
supabase start && supabase db reset
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres python app.py

# Worker
python services/worker/worker.py

# Verification
bash tools/verify.sh
python -m unittest discover -s apps/api/tests -v
npm --prefix apps/web run build
```

## Honest readiness

Per `docs/VALIDATION.md` and `docs/RELEASE-GATES.md`:

- ✅ Specified: 48 routes, 128 API ops, 8 migration families, 6 firmware profiles
- ✅ Implemented: Next.js 48 routes + design system, Flask 128 ops (sandbox adapters), versioned migrations + RLS tests, protocol HMAC verification, idempotent payments, OFF-reason resolver
- ✅ Tested locally: `tools/verify.sh`, `apps/api/tests`, web build, protocol vectors
- 🔲 Tested against provider sandbox: Paystack/vending/SMS/USSD require live credentials — adapters are labelled `sandbox` and never default to fake success in production
- 🔲 Tested on hardware: firmware policy/runtime/crypto pass host tests; ESP32 bench-build job runs in CI; sensor/relay/power-fail/ESP-NOW/RS485/modem adapters require qualified BOM + calibration
- 🔲 Deployed: Supabase project provisioning + production secrets injection pending

No invented credentials, calibration values, pricing, testimonials, or hardware success are claimed.
