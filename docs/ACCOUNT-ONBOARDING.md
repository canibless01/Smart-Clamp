# Account identity and profile completion

Migration 024 adds optional email, phone-free profiles and immutable, versioned
consent receipts. Existing accounts receive no fabricated consent: their next
sign-in goes to profile completion, and authenticated product operations require
completion. Refresh still works before completion. Logout remains available.

Password signup accepts **one** email or international phone, name, public
account type, password and an unchecked explicit Terms/Privacy checkbox. Supabase
confirms the contact; signup without a session requests the verification code.
Email OTP templates must contain `{{ .Token }}`. Login accepts email or phone.
Password recovery accepts the registered contact and verifies its recovery/SMS
code before updating the password and invalidating the recovery session.

Google uses Supabase's authorization-code flow with browser-generated PKCE S256.
The verifier, random flow identifier, setup intent and return path live only in
that tab's session storage for ten minutes. The callback validates the initiating
flow, removes code/query parameters from browser history, exchanges the code once,
and stores the returned session. The server fixes the callback to `APP_ORIGIN`;
an input redirect cannot override it. Tokens and codes must not be logged.

A new provider identity has no application role or consent. It must complete
its name, public account type and explicit legal acceptance. The server obtains
verified contacts from Supabase, never arbitrary profile form fields. Existing
roles remain unchanged, including staff accounts. A Google metadata field never
grants staff or utility access. Account linking/merging is Supabase's identity
policy; this application does not merge different user IDs by email.

Phone enrollment in Settings requires a sign-in within ten minutes, an initially
unbound security phone and Supabase `phone_change` verification for the same user
ID. Replacing an existing security phone uses account support/recovery rather
than silently replacing the number that authorizes power control. Email-only
users can view their workspace, link authorized devices and see their data, but
meter checkout and phone-based control confirmation require a verified phone.

## Operator configuration and acceptance

1. Apply SQL through 024. Configure real Supabase URL/anon key and exact public
   HTTPS `APP_ORIGIN`. Keep service-role credentials out of the browser.
2. Enable email/password and confirmed email in Supabase. Configure production
   SMTP, sender domain authentication, email signup/recovery OTP templates,
   expiry, abuse controls and rate limits. QA auto-confirm is never production.
3. Enable phone auth and configure Supabase's supported SMS provider and templates.
   Africa's Talking application event SMS is a separate integration.
4. Create the Google web OAuth application. Add Supabase's exact provider callback
   URI in Google, configure client ID/secret in Supabase, and finish Google's
   consent-screen/domain requirements. Allow the application's exact
   `https://<domain>/auth/callback` path and its flow query in Supabase's redirect
   allowlist; avoid broad wildcard domains. Preview URLs require explicitly
   reviewed callback settings. `/auth/options` exposes only readiness booleans
   and legal versions, never provider secrets.
5. Publish approved Terms/Privacy content with matching `LEGAL_TERMS_VERSION` and
   `LEGAL_PRIVACY_VERSION`. Unconfigured runtime uses clearly named preview
   versions; `check_config.py` rejects preview versions for launch. Configuration
   validation does not certify legal approval or the content itself.
6. On real providers test new/returning Google identities, cancellation, expired
   code, another tab, denied consent, verified email signup, recovery email,
   phone signup/enrollment, SMS delivery, throttling, revoked refresh sessions,
   and existing-account/provider linking policy. Check redirects, actual role
   and consent receipts without copying credentials into logs.

Local tests exercise real isolated GoTrue/PostgreSQL email/password and verified
identity onboarding, consent/role enforcement, refresh and browser journeys.
Google PKCE construction/invalid callback checks are contract tests. They are
**not** evidence of a live Google consent round trip or delivered email/SMS.
