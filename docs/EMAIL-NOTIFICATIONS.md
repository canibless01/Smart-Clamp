# Account-event email delivery

Migration 027 adds immutable encrypted email requests. Optional account-event and
staff/utility notice email uses Resend's documented `POST /emails` API. Supabase
SMTP still handles signup, recovery and identity changes separately.

Users opt in through Settings, with a verified email on their account. Phone-only
accounts cannot enable email by typing an arbitrary destination. Staff choose
email in the existing audience-preview composer; the preview counts eligible
opted-in accounts. Utility messages also require the reviewed organization grant,
device scope and separate customer utility-notice consent. In-app notices remain
available independently of email.

The worker freezes recipient, sender, subject and plain-text content before the
first HTTP request. Those fields are encrypted with a distinct Fernet key and
protected from database updates. Each notification has one stable Resend
`Idempotency-Key`. An uncertain response retries **that exact request** within a
23-hour window, leaving a margin before Resend's documented 24-hour expiration.
It never creates another send identity to recover an uncertain send. Opt-out,
changed recipient, changed provider credentials, clock rollback or window expiry
stop further sends and leave a review reason. Sender configuration changes cannot
alter a request already submitted. Optional delivery configuration errors leave
a failed email record rather than rolling back the original account/payment
event. API and worker require the same keys/settings.

`provider_accepted` means Resend accepted the request, not inbox delivery or a read
receipt. The recipient's Alerts and operations delivery review show the channel,
state and relevant review reason. Bounce/complaint handling and inbox acceptance
must be monitored in Resend; signed delivery-webhook ingestion is not implemented
by this increment. Do not present provider acceptance as delivered.

## Configure and accept

1. Apply SQL through 027. Set `EMAIL_ENABLED=true`, `RESEND_API_KEY`, one verified
   `EMAIL_FROM`, distinct `EMAIL_ENCRYPTION_KEY` and exact HTTPS `APP_ORIGIN`.
   `tools/bootstrap_secrets.py` creates an email key for a **new** secrets directory;
   do not regenerate existing device, report, firmware or push keys.
2. Verify the real sender domain in Resend, publish its required DNS records,
   review sending limits/permissions and configure suppression/monitoring.
3. Enable confirmed email in Supabase. Users may opt in only with an account
   email. Secure additional-contact enrollment for phone-only accounts remains a
   separate account workflow; this feature does not fabricate verified emails.
4. Test actual inbox delivery, spam handling, bounces, provider outage, opt-out,
   changed email, key rotation and operations reconciliation on real providers.
   Preserve encryption keys; existing frozen requests cannot be reconstructed
   safely by changing their payload or reissuing them under a fresh identity.

Local tests use real PostgreSQL/GoTrue and an isolated HTTP provider fixture.
They verify staff preview → persisted in-app/email work → provider acceptance,
lost-response recovery with one provider-side message, opt-out, key/window stops,
and nonblocking configuration failures. No real inbox messages were sent.

Official references reviewed with certificate verification on 13 November 2026:

- https://resend.com/docs/api-reference/emails/send-email
- https://resend.com/docs/dashboard/emails/idempotency-keys

## Provider routing extension (028–029)

New email uses Resend within the owner-approved 100/day UTC budget and documented monthly allowance, then OneSignal. Counters reserve at actual dispatch and preserve prior local sends across migration. Both provider-specific bodies are frozen on submission. See `ONESIGNAL-PROVIDERS.md`, including the shared-account/Supabase SMTP quota boundary and OneSignal setup requirements.
