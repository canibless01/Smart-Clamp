# What to obtain for the electricity launch

26 November 2026. Configuration names below match the current code and `.env.example` files. Store secrets in deployment/environment settings, not chat, screenshots or Git. This is the requested input list, not a claim that the remaining feature checklist or physical hardware acceptance is finished.

## 1. Supabase and running SQL

Target: `https://fmjzskjkvdbffwkiujnu.supabase.co`, project ref `fmjzskjkvdbffwkiujnu`. No other project is authorised.

Choose one secure administration route:

- `SUPABASE_ACCESS_TOKEN`: a Supabase Management API personal access token with access to this project. The assistant can run the prepared project-specific migration tool using this token.
- Or `DATABASE_URL`: the project's privileged PostgreSQL connection URL, with database password and TLS configuration, for the repository migration runner. This credential must be able to execute schema migrations.
- Or run the checked SQL bundle in that project's SQL editor yourself, then provide the migration receipt/results for verification.

A project URL, anon/publishable key or service-role HTTP API key alone is **not** a Management API SQL credential. Service-role keys do not substitute for the database password or management access token. The project URL is already known; do not create another project.

Prepared SQL: `docs/deployment/fmjzskjkvdbffwkiujnu-bootstrap.sql`, currently through migration 040. It checks migration hashes and refuses unknown/untracked schema state. The owner reports external 001–038 execution by the connected chat with matching checksums. Migration 039 has run only in isolated QA here and is pending external follow-up. See `docs/deployment/SUPABASE-fmjzskjkvdbffwkiujnu.md` for the exact commands.

Runtime API also needs `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `DATABASE_URL`. Configure Supabase Auth's site URL and approved redirect URLs for the actual frontend domain.

## 2. Website, API and worker hosting

- Frontend: `NEXT_PUBLIC_API_BASE` (normally `/api/v1`), server-only `API_PROXY_TARGET`, canonical `SITE_URL`.
- API: exact `APP_ORIGIN`, approved `CORS_ORIGINS`, `DATABASE_URL` and Auth values above.
- Run the durable worker as well as the API; queues do not process themselves.
- Use an HTTPS API host with streaming support. Shared live updates use authenticated SSE; keep `Cache-Control: no-store, no-transform` and avoid response buffering. Provision enough concurrent WSGI threads for live clients; a single synchronous worker is not a fleet deployment.
- Publish the final terms/privacy text and set `LEGAL_TERMS_VERSION` and `LEGAL_PRIVACY_VERSION` to those exact versions. Preview versions are not a launch configuration.

## 3. Sign-up, Google and identity messages

- Enable the intended Supabase email/password and phone Auth providers.
- For Google, create the Google OAuth client and configure its client ID/secret **inside Supabase Auth**. Google's authorised callback is the Supabase project's `/auth/v1/callback`; Supabase then returns to the website's `/auth/callback` PKCE flow. Approve the actual frontend redirect URL.
- Configure real Supabase SMTP for identity verification/recovery emails; use a verified sending domain and the provider's SMTP credentials. Resend application-email REST settings are not automatically Supabase SMTP settings.
- Configure the Supabase-supported phone Auth SMS provider. This is separate from the application's outbound account-notice SMS adapter.

## 4. Payments and vending

- Paystack: verified merchant account, settlement details, `PAYSTACK_SECRET_KEY`; configure the actual webhook. If using the modern signing mode, set `PAYSTACK_WEBHOOK_SECRET`, with `PAYSTACK_WEBHOOK_PREVIOUS_SECRET` only during rotation.
- VTPass: approved merchant access, `VTPASS_API_KEY`, `VTPASS_SECRET_KEY`; use verified service IDs in `VTPASS_ELECTRICITY_SERVICES_JSON`, or the single-service `VTPASS_ELECTRICITY_SERVICE_ID` and `VTPASS_ELECTRICITY_SERVICE_NAME`.
- Approve tariff records and the explicit fee policy: `PAYMENT_FEE_BPS`, `PAYMENT_FIXED_FEE_KOBO`, `PLATFORM_MARKUP_BPS`. Enter zero explicitly when intended. Tariffs and provider-unit reconciliation are database records, not guessed prices.
- A physical meter destination can use the implemented vending path. An unmetered utility agreement is a distinct settlement integration; a pole sensor alone does not provide utility vending authority or a centrally controlled supply wallet.
- Automatic recharge and paid subscriptions still require their code/mandate workflows on the feature checklist and provider product/mandate acceptance. Do not treat a secret key as implementation of those remaining flows or activate recurring charges without consent. The mentioned monthly price is not hard-coded as a live product.

## 5. Email and push notices

- Resend: verified sender/domain, `EMAIL_ENABLED=true`, `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `EMAIL_FROM`, distinct `EMAIL_ENCRYPTION_KEY`.
- Resend application routing is capped by `RESEND_DAILY_EMAIL_LIMIT=100` and `RESEND_MONTHLY_EMAIL_LIMIT=3000`. Counts use UTC calendar boundaries. Other use of the same Resend account (including identity SMTP) must also be included in the provider capacity plan.
- OneSignal fallback email: approved/configured OneSignal email sending, `ONESIGNAL_EMAIL_ENABLED=true`, `ONESIGNAL_APP_ID`, `ONESIGNAL_REST_API_KEY`. A OneSignal account alone does not configure its email sender.
- OneSignal web push: configure the real HTTPS origin and its separate worker scope, `ONESIGNAL_PUSH_ENABLED=true`, the same app/API keys and `PUSH_ENCRYPTION_KEY`. Browser permission remains opt-in.
- Native Web Push alternative: `WEB_PUSH_ENABLED=true`, `VAPID_PRIVATE_KEY_FILE`, `VAPID_SUBJECT` and `PUSH_ENCRYPTION_KEY`.

