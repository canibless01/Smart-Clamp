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

## Running migrations

```bash
# Local Supabase (requires Docker):
supabase start
supabase db reset  # applies migrations in order, runs drift check

# Direct Postgres:
psql $DATABASE_URL -f migrations/001_*.sql
# ... in order

# Verify:
psql $DATABASE_URL -c "\d buildings"
# Schema dump comparison:
supabase db dump -f dump.sql && diff dump.sql supabase/migrations/dump.sql
```

## Auth / Storage / Realtime settings (versioned)

- **Auth**: `supabase/config.toml` — enable signup, manual linking, site_url `http://localhost:3000`, JWT expiry 3600.
- **Storage**: private buckets `evidence, reports, exports, avatars` — no public ACL, signed URLs 15 min, MIME/size validation, malware scan before usable attachment.
- **Realtime**: scoped publication per `ACCESS-MATRIX`; no broad telemetry subscription. Clients invalidate/refetch on version gap.
- **RLS tests**: see `apps/api/tests/test_rls.py` (cross-role/tenant, old-occupancy, viewer-revoke, anon secrets).

## Acceptance

- clean reset ✅ (tested via `supabase db reset` in CI)
- upgrade from prior revision ✅
- concurrent duplicate webhook credits once (unique provider+reference + row lock)
- concurrent wallet debits cannot overspend (ledger_version + check constraint + `SELECT FOR UPDATE`)
- owner A cannot SELECT B's rows; former tenant cannot read new occupancy; revoked viewer loses Realtime/REST; anon cannot read secrets
- schema drift CI fails on undocumented dashboard DDL

## Backups

- `supabase db dump` after each migration; store Git SHA + migration version.
- Rehearse restore: `supabase db reset && psql dump.sql`
- No paid pilot until all pass. Preserve migration checksums and deployment version.
