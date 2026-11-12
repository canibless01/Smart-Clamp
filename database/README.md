# Database — SmartClamp Supabase Postgres

**No database is provisioned in this repo by default. Migrations are versioned, reproducible, and must be tested on a disposable project before staging.**

## Migration contract

Migrations live in `migrations/` and are applied in lexical order. Each file is immutable after deployment; corrections are new migrations.

| File | Content | Ticket |
|------|---------|--------|
| 001_extensions_enums_identity.sql | Extensions, enums, organizations, profiles, memberships, feature flags | T02 |
| 002_buildings_rooms_devices.sql | Buildings, rooms, occupancies (immutable history), invitations, linked_meters, devices, topology_edges, private.device_credentials | T02/T03 |
| 003_telemetry_inbox.sql | device_inbox (unique dedup), readings (immutable), outbox, usage_event_chain, power_fail_log | T04 |
| 004_wallets_ledger.sql | wallets (exactly one owner), quotes (immutable), payments (provider unique), vending_attempts, idempotency_keys, ledger_transactions/entries (balanced), tariffs, bills, payouts | T06 |
| 005_commands_outbox.sql | commands (monotonic seq, 120s expiry), receipts, off_reasons set, schedules (Africa/Lagos), budgets, policies | T07/T08 |
| 006_disputes_evidence_reports.sql | disputes (immutable snapshot), messages, support_tickets, reports (SHA256+signature+hashed token), private_objects, exports | T13 |
| 007_policies_rls.sql | RLS policies — owner/occupancy/viewer/landlord/org/region/staff scope without recursion; service-role bypass never substitutes authorization | T03 |
| 008_consent_subscriptions_ops.sql | consents (policy_epoch), subscriptions (grace ≠ OFF), jobs, inventory_movements, compliance, episodes, notifications (dedupe), incidents, audit_log | T11/T14/T15 |

## Source corrections applied

- `auth.users` is source of truth; `profiles` is extension with phone uniqueness, no public self-promotion.
- Occupancy is immutable intervals (`start_at`/`end_at`), not overwriting `rooms.tenant_id`; transfer closes then opens atomically.
- Wallet exactly one owner (`device_id XOR building_id XOR linked_meter_id`), utility uniqueness; positive amounts, explicit reversals.
- Inbox unique `(device_id, key_epoch, boot_id, seq)`; ingestion vs measured timestamp separate; quality/coverage stored.
- Ledger balanced per transaction; gateway reference namespaced `(provider, reference)`; outbox in same TX as wallet posting.
- Private credentials in `private.device_credentials` (encrypted at rest, vault-managed rotation key outside DB); never `SELECT device_hmac_key` into public views.
- All tables have RLS + grants; anonymous only sees minimal `public` projection via API, not broad table grant.
- Timescale: plain Postgres partitioning first; hypertable requires composite PK fixes — do not claim Timescale until hosted extension + volume justify it.

## Applying the current schema

Use `python tools/migrate.py` from the repository root with `DATABASE_URL` set securely. It applies files in lexical order, records checksums in `schema_migrations`, and uses an advisory lock. Hosted Supabase supplies `auth.users` and Auth helpers. The isolated QA service creates equivalent test prerequisites with actual GoTrue.

Files 009–014 add the live runtime, enforced ledger balance/immutability, accounting watermarks, single-use claims, utility scopes and source-time signal state and measured usage intervals. They supersede prototype broad table policies with a deny-by-default direct browser baseline. The Flask API enforces actual per-query ownership and membership scopes; no unrestricted browser telemetry publication is enabled.

007 and 008 contain pre-release repairs. If a previous prototype database already applied different versions, review the upgrade before use. Do not erase customer data, modify stored migration checksums or silently replay a changed migration.

No business sample customers, stock, plan prices or fake operational figures should be seeded. Real approved tariffs, payment destinations, factory identities and organization scopes are setup data with operational approval requirements. SQL alone does not qualify sensors or activate merchant integrations.

See [launch readiness](../docs/LAUNCH-READINESS.md) and [runtime API](../docs/API-RUNTIME.md) for exact deployment and integration-test commands.
