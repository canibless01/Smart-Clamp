# Database build contract
No database is provisioned. Source schema/RLS is preserved in reference/source-schema.txt for audit, not execution. Authoritative executable SQL must be developed and validated in migrations/ before backend build; never claim this reference is complete SQL.

Required migration families: 001 extensions/enums/identity+organizations; 002 buildings/occupancies/invitations/device-topology/linked-meters/credentials; 003 telemetry/inbox/deduplication/hash-chain; 004 wallets/immutable balanced ledger/payment events/vending/refunds; 005 commands/outbox/acknowledgments/schedules/budgets; 006 disputes/evidence/reports/private storage; 007 scoped access policies/grants/views; 008 flags/consent/subscriptions/jobs/inventory/payouts/ops. Each migration is immutable after deployment. Add corrections as new migrations; pin tool versions and test clean reset and upgrades in CI. Version Auth/Realtime/Storage settings alongside SQL. No live dashboard-only DDL.

Important corrections to source:
- auth.users foreign key and trusted roles/organization memberships; immutable occupancy history rather than overwriting tenant_id and leaking history.
- wallet exactly one owner (device/building/linked meter as explicitly modeled), utility uniqueness; positive amount and explicit reversals; unique gateway references namespaced by provider; audit and outbox in same transaction as wallet posting.
- usage dedupe unique(device_id, boot_id, sequence), ingestion vs measured timestamp, quality/source/calibration, cumulative energy reset/rollover, non-null single source. Late arrivals never double charge.
- source Timescale hypertable conflicts with id-only unique/primary keys on partitioned time; choose supported extension and composite keys or ordinary Postgres first.
- all exposed tables require RLS and explicit grants, including users, buildings, reports, disputes, ledgers and consent; source enables only a subset and omits essential SELECT policies.
- never SELECT device_hmac_key into public/device read views. Store encrypted credentials in private schema, separate from device metadata; use vault-managed rotation key outside DB.
- policy predicates must account for tenant occupancy intervals, homeowner, viewer grant, landlord ownership, organization/region and staff scope without recursive policy loops. Service key bypass requires API authorization too.
- explicit consent version/revocation and command dispatch recheck; command unique ID/nonce/expiry and durable acknowledgments; append-only audit grants.
- private Storage buckets with signed URLs and owner-scoped upload/download; Realtime must be explicitly scoped and tested. Anonymous read uses a minimal API projection, not a broad table grant.

Required SQL acceptance: clean reset; upgrade from prior revision; duplicate webhook concurrent posting credits once; two simultaneous wallet debits cannot overspend; owner A cannot select/update B's rows; former tenant cannot read new occupancy; revoked viewer loses Realtime/REST access; anonymous cannot read secrets or private evidence; staff scope constraints; refund and fulfillment retries reconcile. Generate schema dump and compare to deployed state; fail on drift. Preserve migration checksums and deployment version, backups and restore evidence. No paid pilot until these pass.