## 6. Application SMS

The implemented account/service-notice adapter uses Africa's Talking: approved sender/account, `SMS_ENABLED=true`, `AT_USERNAME`, `AT_API_KEY`, `AT_SENDER_ID`, production `AT_SMS_URL`. Test sandbox credentials are not production service. Provider acceptance is not handset delivery. Obtain a shortcode separately before promising USSD/SMS queries; no invented shortcode is published.

## 7. Device keys, hardware and OTA

- Preserve `DEVICE_HMAC_ENCRYPTION_KEY` across deployments. Each device receives distinct telemetry and command credentials; never copy public test-vector keys into a device.
- Signed reports: private RSA signing key at `REPORT_SIGNING_KEY_FILE`.
- OTA: private RSA signing key at `OTA_SIGNING_KEY_FILE`; enable `OTA_ENABLED` only after the configured hardware, partitions, rollback and recovery are qualified. Devices need the matching public-key trust anchor and approved firmware/cohort metadata.
- Provision each device's identity, profile/capabilities, signing epochs, server HTTPS origin, trusted CA, network settings and topology. Wi-Fi credentials, modem APN/SIM details, gateway peers and RS485 addresses belong to secure device provisioning, not `NEXT_PUBLIC_*` settings.
- Record actual sensor calibration, fitted relay/feedback, circuit/actuator ratings and installation-specific voltage/current limits. Voltage and current are different measurements; commercial current limits are not domestic defaults. Display-only advisory settings do not silently change physical protection.
- **Current firmware limitation:** the commissioning agent and portable protocol/control libraries exist, but the Arduino application does not yet instantiate all production metrology, actuator, GSM and local-link HALs. Flashing the present commissioning build does not automatically produce a working mains monitor/relay. Completing that code and physical qualification remains on the checklist.

## 8. Optional advisory settings currently consumed

`VOLTAGE_WARNING_LOW_MV`, `VOLTAGE_WARNING_HIGH_MV`, `CURRENT_WARNING_LOW_MA`, `CURRENT_WARNING_HIGH_MA`, `LOW_CREDIT_WARNING_MWH`. A signed per-device channel manifest's advisory band takes precedence over global display defaults. These are advisories, not certified protection or a remote override permission.

## 9. Launch scope

Electricity is the launch scope. Water/gas and other unsupported utilities remain unavailable behind feature gates. Utility/NEPA data requires the named organisation's reviewed device scopes and staff memberships; no public theft accusation or audible community tamper alarm is part of the workflow.

`SUPPLY_PRESENT_MIN_MV=50000` configures sampled supply-presence analytics only (default 50 V). It does not change installation protection or override limits.
