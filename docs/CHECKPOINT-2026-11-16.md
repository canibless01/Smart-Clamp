# SmartClamp checkpoint and remaining work — 16 November 2026

This is the current handoff for branch `ui-revamp`. Read this before older dated status paragraphs. The owner asked to stop at the current boundary, push all source work, and document the remaining work so another chat can continue without losing progress.

**The product is not yet at “enter environment variables, run SQL, flash an ESP, and everything works.”** Several software workflows and production hardware adapters still need implementation. Real provider and physical acceptance are separate from code completion. Do not describe either as finished because a fixture, compilation or static page exists.

## Repository checkpoints already pushed

| Commit | Concrete result |
|---|---|
| `9360188` | Automatic service-message categories, reviewed overdue-bill targeting, saved filter reuse and durable fanout batches |
| `26be2ce` | Private support queue, staff claims/waiting/resolution, customer reopening and notifications |
| `ef38379` | Bill dispute selection/review/discussion/escalation/closure without adjustment, immutable evidence and tenant bill-period privacy |
| `8da2054` | Administrator case reassignment, reviewer release, role-checked rosters, revoked-role exclusion and handoff notifications |
| `2706349` | Signed Resend delivery callbacks, safe unknown-send reconciliation, negative feedback/suppression, operations review and finance landing correction |
| `f6a696a` | Ten new actual populated workflow screenshots, bringing the review gallery to 86 captures |

The checkpoint commit containing this document additionally preserves the **unfinished email-contact enrollment source** described below. Find its exact hash with `git log -1`; do not confuse it with the last fully verified provider checkpoint.

No force push, environment publication, manual application deployment or external database migration was performed.

## Validation boundary

The verified provider/handoff work passed:

- 59 real isolated PostgreSQL/GoTrue API integration tests, including the independent official Svix signature example, signed callback races, duplicates, reordered feedback and suppression.
- 32 production-browser checks, including real landlord/resident payment quoting, signup/session retention, staff handoff, dispute reopening, PWA/privacy and OTA/report journeys.
-Production Next.js build and native firmware policy/crypto/link/driver/prepaid checks.
-Four local PostgreSQL migration/checksum/replay tests for the targeted Supabase bundle.
-Ten new real browser screenshots, with explicit QA banners and desktop/mobile overflow checks. Support and finance captures were visually inspected.

Those results **do not test the new email OTP enrollment exchange**. The checkpoint build is rerun with that source present. The existing 59-test API suite is also being rerun at this checkpoint; its first attempt failed because the local QA Auth service was unavailable, not because 59 workflows were exercised and rejected. See the final verification note appended below for the restored-service result. No new enrollment integration/browser test has been added yet.

Runtime services and private `/tmp` fixtures can disappear across environment restarts. A stopped QA service is not proof of an application regression. Restore only the intended isolated stack, verify health, and rerun the affected checks. Do not reset the database or modify applied migrations to repair the environment.

## Work in progress: add an email to an existing phone account

### Source present in this checkpoint

- `apps/api/app/live_auth.py`: `/auth/email/enroll` and `/auth/email/verify`; recent sign-in requirement; same-account provider confirmation before updating a previously empty profile email; existing email changes remain an account-recovery concern.
- `apps/web/components/EmailEnrollment.tsx` and the Settings integration: email/code form, retained errors, explicit notification-choice separation and session replacement if verification returns a fresh same-user session.
- `tools/export_runtime_contract.py` and regenerated runtime contracts: the actual two new routes, not proof of acceptance.
- `tools/email_otp_qa.py`: a draft isolated GoTrue + Mailpit + OTP template runner. It uses only localhost/non-relaying test mail and private `/tmp` configuration. **It has not been started or verified.**
- `tools/qa_services.py`: optional cleanup of the specifically named QA SMTP container.

The `axllent/mailpit:v1.27` image was downloaded. No new OTP QA stack was created, no OTP reached the mail sink, and no real external email was sent. The image being available is not a successful enrollment test.

### Finish this first

