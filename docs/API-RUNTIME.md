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
5. Worker performs VTPass vending/requery with an identity persisted before HTTP. Token delivery stays `token_pending_entry`; prepaid credit remains reserved until the payer attests meter-token acceptance. Provider uncertainty remains pending/reconciliation, not success.
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

## Continuation: purchases, field work, firmware and reports

- `POST /meters/link` now also creates a private meter-payment destination. `/wallets` distinguishes `balance_kind: meter_purchases` from device credit. Its cumulative delivered purchases are **not** the meter's current balance. Standalone quoting needs exactly one current approved tariff whose `provider` matches the selected VTPass service ID.
- `POST /ops/buildings/{building_id}/payment-destination` lets operations/finance/superadmin bind a landlord-validated central meter and an existing approved provider tariff. It initializes empty room destinations and future House Full room claims. Existing funds/payment history or an already configured destination require a reviewed migration. The landlord cannot set prices or redistribute room balances.
- Quotes now pin `destination_meter_id`, meter number and service ID before checkout. Public responses expose only the service and last four meter digits. Vending uses this immutable quote snapshot, so later device reassociation cannot redirect a paid purchase.
- `units_mwh` on a quote/payment remains the quoted **estimate**. `delivered_units_mwh` is separately parsed from the actual VTPass `units` response. Provider request ID and amount must match. Missing/invalid actual units stay reserved and requery the same vend identity. Credit release uses actual delivered units; FIFO funding lots value subsequent consumption without leaving cash rounding residue after the full lot is consumed. Pre-018 balances without attributable lots require reconciliation; no lot provenance is fabricated.
- Current Paystack `Paystack-Signature` headers use `t` and `v1=key_id:signature`, HMAC-SHA512 over `t.raw_body`, with a 300-second window. Configure `PAYSTACK_WEBHOOK_SECRET` and optional previous secret during rotation. Once configured, missing/invalid modern signatures cannot fall back to legacy. Legacy `x-paystack-signature` remains supported only when modern signing is not configured.
- `GET /jobs/{id}` and `POST /jobs/{id}/actions` provide scoped assignment, progress, diagnostics, RMA and operator review, with `expected_version`, idempotency, immutable events and in-app notifications. Installers access only their current assignments. Repair/inspection field closure cannot commission hardware or issue a payable. Installation closure remains unavailable until a qualified commissioning process exists.
- Opt-in Africa's Talking SMS runs from the durable outbox when `SMS_ENABLED=true` and the provider/sender are configured. Ordinary notices respect 21:00–07:00 Lagos quiet hours; critical event templates bypass them. Dispatch intent is committed before HTTP. Provider acceptance is not handset delivery. A timeout/crash leaves `unknown`; it is never automatically sent again. Operations sees queued/failed/unknown issues. Unauthenticated delivery callbacks are not accepted.
- `GET /ops/firmware`, `POST /ops/firmware/artifacts`, `POST /ops/firmware/rollouts`, and `POST /ops/firmware/rollouts/{id}/actions` implement private RSA-signed image storage and explicit canary waves. Upload JSON includes `profile`, `board: esp32dev`, `version`, positive `secure_version` and `image_base64` (1 KiB–2 MiB application image). First device → 5% → 25% → remaining selected devices; all current-wave devices must report healthy boots before advancement. Gateways are single-target rollouts. Dispatch requires `OTA_ENABLED=true` and individually qualified devices.
- `/device/poll` can return an SC1-signed `firmware` offer, bound to the requesting boot/sequence. `/device/firmware/download` requires a signed device request and an active compatible target. `/device/firmware/receipts` records staged/healthy-new-boot/failed/rolled-back outcomes. Failed/rolled-back outcomes pause the rollout. The server cannot infer a physical healthy boot from an upload/download. See [firmware update runbook](FIRMWARE-UPDATES.md).
- `POST /reports` issues an immutable RSA-signed measurement snapshot for `device_id`, `period_start`, `period_end` (completed Lagos dates; end exclusive; at most 31 days/10,000 observations). Tenant periods cannot precede current occupancy. `GET /reports` lists own reports; `GET /reports/{id}` verifies stored historical bytes. Sharing uses a random seven-day token at `/public/reports/{token}`; `POST /reports/{id}/revoke` revokes it. `POST /reports/{id}/exports` persists a CSV from the **stored** snapshot; `GET /exports/{id}` is requester-scoped and verifies the stored export hash. Reports disclose counter-interval coverage and unavailable intervals; signatures are not electrical/legal certification. Scheduled reports and PDF issuance remain separate work.
- Delayed relay receipts can commit an observation made within the command's validity interval. They never authorize late actuation, revive a revoked command or overwrite newer relay feedback.

`GET /health` checks all repository migration names/checksums and reports **API** readiness. It explicitly leaves worker, merchant and hardware health unchecked. It is not an ecosystem release approval.

Checkout creation now queues durable provider reconciliation before HTTP. Lost initialization responses or webhooks verify the original reference; they do not initialize another charge. Definitively failed/abandoned provider outcomes close as failed without credit. Existing checkout recovery works even after the original quote expires. Authenticated receipt history recovers original credit/KCT tokens, without relying on a saved browser URL. Prepaid VTPass `delivered` means token vending, not physical acceptance: a valid 20-digit token and actual units are required, then payer attestation releases credit. Missing tokens requery the same vend. Operational recovery failures/dead letters are visible in `/ops/summary`.

Migration 023 adds qualified signed room allowance synchronization. `/device/poll` can return `prepaid_policy`; `/device/prepaid-policy/receipts` commits signed accepted/rejected software-policy receipts. `/devices/{id}` reports acknowledgement separately from physical relay state. See [prepaid policy](PREPAID-POLICY.md) for funding/epoch/qualification rules and remaining hardware integration.

## Account identity and consent (024)

`GET /auth/options` returns configured contact/Google availability and legal versions. Signup/login accept one email or phone; signup records explicit current legal acceptance. `GET/POST /auth/onboarding` verifies a provider identity independently of an existing application profile and completes the minimal profile. Application operations reject incomplete profiles; refresh/logout remain available. `POST /auth/oauth/start` constructs fixed-origin PKCE S256 Google authorization; `/auth/oauth/exchange` exchanges the code. `/auth/phone/enroll` and `/auth/phone/verify` bind an initially missing security phone after recent sign-in and same-user provider verification. Existing phones are not replaced by this flow. See `ACCOUNT-ONBOARDING.md` for templates, callback configuration and acceptance limits.

`GET/POST/DELETE /users/me/push-subscriptions` exposes readiness/public VAPID key, registers an authenticated opt-in subscription, or disables that user's endpoint. Private endpoints/keys are encrypted; worker dispatch commits unknown intent before HTTP, suppresses blind repeats, and expires 404/410 subscriptions. These browser notifications are separate from ESP commands and signed OTA.
