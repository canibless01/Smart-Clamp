# Staff-to-customer service messages

`/communications` is available to operations, support, superadmin and utility
staff. It sends plain-text service information, not executable ESP commands or
marketing broadcasts. Engineering's signed ESP update flow remains at
`/ops/firmware` and is documented in `FIRMWARE-UPDATES.md`.

## Audience and authorization

- The default UI resolves categories automatically: all eligible linked accounts,
  building, reviewed service area/region, device type, account type, or accounts
  responsible for overdue issued bills. Up to 5,000 devices/accounts are supported
  per preview; larger groups must be narrowed. Advanced selection still supports
  1–50 explicit device IDs with Select matching/Clear controls. The current device owners and active
  room occupants form the account audience, deduplicated across devices. No customer phone/email/address list is exposed in the composer.
- Operations/support/superadmin have the same trusted fleet authority as their
  service role. Customer, installer, referrer, finance and engineering roles
  cannot use the composer merely by knowing its URL.
- Utility staff need an active organization membership, unrevoked device scope
  and an enabled, unexpired **reviewed messaging grant**. A superadmin creates or
  changes that grant with version checking, a review note and an expiry of at
  most 365 days. The admin must review actual contract/purpose/authority first;
  the application cannot certify that legal review. Membership alone is not a
  messaging grant, and this grants no utility relay or firmware control.
- Utility recipients additionally opt into utility service notices in Settings.
  The default is off. Browser push/SMS/email require their separate channel opt-ins.

## Preview, commit and recovery

Preview stores immutable content, channels, devices and recipient IDs for five
minutes, displaying only counts to the sender. Send accepts the preview ID only,
rechecks current authority/occupancy/utility consent and refuses a changed
audience. Editing content/selection clears the UI preview. A sender can prepare
ten previews per minute and commit one notice per minute.

Automatic category sends commit an immutable dispatch and durable per-recipient
work in batches of 100. The response says queued, not delivered. Workers recheck
sender authority, current categories, utility scope/consent and bill state before
creating each batch of in-app/channel notices. Previously selected recipients can
be skipped, never expanded silently. History shows committed/queued/skipped counts
and can reuse prior category criteria. Advanced device sends retain their direct
in-app commit path. Repeating send—even with
a new HTTP idempotency key—returns the original dispatch instead of resending.
SMS respects quiet hours for these noncritical notices. Queued optional delivery
rechecks channel opt-out and utility opt-out before dispatch. Dispatch acceptance
is not a read receipt, handset display or proof that a user followed instructions.
An opt-out cannot recall notices already committed or sent.

Own committed notices appear in the sender's history and the recipient's Alerts.
Unknown provider outcomes are not blindly resent; use provider reconciliation.
Push endpoints remain encrypted and push lock-screen text remains generic.
Scope/consent changes require another preview rather than silently redirecting a
message to a new occupant. This is intentionally a bounded service channel;
scheduled campaigns, attachments, marketing lists, read receipts and utility
remote control are not implied.

## Deployment and verification

Apply SQL through 032, run API and outbox worker with matching channel
configuration, and provision real operator roles/utility scopes through a reviewed
administrative process. The superadmin composer shows grant versions and a review
form. Do not copy QA grants or automatically grant every organization permission.

Runtime routes: `GET /communications/context`, `POST /communications/previews`,
`POST /communications/send`, and superadmin-only
`POST /ops/organizations/{id}/notice-grant`. Profile preferences include explicit
boolean `utility_notices_enabled`. All new tables deny direct browser access.

Integration tests cover private recipients, deduplication, ownership change,
grant revocation, opt-out, unauthorized roles and actual encrypted Web Push HTTP
dispatch from the staff composer. Browser tests follow staff preview/send →
recipient Alerts, plus utility scope/recipient opt-in → persisted notice.

## Location and overdue-bill inputs

Regions/areas come from explicit operations-maintained service-area records and
versioned device assignments. Legacy default `buildings.region=futa` is not taken
as verified geography. The composer supplies create/assignment controls; typed
addresses are not geocoded or guessed. Utility selectors expose only permitted
area/region metadata and opaque assigned-building labels.

An overdue category requires an actual issued bill marked overdue with positive
amount and a finance/superadmin-reviewed account responsibility. Zero credit or
low wallet balance is not debt. Reviewed former occupants can receive their own
bill notice without exposing it to the current occupant. Utility senders cannot
select financial cohorts. Responsibility recording/release is audited; no money
movement or arbitrary unit assignment is implied. External bill issuance/import
and wider financial workflows remain separately tracked.

Verification:52 API integration checks, including 55 automatically selected devices,
501 accounts in six duplicate-safe batches, paid-bill skip, scope changes and
utility financial-cohort denial.30 production-browser checks pass, including
category selection without device checkboxes and mobile overflow checks.
