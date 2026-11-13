# Before-launch inputs, content and operating checklist

This is the owner/builder checklist requested on 13 November 2026. Do not treat a checked configuration name as proof that an unimplemented workflow works. Current implementation/acceptance is tracked in [the action matrix](IMPLEMENTATION-MATRIX.md), [runtime API](API-RUNTIME.md) and [launch readiness](LAUNCH-READINESS.md). Secrets belong in deployment/provider settings, never chat or Git.

## Account questions and when to ask them

| Information | When needed | Purpose / boundary |
|---|---|---|
| Verified phone or email; password for password login | Sign up / login | Identity. Google provides verified identity; it does not choose staff privileges. Email/password and Google onboarding are being implemented. |
| Full name | Complete initial profile | Account/support and installation contact; bounded user-supplied display name. |
| Homeowner, resident, landlord, agent/referrer intent | Complete initial profile | Route the public workspace. Installer, utility and internal roles require operator provisioning; signup never grants them. |
| Explicit Terms and Privacy agreement, document versions and timestamp | Initial profile completion | Must be recorded, not inferred merely from clicking signup. Final legal documents/approved versions are owner inputs. Google users must complete this step too. |
| Verified phone for phone-based control confirmation and SMS | Before using those functions | A Google/email login does not manufacture a verified phone. Never accept an arbitrary profile number as verified. |
| Building name/address and central-meter model | Landlord building setup | Property/service context. No-meter settlement remains gated. |
| Service address and contact details | Order / installation booking | Site qualification and appointment. Do not demand every visitor's home address at signup. |
| Device claim code or room invitation | Device/room linking | Private single-use authority, separate from account authentication. |
| Receipt email, amount, selected room/meter destination | Payment checkout | Provider receipt and explicit itemized quote. This is not a new account credential. |
| Notification choices | Settings, after explanation | Optional-channel consent, revocable; no automatic browser notification prompt on first visit. |

No need to collect date of birth, ID documents, bank PINs, precise GPS, tenant rent/debt or unrelated household details for ordinary monitoring signup. Any later regulated collection needs an approved purpose, provider requirement and legal review.

## Information-centred pages to finish/review

| Pages | Owner / qualified inputs required |
|---|---|
| Home, How it Works, For Homeowners, For Landlords | Approved core explanation, launch geography, availability and installation process. Keep concept imagery labelled; no invented customer numbers/testimonials. |
| Explore Devices and six device pages | Final product photos/enclosures, exact supported board/sensor/relay/modem interfaces, confirmed specifications, connectivity limits and actual qualification. Explain monitoring versus optional control; subscriptions do not create hardware. |
| Pricing comparison and Basic / Basic Pro / Pro pages | Approved hardware/installation/subscription prices, periods, retention, included support, cancellation/refund/grace terms and implemented-feature availability. No guessed paid prices. |
| Existing Smart Meter, meter linking, IR reader/setup | Actual supported meter manufacturers/models/protocols/fields, access permissions and installer process. Number validation does not provide live balance/history. |
| Installation, connection help and device linking | Actual package-code/QR distribution, factory provisioning, commissioning checklist and qualified installers. No public serial-number takeover or simulated “connected” completion. |
| FAQs | Approved compatibility, outages/offline behaviour, prepaid/token/room-credit explanation, refunds/recovery and escalation answers. |
| About | Confirmed legal/company identity, story, team/founder details and approved photographs. |
| Support / Contact | Verified email/phone, staffed hours, service territory, escalation and electrical-emergency wording. Do not promise 24/7 coverage without staffing. |
| Terms and Privacy | Counsel/owner-approved documents, version identifiers, company/contact disclosures, processing/retention/consent/export policies, prices/refunds/chargebacks and operational responsibilities. Current draft wording is not final legal approval. |
| Reports and sharing | Approved explanatory wording, expiry/revocation, export privacy and limitations. A signature preserves bytes, not electrical/legal certification. |
| Community / future integrations | Publication/privacy policy, consent and false-positive review before enabling. Water/gas, unsupported meters and unbuilt capabilities remain unavailable. |

## Providers and deployment configuration