1. Review the new endpoint security/state handling before shipping it. Confirm recent sign-in enforcement, same-user confirmation, uniqueness/conflicting contacts, existing bound-email protection, retries after lost verification responses, preservation of phone/role/consent, and session refresh after OTP completion.
2. Start the draft runner on an unused local API port so the existing main QA API is not displaced:

   ```sh
   .venv/bin/python tools/email_otp_qa.py --config /tmp/smartclamp-qa-email-otp.json --fixture /tmp/smartclamp-email-otp-fixture.json --port 5001
   ```

   Its default dedicated DB/Auth/mail ports are 15440/15441/15442. The runner requires Docker and a Docker-host-reachable HTTP template server; that networking/template setup is unverified. Resolve actual failures instead of adding an application success bypass.
3. Add real integration tests: phone signup → recent login → request email change → actual GoTrue SMTP message → retrieve OTP only from the private local sink → reject wrong/other-account codes → verify the correct code → same profile/phone/role → opt in → subsequent email login and refresh. Verify that no profile email appears before confirmation and notification opt-in stays unchanged.
4. Add a production-browser Settings journey against the actual OTP stack. Configure the test server/proxy deliberately; the main production QA server currently proxies port 5000. Do not accidentally point the wrong browser fixture at another Auth/database.
5. Configure Supabase's **email-change template to include `{{ .Token }}`** for this code-entry UI; check current official Supabase/GoTrue behavior. The draft template does that only inside local QA. Default confirmation-link handling has not been added to this new UI.
6. Update account onboarding/email docs, regenerate the runtime contract, rerun appropriate checks, refresh the Settings capture if the feature changes its layout, and push another verified checkpoint.

This work is committed for continuity, not accepted as a finished production feature. Do not deploy it as verified without completing those checks.

## Remaining software implementation

These are concrete outstanding groups, not items solved by setting a provider key. `IMPLEMENTATION-MATRIX.md`, `LOOP-CATALOG.md` and the actual runtime contracts remain the cross-check for the broader specification.

### 1. Paid subscriptions and auto-recharge

- Subscription read state exists. Plan change and cancellation intentionally return unavailable errors in `live_auth.py`; `settings/subscription/page.tsx` is not a working checkout.
- Implement approved plan/cadence mapping, separate subscription checkout/invoices, persisted provider identity before HTTP, verified provider callbacks/reconciliation, recurring collection/cancellation, renewal/grace/expiry and server entitlement projection.
- Implement explicit auto-recharge mandate/consent, limits, triggers, provider authorization, revocation, duplicate/concurrent trigger protection and uncertain-charge recovery. An ordinary saved payment or browser checkbox is not a mandate.
- Keep electricity wallet/usage separate from subscription revenue. Subscription failure must never create a relay OFF reason or consume electricity credit.
- Need actual approved prices and merchant plan/mandate mapping; do not invent them or treat those business decisions as already approved.

### 2. Schedules, budgets and restore behavior

- Schema/native policy pieces are not an end-to-end automation feature.
- Implement versioned policies, scoped delegated authorization, trusted local time, recurrence/time-zone rules, missed/stale occurrence handling, offline execution, synchronization/receipts and visible current state.
- Preserve independent manual, protection, wallet, budget and schedule restrictions. A recharge, subscription change or remote restore cannot clear unrelated restrictions.
- Exercise power loss, clock rollback/untrusted time, reconnect/replay, overlapping intentions and durable-storage failure on the actual local execution path. Cloud cron alone does not implement offline control.

### 3. Monetary dispute adjustments, refunds and reconciliation

- Support and dispute ownership/discussion/reopening now work. Dispute closure without adjustment **does not move money**.
- Implement attributable proposed financial changes, independent review/approval where required, exact original ledger/bill references, balanced immutable reversals/refunds, bounded provider recovery and customer-visible decision history.
- Do not insert unbacked units, silently edit past postings, treat a vendor timeout as a failed charge, or retry a new collection/vend reference after uncertainty.
- Pilot/manual unit allocation still needs an explicit funded/test-only policy and reviewed balanced posting. It is not a landlord resale capability.
- Real bill issuance/import and reviewed responsibility assignment are separate: responsibility review exists, but the gallery's manual QA bill is not a production bill source.

### 4. No-meter buildings, generator/common-load allocation

- Activation is deliberately blocked. Source requirements leave settlement cadence, provisional margin, custody/remittance, loss allocation and payment-evidence policy unresolved.
- After those decisions are approved, implement the actual-bill input, complete measured denominator, disclosed provisional shares, contribution/reconciliation/carry-forward, dispute and evidence paths.
- Missing readings/coverage or an incomplete denominator must block exact allocation. Do not invent a NEPA billing API, tariff, fee or private wallet pooling/resale rule.

