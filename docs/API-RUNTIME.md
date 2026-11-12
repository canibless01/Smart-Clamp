# Implemented API and handoff boundaries

[Runtime OpenAPI](../contracts/runtime-openapi.yaml) and [route manifest](../contracts/runtime-routes.json) describe handlers actually registered by the Flask application. Regenerate with `python tools/export_runtime_contract.py`. [Original product contract](../contracts/openapi.yaml) is the broader desired surface; an operation appearing there is not an implementation guarantee. Runtime response schemas still allow extra fields where typed reconciliation is incomplete.

Base path: `/api/v1`. The browser calls the Next.js same-origin rewrite; server secrets stay on the API. JWT identity is verified with Supabase Auth for protected requests. The profile stored in PostgreSQL supplies the role. Public role selection never grants internal, utility or installer privileges.

Mutating idempotent operations require `Idempotency-Key`. Retries of the same logical operation must reuse its key and identical body; a different body with that key returns 409. The frontend adds keys and preserves them when retrying after session refresh. Do not blindly retry an uncertain financial operation with a new quote. Quote ID is the checkout identity: repeated checkout returns its existing payment rather than issuing a second charge reference.

## Account, room and device linking

- `POST /auth/signup`: `phone`, `password`, `full_name`, `role`. Returns a session or 202 `verification_required`. `POST /auth/verify` takes `phone`, `code` and completes phone verification. No hardcoded OTP.
- `POST /auth/login`: real phone/password authentication. Result includes `access_token`, `refresh_token`, `role`, `user_id`, `subscription_tier`. Refresh with `POST /auth/refresh`; revoke through `POST /auth/logout`.
- `GET /users/me/context`: trusted profile, scoped devices and current projection. Tenant measurements are restricted to current occupancy times. A connection is not a supply observation.
- `POST /buildings`: landlord creates `name`, `address`, `meter_type: with_meter`. Unmetered building activation fails explicitly until settlement policy is approved.
- `GET/POST /buildings/{id}/rooms`: list actual rooms/create `label`. The landlord owns the building.
- `POST /rooms/{id}/invitations`: returns a private one-use link and expiry. `POST /invitations/accept` takes its `token`; authenticated tenant gets an occupancy. The browser preserves the invitation during login/signup.
- `POST /ops/devices/{id}/claim-code`: authorized ops issues a single-use code for an existing unowned device. The response contains the package code once; storage retains its SHA-256. It does not register sensors, keys or calibration.
- `POST /devices/claim`: `claim_code`, optional owned `room_id`. Owner/landlord only; persists association atomically. It does not change calibration/commissioning.
- `GET /devices/{id}`, `/events`, `/commands`: scoped registry, measured readings and command results. Current tenants do not receive historical residents’ measurements.

## Homepage meter check

`GET /public/electricity-providers` supplies the configured allowlist. `POST /meters/validate` accepts string `meter_number` (leading zeros retained), selected `service_id`, optional `utility_type: electricity`. It calls the actual provider. Success contains `valid`, masked `customer_name`, `disco_name`, `provider_name`, `utility_type`. It does not return full addresses, live balances or fabricated account data. With no configured integration, it returns 503.

`POST /meters/link` authenticates the user, validates the selected account and saves an explicitly pending meter link. This does not confirm an optical connection. `POST /meters/{id}/manual-reading` persists a manually entered reading with provenance, never calibrated-device status.

## Purchase and delivery

1. `GET /wallets`: actual authorized destinations, balances, ledger version and opaque `payment_token`. Meter destination and approved tariff must already be configured.
2. `POST /payments/quotes`: `destination_token`, integer `amount_kobo`, `utility_type: electricity`. Response: `id`, `expires_at`, `amount_kobo`, `wallet_value_kobo`, `fee_kobo`, `markup_kobo`, `units_mwh`, `tariff_version`. **1 kWh = 1,000,000 mWh.** Fees are not silently guessed.
3. `POST /payments/checkout`: authenticated `quote_id`, `payer_email`, `return_path`. Response 202 includes `id`, `status_token`, `status` and, when successfully initialized, `checkout_url`. An uncertain provider request remains `outcome_unknown`. No redirect equals payment confirmation.
4. `POST /webhooks/payment`: exact raw Paystack HMAC signature; then verify reference, NGN amount/currency and transaction status with the provider. Atomic reservation and durable outbox follow. Duplicate callbacks do not duplicate credits.
5. Worker performs VTPass vending/requery with an identity persisted before HTTP. Token delivery stays `token_pending_entry`; direct confirmed delivery releases credit. Provider uncertainty remains pending/reconciliation, not success.
6. `GET /payments/{id}` is payer-scoped. `GET /public/payments/{status_token}` exposes only the opaque receipt holder’s scoped result and token when appropriate. URL tokens are not analytics identifiers or public SEO content.
7. `POST /payments/{id}/confirm-meter-entry` with `confirmed:true` records the payer’s attestation after token acceptance. It is not physical meter telemetry.

Bank-transfer collection, subscription collection and auto-recharge are not configured/complete and cannot report successful transactions. Unmetered SmartClamp credit settlement is an explicit implementation gate, not an invented utility vending destination.

## Device protocol and user control

Use [device protocol](../contracts/device-protocol.md) for exact signed envelope and canonical byte rules. Per-device 32-byte telemetry and command keys are distinct, encrypted server-side under `DEVICE_HMAC_ENCRYPTION_KEY`; never ship a derived global test key.

- `/device/events` authenticates original end-device messages, commits durable inbox/readings/signals/outbox, then ACKs immutable message identity. Duplicate hash matches ACK; different data at the same identity conflicts.
- `/device/poll` returns expiring signed commands and request-bound signed time.
- `/device/receipts` validates the command, sequence, time, result and physical feedback. Only a matching observed state becomes `applied`; missing/mismatched feedback remains uncertain.
- User requests a phone challenge bound to SHA-256 of canonical `{device_id,state}` and `scope_ids`, verifies its real OTP, then posts `/devices/{id}/relay` with `state`, `authorization_ref`.
- Rollout flag, physical capability, entitlement, device freshness and independent OFF reasons must permit dispatch. A queued command is not a relay observation. Local protection must work while the internet is unavailable.

## Staff, launch flags and failures

`GET /ops/summary` returns actual fleet connection counts, categorized work counts and recorded work orders. `POST /ops/jobs` persists `device_id`, `kind` (installation/repair/inspection), `priority`. Finance metrics are explicitly unavailable without approved sources.

`GET /dashboard/utility` requires NEPA role plus active organization membership and a `utility_device_scopes` assignment. It returns only those devices and tamper/protection signals. No individual customer identity, arbitrary fleet access or disconnection authority is implied.

Water is disabled by default. Unsupported utility types are rejected server-side. The administrative disable endpoint cannot enable an unimplemented water integration. Other missing features must return an explicit unavailable state and must not use sample records.

Errors use `{code,message,request_id}`. Display user-meaningful errors, preserve unknown outcomes and expose retry controls. Do not convert a 401/403/503 or JSON error body into a successful entity. Missing config produces an unavailable service, never an in-memory fallback or invented reading.