| Service | Required setup | What configuration does not do |
|---|---|---|
| Supabase PostgreSQL | Actual project connection, backups/restore test, backend-only privileges; migrate ordered SQL with checksums | Local QA migrations do not configure the owner's live project. Never grant browsers privileged table access. |
| Supabase Auth | Exact site/redirect allowlist, phone/email verification, password/recovery policies, token rotation/reuse interval and sessions | JWT refresh retains login; it does not grant a role from browser storage. Do not deploy QA auto-confirm. |
| Google sign-in through Supabase | Google OAuth consent app, client ID/secret entered **in Supabase**, authorised callback `https://<project>.supabase.co/auth/v1/callback`, exact website `/auth/callback` redirect allowlist | Provider activation is required for real Google consent. The website must finish name/role/Terms onboarding after identity verification. No Google secret belongs in Next.js public variables. |
| Auth OTP SMS | A Supabase-supported SMS provider (for example Twilio/Verify), approved sender/route and live delivery tests | Africa's Talking account-event SMS is separate from Auth OTP. An AT-to-Auth SMS hook is not implemented merely by setting AT credentials. |
| Auth email / recovery SMTP | Verified sending domain/from address and a real SMTP service configured in Supabase (for example Postmark, Resend SMTP, SES or Brevo); configure OTP templates and deliverability | Email verification/recovery must be tested with real inboxes. It is separate from general application email notifications. |
| Paystack | Activated merchant, approved fee policy, secret key, webhook URL, current `whsec_` signing/rotation secret and live verification/reconciliation | A browser redirect is not money proof. Unknown outcomes requery the persisted reference. Refund/chargeback workflows remain explicit separate work. |
| VTPass electricity | Activated merchant, keys, real allowlisted DisCo service IDs, approved tariff versions and meter destination; fund merchant wallet if required by contract | Actual vended units can differ from estimates. “Delivered” prepaid vending is not physical token acceptance. Missing units/tokens remain reserved and reconciled. |
| Event SMS (Africa's Talking) | Username, API key, approved sender, `SMS_ENABLED=true`, user opt-in and handset tests | Provider-accepted is not delivered. Unknown sends require review, not blind resend. |
| Browser push | HTTPS PWA, service worker, explicit permission, VAPID key pair/contact, authenticated subscription and delivery worker | PWA installation alone does not deliver notifications. Browser/OS support and push-service delivery require acceptance testing; this integration is being completed. |
| Application email | Choose/configure a transactional provider, verified recipient/address flow, consent, durable delivery/reconciliation and callback authentication | A Supabase SMTP setting does not implement application email delivery. This channel remains incomplete. |
| API + worker + web | Separate running services, secure env/files, API proxy target, monitored outbox/recovery queues, TLS, secret backups and restore rehearsal | Deploying only Next.js does not run Flask/worker. `/health` is API/schema readiness, not merchant/hardware release approval. |
| Hardware connectivity | Actual GSM SIM/APN/modem/carrier/TLS, paired encrypted peers, RS485 mapping, storage, calibration and power-fail qualification | A generic ESP32 name, Wi-Fi bring-up or six builds cannot qualify unknown electronics or instantiate missing HALs. |

Use [the key/provisioning/update runbook](FIRMWARE-UPDATES.md), `tools/bootstrap_secrets.py`, `tools/provision_device.py`, `tools/prepare_firmware_config.py`, `tools/migrate.py` and `tools/check_config.py --database`. Record real provider references and actual test results privately; do not publish customer tokens/keys.

## Exactly what each linking field means

| Field / entry point | Actual authority |
|---|---|
| Account phone | International E.164 number and account password/OTP; not a device claim. |
| Account email / Google | Verified account identity; never a hardware serial/password shortcut. |
| “Link SmartClamp” | Staff-issued private single-use claim code (URL-safe text, 32–128 characters); **not** a phone, meter number or public device UUID. A QR can carry that private claim authority; scanning UI is not currently implemented. |
| “Link meter account” | String of 6–20 digits plus selected provider. Preserve leading zeros. Validates account, not ownership of a physical reader or live telemetry. |
| Room invitation | Private expiring one-use token from the landlord, accepted by an authenticated resident. No public room-number takeover. |
| Factory device UUID / keys | Manufacturing identity and distinct device-direction credentials. Never put secrets in public QR assets or shared firmware. |
| RS485 address / radio peer | Installer commissioning map tied to the end-device identity; not an end-user login or claim code. |

## Journey and release checks

- Guest → installation guide → device link must redirect to login before private workspace appears, then return to the requested linking page.
- Login/refresh/navigation/reload must preserve a valid session. Transport failure retains credentials and shows retry; invalid/revoked refresh requires login. Logout clears both tokens. Private data/API replies must not be cached by a PWA.
- Homeowner/resident navigation includes Overview, History, **Control**, Wallet and Settings on mobile. Device capability/entitlement/qualification and current restrictions still decide whether a control request is allowed. A landlord does not gain individual rent-enforcement cutoff.
- Claim/invite/occupancy privacy, correct central-meter destination, actual-unit assignment, missing tokens, callback loss, duplicate/reordered events and stale state must pass real local services, then live merchant/hardware acceptance.
- Reports freeze actual issued data; sharing expires/revokes; exports use that snapshot. Missing intervals stay unknown.
- PWA install/offline/update/notification behaviour needs Chrome/Android and supported Safari/iOS acceptance. No offline payment/control queues or fake live readings.
- Capture implemented customer/operations/engineering/installer/utility views from isolated QA records. Label screenshots as simulations. Finance/support and other unbuilt A–M panels must not be illustrated with fabricated operational numbers as if implemented.
- Complete schedules/budgets/subscriptions, remaining internal workflows and qualified production sensing/actuation/local links before claiming the full requested ecosystem is finished. Keep [the matrix](IMPLEMENTATION-MATRIX.md) current.