### 5. Other internal/company workflows

- Formal support escalation/SLA policy and attachment upload/access/scanning/retention are unfinished.
- Full operations panels A–M are unfinished: inventory/cost/batch/RMA stock lifecycle, access reviews, incident detail/diagnostic resolution, compliance/calibration expiry, regional/vendor management, financial reconciliation and source-backed company metrics.
- Finance now lands on the working dispute workspace; this is not a complete company finance dashboard. MRR/CAC/runway/churn cannot be fabricated from unrelated rows.
- Agent/referrer attribution → approved payable → reviewed provider payout, installer entitlement and payout reconciliation remain incomplete. An installer submitting diagnostics is not commissioning or payout approval.
- Scheduled authenticated report delivery/PDF generation and their recovery/access behavior remain incomplete. Stored signed reports/CSV/sharing/revocation are implemented.
- Utility messaging has reviewed grants and opt-in; utility billing/control is not implemented by that grant. Any future control needs explicit authority, consent, hardware eligibility and recorded decisions.
- Organization administration, incident detail, community, smart-device integrations, reader setup, public device sharing and bank-transfer pages still expose real unavailable gates. Finish approved scope or explicitly exclude it from the agreed launch; do not replace gates with fake successful panels.
- Water/gas payment and USSD are not implemented. They must not be enabled with a flag that lacks a real integration.

### 6. Notifications and account completion

- Finish the email enrollment work above.
- Resend feedback is implemented. OneSignal email delivery-feedback ingestion is **not** implemented; research its current official supported hooks/reports and plan limitations before promising it.
- SMS adapter/quiet-hours/unknown-outcome handling and OneSignal/native web push exist; actual sender/app/handset/browser acceptance is still required.
- Review opt-out, shared browsers/logout, revoked staff access, changed contacts and cross-provider suppression on real configured accounts.
- Resend's 100/day counter is for this application's reserved sends, on UTC days, with a 3000/month cap. It cannot count unrelated sends/Supabase SMTP performed outside this worker. Preserve the chosen provider/request on uncertainty; do not fail over and duplicate mail.

## Production firmware and hardware still required

Read `firmware/README.md`, `firmware/HARDWARE-CONFIG.md`, `FIRMWARE-UPDATES.md`, `contracts/device-protocol.md` and the native tests before editing.

- The ESP32 commissioning agent implements Wi-Fi/TLS, signing, telemetry/poll/receipt and OTA paths. Native policies cover true-power accounting, independent OFF reasons, prepaid allowances, interlocks and framed links.
- Production sensor/metrology acquisition, physical actuator/feedback integration, GSM transport, production ESP-NOW/RS485/optical/BLE adapters, exact BOM/pins/calibration and topology provisioning still require implementation/integration and qualification.
- Compile/native tests and a signed downloaded binary do not prove mains safety, measurement accuracy, power-fail hold-up, journal durability on the chosen storage, radio coverage, physical cutoff, boot health or rollback.
- Do not assume an exported binary on an arbitrary ESP connects and operates the site automatically. It needs unique identity/keys, correct firmware profile, reachable configured endpoint, provisioned topology, qualified sensing/relay hardware, calibration and accepted commissioning.
- Test actual install → signed measurements → cloud/device policies → physical feedback → dashboard, plus device-to-device/gateway outages, power cycling, recovery/replay and OTA upload/canary/reboot/rollback receipts.
- Generic ESP32/old ESP8266 prototypes are not an approved production BOM. Do not guess mains wiring, safety thresholds, capacitor sizing or measured calibration results.

## External Supabase — authorised, not yet migrated

Target: `fmjzskjkvdbffwkiujnu`, https://fmjzskjkvdbffwkiujnu.supabase.co . The owner explicitly authorised applying repository SQL to **this project only**.

