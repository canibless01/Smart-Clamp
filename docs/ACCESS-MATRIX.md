# Access, routing and dashboard alignment
Deny by default. Resolve identity from validated Supabase JWT, then fetch trusted active memberships/occupancies. UI role cards are intent, never permission grants. A user may have multiple memberships; show an explicit workspace picker instead of guessing one global role. API derives allowed scope per request.

| Role | Home route | Read scope | Allowed writes |
|---|---|---|---|
| tenant | /dashboard/tenant | current room; history within occupancy; own payments | own recharge/disputes/preferences and eligible self-control |
| homeowner | /dashboard/homeowner | owned devices/meter links/history | own links/report/viewers and capable Pro controls |
| landlord | /dashboard/landlord | owned building aggregate; necessary room billing | rooms/invites/transfers; documented maintenance; reminders; never tenant debt punitive cutoff |
| installer | /portal/installer | assigned job and diagnostic subset | assigned commissioning/tests, not tariff/ledger/owner finance |
| agent | /portal/agent | own referred leads/payout ledger | referral leads/own payout profile |
| referrer | /portal/referrer | own referral attribution | own referral/profile |
| nepa_staff | /dashboard/utility | contracted region aggregates; approved drilldown | scoped bills/broadcasts; consent-gated control request |
| internal_ops | /ops | A/B/E/G/H/I operational scope | dispatch/compliance/inventory, no arbitrary money edit |
| internal_finance | /ops | C/D and payment reconciliation | reviewed reversals/payout approvals, never direct balance edit |
| internal_support | /ops | E and assigned case evidence | responses/escalations, no signing key access |
| internal_engineering | /ops | A/B/F/J diagnostic scope | approved rollout/diagnostics, not finance/personal exports |
| internal_superadmin | /ops | privileged scope subject to audit | role/organization configuration with step-up and audit |
| read-only viewer | /dashboard/shared | explicit unexpired device grant | none; cannot derive control from underlying owner's tier |
| public | / or /d/token | minimal publication projection | validation; initiate payment via server quote |

Ops panels corrected to master12.6: A fleet; B alerts/tamper; C adoption; D finance; E disputes/support; F errors; G compliance; H field jobs; I inventory; J flags; K internal access audit; L geographic; M vendor partnerships. Previous page16b shorthand confused panels B/C/D: this table overrides it. Finance runway comes from explicit finance inputs, not inferred from customer wallet liabilities.

## Shared dashboard response
Every dashboard returns snapshot_version, generated_at, authorized_context, devices[{id,role,capabilities,supply_state,connectivity,relay:{requested,observed,observed_at,pending_command_id,off_reasons},measurement:{value,unit,observed_at,quality,coverage},wallet:{available,reserved,unit,ledger_version}}], alert_counts and allowed_actions. Monetary values use integer kobo. Supply enum present/absent/brownout/surge/unknown; connectivity online/stale/offline/dependent_unknown; verification verified/suspected_mismatch/insufficient_coverage/unavailable. Never flatten these independent statuses into one misleading ON badge.

Initial snapshot via authorized API, then scoped event invalidation/Reatime by version; reconnect refetches snapshot. No raw secret-bearing tables in browser subscriptions. Logout clears cache; occupancy transfer/revocation invalidates channel grants. Feature-gate result = rollout ∩ entitlement ∩ physical capability ∩ actor scope ∩ applicable consent; never UI-only security.
