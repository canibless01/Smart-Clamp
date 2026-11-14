# Resend allowance and OneSignal

Owner choice: **100 Resend application emails per UTC calendar day**, then new
emails route to OneSignal. Resend also documents a 3,000-email monthly free limit;
the router respects both. `RESEND_DAILY_EMAIL_LIMIT=100` and
`RESEND_MONTHLY_EMAIL_LIMIT=3000` can be lowered to allocate less shared capacity.

Migrations 028–029 preserve the exact submitted provider body and reserve quota atomically in PostgreSQL at **dispatch**, not when
an email is queued. Concurrent workers cannot each claim the last slot. Overnight
backlogs use the actual dispatch day's allowance. Retries on the same day reuse
the reservation; cross-midnight retries conservatively reserve another daily
slot but retain their original provider and request identity. Monthly counters
count each request once per month. Existing stored sends are backfilled during
migration. Operations shows actual reservations, not claimed inbox deliveries.

Reservations include pending/unknown attempts and are not released automatically
on failures or opt-out. This can switch to OneSignal early; it prevents uncertain
sends from overrunning the budget. A new UTC day uses a new bucket automatically.
The local counter covers this application's worker only. Resend includes other
account usage, incoming email and externally sent Supabase SMTP messages in its
quota; allocate capacity accordingly or use a separate identity-mail provider.
This is not a provider-account usage API. Do not claim it counts external mail.

Once HTTP is attempted, provider, OneSignal app ID, recipient/content and request
identity are pinned. An uncertain Resend request never fails over to OneSignal.
It retries the same Resend request within its safe window or remains for review.
OneSignal uses its documented UUID `idempotency_key`; this worker also uses a
conservative 23-hour retry window (inside OneSignal's documented 30 days).
No provider rejection or timeout is disguised as successful delivery.

## Email configuration

Set existing email settings plus `ONESIGNAL_EMAIL_ENABLED=true`,
`ONESIGNAL_APP_ID` and server-only `ONESIGNAL_REST_API_KEY`. Complete the real
OneSignal email setup and verify the configured sender/domain there as well as
in Resend. Its available email plan/quota must be checked in the actual account;
the application does not promise unlimited free fallback. `email_to` targets only
the verified account email already selected by the authorized notice workflow.
It creates an email subscription if needed, following OneSignal's documented API.
Payload HTML is escaped plain account-notice text, not arbitrary sender HTML.

If Resend capacity is reserved and fallback is unconfigured, the worker waits
with `email_fallback_not_configured`; it does not exceed the cap or pretend it sent.
Changing API credentials after an uncertain send requires review rather than
silently retrying against a potentially different provider account.

## OneSignal web push integration boundary

OneSignal web push is the next integration checkpoint. It needs its own public
worker path under `/push/onesignal/`, separate from the installed-app `/sw.js`.
Current OneSignal documentation explicitly says JWT identity verification is
**not supported by the Web SDK**. Do not implement an imaginary JWT login flow or
use a predictable Supabase user ID as an unprotected alias. The intended adapter
uses authenticated server-issued random aliases and generic lock-screen payloads.
The existing native Web Push implementation remains until that checkpoint is
implemented/tested. No live provider account was configured by the local tests.

Official references inspected with TLS verification on 14 November 2026:

- https://resend.com/docs/knowledge-base/account-quotas-and-limits
- https://documentation.onesignal.com/reference/email
- https://documentation.onesignal.com/reference/create-message
- https://documentation.onesignal.com/docs/identity-verification
- https://documentation.onesignal.com/docs/onesignal-service-worker

Verification: 47 API integration tests, including 105 concurrent dispatches yielding exactly 100 Resend and 5 OneSignal messages, plus 29 production-browser checks and the web production build. These provider sends target isolated HTTP fixtures, not real inboxes.