- Reviewed bundle: `docs/deployment/fmjzskjkvdbffwkiujnu-bootstrap.sql`, through 035.
- Runner: `tools/supabase_migrate.py`; target/runbook: `docs/deployment/SUPABASE-fmjzskjkvdbffwkiujnu.md`.
- No Supabase connector tools or secure admin credential bindings were exposed at the latest check. The URL responding401 establishes reachability only. No external SQL or remote migration receipt exists.
- For the prepared Management API runner, securely configure `SUPABASE_ACCESS_TOKEN`. A service-role key is not general schema-SQL access for that runner. A direct PostgreSQL `DATABASE_URL` is a separate alternative.
- Never request/paste credentials into chat or logs. Check target metadata/ledger/checksums, apply only the intended project, preserve a sanitised receipt and verify schema afterward. Matching existing checksums skip safely; drift/untracked schema must be reviewed rather than reset.
- Applied 001–035 files are immutable. Further schema changes require 036 or later.

## Provider/deployment/owner acceptance checklist

1. Real Supabase Auth site/redirect allowlists, Google provider/client consent, SMTP/email-change OTP template, phone/SMS verification/recovery, production legal versions and session policies. Never deploy QA auto-confirm settings.
2. Application Resend domain/DNS, `EMAIL_FROM`, preserved distinct `EMAIL_ENCRYPTION_KEY`, REST key and `RESEND_WEBHOOK_SECRET`; register the API webhook and verify real negative/delivery events. OneSignal app/REST configuration and separate worker scope; opt-in push on actual supported browsers/devices. SMS account/sender and real handset tests.
3. Real Paystack/VTPass merchant activation, exact webhook URL/keys, approved service catalogue/tariffs/fees, failure/uncertainty/refund acceptance and real meter/token entry. Local fixture purchases are not real merchant acceptance.
4. Deploy **web, Flask API and durable outbox worker**, not only Next.js. Apply SQL, configure exact HTTPS origins/CORS and provider callbacks; preserve keys and private artifact storage; configure backups, restore tests, logs/alerts, worker scheduling/recovery and secure staff membership/scope setup.
5. Factory identity registration and keys, firmware signing versus report signing separation, correct API/certificate/time configuration, real artifact hosting and physical commissioning/qualification.
6. Approved company/legal/support/contact/territory information, real product photos, final pricing/plan mapping, installation/service promises, refund/dispute policies and staffed escalation/SLA. `BEFORE-LAUNCH.md` lists information-centred pages and owner content still needed.

Do not present this list as a configuration-only launch. The unfinished implementation groups above must be completed or explicitly removed from the owner's agreed launch scope first.

## Visual review and links

- GitHub screenshots: https://github.com/canibless01/Smart-Clamp/tree/ui-revamp/docs/screenshots
- Page-by-page index: https://github.com/canibless01/Smart-Clamp/blob/ui-revamp/docs/screenshots/INDEX.md
- Local filterable gallery: `docs/screenshots/gallery.html`.

There are 86 actual screenshots: 76 original captures plus 10 new support/finance/dispute/operations captures, including two new mobile views. Banners explicitly identify local simulated/provider-fixture data. Original snapshots are dated 13 November; workflow updates are dated 15 November. The new email enrollment form is **not yet included or accepted** in that gallery.

## Continue safely

1. Inspect Git/status/AGENTS and read this document plus `NEXT-CHAT-PROMPT.md`; preserve approved white/forest/sage UI and existing verified work.
2. Finish and test email OTP enrollment first; do not call the draft runner or interface accepted simply because this checkpoint compiles.
3. Then complete remaining approved software loops, using current official provider APIs and actual local services. Keep physical/provider acceptance distinct from software fixture proof.
4. Commit and push bounded verified batches to `origin/ui-revamp`, report exact hashes and maintain the implementation matrix. Never force-push or publish/deploy the environment without the owner's instruction.
5. Keep QA configs, identities, tokens and signing keys private under `/tmp`/ignored paths. Never commit credentials, invent user data in production, or rerun source changes already pushed.

## Final checkpoint verification

After restarting only the existing isolated QA database/Auth containers, the current source passed all 59 existing API integration tests again (`/tmp/smartclamp-checkpoint-restored-api.log`). The production web build with the draft email-enrollment component also passed (`/tmp/smartclamp-checkpoint-build.log`). The most recent complete production-browser regression remains the 32-pass run at the verified Resend/finance checkpoint; it has not been rerun for email enrollment. The actual SMTP/OTP runner and new email exchange remain untested. Local `/tmp` logs are session aids, not portable proof or committed credentials.
