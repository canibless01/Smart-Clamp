# Staff-to-customer service messages

`/communications` is available to operations, support, superadmin and utility
staff. It sends plain-text service information, not executable ESP commands or
marketing broadcasts. Engineering's signed ESP update flow remains at
`/ops/firmware` and is documented in `FIRMWARE-UPDATES.md`.

## Audience and authorization

- Staff select 1–50 explicit device IDs. The current device owners and active
  room occupants form the account audience, deduplicated across devices; maximum
  500 accounts. No customer phone/email/address list is exposed in the composer.
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
  The default is off. Browser push/SMS require their separate channel opt-ins.

## Preview, commit and recovery

Preview stores immutable content, channels, devices and recipient IDs for five
minutes, displaying only counts to the sender. Send accepts the preview ID only,
rechecks current authority/occupancy/utility consent and refuses a changed
audience. Editing content/selection clears the UI preview. A sender can prepare
ten previews per minute and commit one notice per minute.

The send transaction records one immutable dispatch and one in-app notice per
recipient, plus optional configured push/SMS outbox work. Repeating send—even with
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

Apply migration 026 after 025, run API and outbox worker with matching channel
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
