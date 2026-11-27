-- SmartClamp target project: fmjzskjkvdbffwkiujnu
-- Execute only in this project. Exact migration checksums are tracked below.
BEGIN;

SELECT pg_advisory_xact_lock(hashtext('smartclamp-migrate'));

DO $sc_empty$ BEGIN IF to_regclass('public.schema_migrations') IS NULL AND EXISTS(SELECT c.relname AS name FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind IN('r','p') AND c.relname<>'schema_migrations'
AND NOT EXISTS(SELECT 1 FROM pg_depend d WHERE d.objid=c.oid AND d.classid='pg_class'::regclass AND d.deptype='e') ORDER BY c.relname) THEN RAISE EXCEPTION 'Untracked public tables exist; inspect before applying SmartClamp'; END IF; END $sc_empty$;

CREATE TABLE IF NOT EXISTS public.schema_migrations(name text PRIMARY KEY,sha256 text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now());

DO $sc_known$ BEGIN IF EXISTS(SELECT 1 FROM public.schema_migrations WHERE name NOT IN('001_extensions_enums_identity.sql','002_buildings_rooms_devices.sql','003_telemetry_inbox.sql','004_wallets_ledger.sql','005_commands_outbox.sql','006_disputes_evidence_reports.sql','007_policies_rls.sql','008_consent_subscriptions_ops.sql','009_live_runtime.sql','010_financial_guardrails.sql','011_accounting_watermarks.sql','012_claims_and_utility_scope.sql','013_signal_observation.sql','014_measured_usage_intervals.sql','015_field_workflow.sql','016_sms_dispatch.sql','017_firmware_delivery.sql','018_provider_unit_reconciliation.sql','019_meter_payment_destinations.sql','020_central_meter_destinations.sql','021_signed_report_exports.sql','022_immutable_quotes_tariffs.sql','023_prepaid_policy_sync.sql','024_account_onboarding.sql','025_web_push.sql','026_scoped_service_notices.sql','027_email_dispatch.sql','028_email_provider_routing.sql','029_frozen_provider_payload.sql','030_onesignal_web_push.sql','031_notice_audiences.sql','032_notice_batch_capacity.sql','033_support_workflow.sql','034_dispute_review.sql','035_email_delivery_receipts.sql','036_alert_interactions.sql','037_device_experience_state.sql','038_signed_channel_manifests.sql','039_signal_investigations.sql','040_transport_reports.sql','041_automation_policy_sync.sql','042_revoke_browser_sequence_access.sql','043_versioned_business_rules.sql','044_energy_comparison_history.sql','045_energy_comparison_schedules.sql','046_energy_review_cases.sql')) THEN RAISE EXCEPTION 'Unknown migration history; review the target or checkout'; END IF; END $sc_known$;

DO $sc_step_0$
DECLARE seen text;
BEGIN
  SELECT sha256 INTO seen FROM public.schema_migrations WHERE name='001_extensions_enums_identity.sql';
  IF FOUND THEN
    IF seen IS DISTINCT FROM 'd824c3bb39efc7bcdb7f16a5b77846dab67fa3685ae6eb504e69e82afe31177f' THEN RAISE EXCEPTION 'Migration checksum mismatch: 001_extensions_enums_identity.sql'; END IF;
  ELSE
    EXECUTE $sc_source_d824c3bb39efc7bcdb7f16a5b77846dab67fa3685ae6eb504e69e82afe31177f$
-- 001_extensions_enums_identity
-- Extensions, enums, identity + organizations
-- Immutable after deployment; do not edit after release.

create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- Enums
do $$ begin
  create type user_role as enum ('tenant','landlord','homeowner','installer','agent','referrer','nepa_staff','internal_ops','internal_finance','internal_support','internal_engineering','internal_superadmin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type device_role as enum ('transformer_monitor','pole_gateway','pole_device','house_full','building_hub','ir_reader');
exception when duplicate_object then null; end $$;

do $$ begin
  create type building_meter_type as enum ('with_meter','no_meter');
exception when duplicate_object then null; end $$;

do $$ begin
  create type subscription_tier as enum ('free','basic','basic_pro','pro');
exception when duplicate_object then null; end $$;

do $$ begin
  create type calibration_status as enum ('qualified','uncalibrated','expired','failed');
exception when duplicate_object then null; end $$;

-- Organizations (white-label)
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subdomain text unique not null check (subdomain ~ '^[a-z0-9-]{3,30}$'),
  primary_color_hex text check (primary_color_hex ~ '^#[0-9A-Fa-f]{6}$'),
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auth users mirror (Supabase auth.users is source of truth; this is profile)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text unique not null,
  full_name text not null,
  role user_role not null,
  organization_id uuid references organizations(id),
  subscription_tier subscription_tier not null default 'free',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Memberships: trusted active memberships for org/region/building/device scope
create table if not exists memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  role user_role not null,
  organization_id uuid references organizations(id),
  region text,
  building_id uuid,
  device_id uuid,
  invited_by uuid references profiles(id),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  check (revoked_at is null or revoked_at > granted_at)
);
create index idx_memberships_user_active on memberships(user_id) where revoked_at is null;

-- Feature flags
create table if not exists feature_flags (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  description text,
  enabled_globally boolean not null default false,
  enabled_for_tiers subscription_tier[],
  enabled_for_building_ids uuid[],
  enabled_for_regions text[],
  enabled_for_organization_ids uuid[],
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into feature_flags(key, description, enabled_globally) values
  ('pro_relay_control','Pro relay control', true),
  ('basic_pro_bill_forecast','Bill forecast', true),
  ('basic_pro_load_signature','Load signatures', true),
  ('basic_pro_power_factor','Power factor', true),
  ('basic_pro_undersupply_credit','Undersupply credit', true),
  ('basic_pro_peer_benchmark','Peer benchmark', true)
on conflict (key) do nothing;

$sc_source_d824c3bb39efc7bcdb7f16a5b77846dab67fa3685ae6eb504e69e82afe31177f$;
    INSERT INTO public.schema_migrations(name,sha256) VALUES('001_extensions_enums_identity.sql','d824c3bb39efc7bcdb7f16a5b77846dab67fa3685ae6eb504e69e82afe31177f');
  END IF;
END $sc_step_0$;

DO $sc_step_1$
DECLARE seen text;
BEGIN
  SELECT sha256 INTO seen FROM public.schema_migrations WHERE name='002_buildings_rooms_devices.sql';
  IF FOUND THEN
    IF seen IS DISTINCT FROM '0aa5d5c42bd594ef7b10b85106e607ad1e1f8496f9a2c8808c7a41c0594c68b1' THEN RAISE EXCEPTION 'Migration checksum mismatch: 002_buildings_rooms_devices.sql'; END IF;
  ELSE
    EXECUTE $sc_source_0aa5d5c42bd594ef7b10b85106e607ad1e1f8496f9a2c8808c7a41c0594c68b1$
-- 002_buildings_occupancies_invitations_device_topology
create table if not exists buildings (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null references profiles(id),
  organization_id uuid references organizations(id),
  name text not null,
  address text not null,
  meter_type building_meter_type not null,
  region text not null default 'futa',
  timezone text not null default 'Africa/Lagos',
  topology_version int not null default 1,
  setup_state text not null default 'provisioned',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_buildings_landlord on buildings(landlord_id);

create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references buildings(id) on delete cascade,
  label text not null,
  created_at timestamptz not null default now(),
  unique(building_id, label)
);

-- Immutable occupancy history — never overwrite tenant_id
create table if not exists occupancies (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  tenant_id uuid not null references profiles(id),
  start_at timestamptz not null default now(),
  end_at timestamptz,
  created_at timestamptz not null default now(),
  check (end_at is null or end_at > start_at),
  -- no overlapping active occupancy: enforced via exclusion or function; use partial unique + trigger
  unique(room_id, tenant_id, start_at)
);
create index idx_occupancies_room_active on occupancies(room_id) where end_at is null;
create index idx_occupancies_tenant on occupancies(tenant_id);

-- Invitations: one-use expiring
create table if not exists invitations (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  token text unique not null, -- opaque >=128-bit random
  invited_by uuid not null references profiles(id),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid references profiles(id),
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

-- Linked meters (optical/manual)
create table if not exists linked_meters (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id),
  meter_number text not null,
  disco_name text,
  utility_type text not null default 'electricity' check (utility_type in ('electricity','water','gas')),
  provider text,
  validated_at timestamptz,
  status text not null default 'pending' check (status in ('pending','link_confirmed_live','link_failed','unsupported_meter')),
  created_at timestamptz not null default now(),
  unique(owner_id, meter_number)
);

-- Devices: secrets split out; this table has metadata only, no hmac key
create table if not exists devices (
  id uuid primary key default gen_random_uuid(),
  profile device_role not null,
  capabilities text[] not null default '{}',
  board text not null default 'esp32dev',
  firmware_version text,
  config_epoch int not null default 1,
  config_sha256 text check (config_sha256 ~ '^[0-9a-f]{64}$'),
  key_epoch int not null default 1,
  calibration_status calibration_status not null default 'uncalibrated',
  calibration_id uuid,
  owner_id uuid references profiles(id),
  room_id uuid references rooms(id),
  building_id uuid references buildings(id),
  pole_group_id uuid,
  linked_meter_id uuid references linked_meters(id),
  install_state text not null default 'provisioned' check (install_state in ('provisioned','assigned','provisioning','diagnostic_failed','awaiting_online','commissioned','commissioning_failed')),
  installer_id uuid references profiles(id),
  last_seen_at timestamptz,
  installed_at timestamptz,
  created_at timestamptz not null default now(),
  check ( (room_id is not null)::int + (building_id is not null)::int + (pole_group_id is not null)::int >=0 )
);
create index idx_devices_owner on devices(owner_id);
create index idx_devices_building on devices(building_id);
create index idx_devices_pole on devices(pole_group_id);

-- Topology edges: parent/child with validity intervals, acyclic enforced by trigger
create table if not exists topology_edges (
  id uuid primary key default gen_random_uuid(),
  parent_device_id uuid references devices(id),
  parent_meter_id uuid references linked_meters(id),
  child_device_id uuid not null references devices(id),
  valid_from timestamptz not null default now(),
  valid_to timestamptz,
  common_load_classification text,
  created_at timestamptz not null default now(),
  check (valid_to is null or valid_to > valid_from),
  check ( (parent_device_id is not null)::int + (parent_meter_id is not null)::int =1 )
);
create index idx_topology_child on topology_edges(child_device_id) where valid_to is null;

-- Device credentials: private, encrypted at rest, only service can read
create schema if not exists private;
create table if not exists private.device_credentials (
  device_id uuid primary key references devices(id) on delete cascade,
  key_epoch int not null,
  encrypted_secret text not null, -- vault-encrypted
  direction text not null check (direction in ('telemetry','command')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique(device_id, key_epoch, direction)
);

$sc_source_0aa5d5c42bd594ef7b10b85106e607ad1e1f8496f9a2c8808c7a41c0594c68b1$;
    INSERT INTO public.schema_migrations(name,sha256) VALUES('002_buildings_rooms_devices.sql','0aa5d5c42bd594ef7b10b85106e607ad1e1f8496f9a2c8808c7a41c0594c68b1');
  END IF;
END $sc_step_1$;

DO $sc_step_2$
DECLARE seen text;
BEGIN
  SELECT sha256 INTO seen FROM public.schema_migrations WHERE name='003_telemetry_inbox.sql';
  IF FOUND THEN
    IF seen IS DISTINCT FROM '8212209cd651a5c96833b2918f7dc2f62e47f2fec97ce575cfe4e7d5352f1961' THEN RAISE EXCEPTION 'Migration checksum mismatch: 003_telemetry_inbox.sql'; END IF;
  ELSE
    EXECUTE $sc_source_8212209cd651a5c96833b2918f7dc2f62e47f2fec97ce575cfe4e7d5352f1961$
-- 003_telemetry_inbox_deduplication_hash_chain

-- Inbox: durable ingestion with exact identity
create table if not exists device_inbox (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references devices(id),
  key_epoch int not null,
  boot_id text not null check (boot_id ~ '^[0-9a-f]{32}$'),
  seq int not null check (seq >=1),
  payload_sha256 text not null check (payload_sha256 ~ '^[0-9a-f]{64}$'),
  payload_bytes jsonb not null,
  payload_hash text not null,
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(device_id, key_epoch, boot_id, seq)
);

-- Readings: immutable events with quality/coverage
create table if not exists readings (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references devices(id),
  inbox_id uuid not null references device_inbox(id),
  occurred_at_ms bigint, -- UTC ms, null if untrusted
  uptime_ms bigint not null,
  clock_quality text not null check (clock_quality in ('trusted','estimated','unknown')),
  config_epoch int not null,
  quality text not null check (quality in ('valid','gap','uncalibrated','sensor_fault')),
  voltage_mv int,
  current_ma int,
  real_power_mw int,
  import_mwh bigint,
  export_mwh bigint,
  is_backfilled boolean not null default false,
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index idx_readings_device_time on readings(device_id, occurred_at_ms desc);
create index idx_readings_received on readings(received_at);

-- Outbox for transactional processing (SKIP LOCKED)
create table if not exists outbox (
  id uuid primary key default gen_random_uuid(),
  aggregate_type text not null,
  aggregate_id uuid not null,
  event_type text not null,
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending','claimed','done','failed','dead_letter')),
  attempts int not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  lease_until timestamptz
);
create index idx_outbox_pending on outbox(status, next_attempt_at) where status in ('pending','failed');

-- Usage event chain (Basic Pro hash-chained tamper-evident)
create table if not exists usage_event_chain (
  id bigserial primary key,
  reading_id uuid not null references readings(id),
  device_id uuid not null references devices(id),
  chain_hash text not null,
  prev_hash text,
  created_at timestamptz not null default now()
);
create index idx_chain_device on usage_event_chain(device_id, created_at desc);

-- Power-loss durable marker (reserved slot)
create table if not exists power_fail_log (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references devices(id),
  boot_id text not null,
  uptime_at_loss bigint not null,
  last_utc_anchor_ms bigint,
  anchor_uptime_ms bigint,
  clock_quality text not null,
  voltage_mv int,
  import_mwh bigint,
  export_mwh bigint,
  relay_feedback boolean,
  config_epoch int not null,
  crc32 int not null,
  created_at timestamptz not null default now(),
  unique(device_id, boot_id, uptime_at_loss)
);

$sc_source_8212209cd651a5c96833b2918f7dc2f62e47f2fec97ce575cfe4e7d5352f1961$;
    INSERT INTO public.schema_migrations(name,sha256) VALUES('003_telemetry_inbox.sql','8212209cd651a5c96833b2918f7dc2f62e47f2fec97ce575cfe4e7d5352f1961');
  END IF;
END $sc_step_2$;

DO $sc_step_3$
DECLARE seen text;
BEGIN
  SELECT sha256 INTO seen FROM public.schema_migrations WHERE name='004_wallets_ledger.sql';
  IF FOUND THEN
    IF seen IS DISTINCT FROM '956221f4fdffdf94af27785ef4412a5151595fad8bed5f85a07190e9aaa3911e' THEN RAISE EXCEPTION 'Migration checksum mismatch: 004_wallets_ledger.sql'; END IF;
  ELSE
    EXECUTE $sc_source_956221f4fdffdf94af27785ef4412a5151595fad8bed5f85a07190e9aaa3911e$
-- 004_wallets_immutable_balanced_ledger_payment_vending

create table if not exists wallets (
  id uuid primary key default gen_random_uuid(),
  device_id uuid unique references devices(id),
  building_id uuid unique references buildings(id),
  linked_meter_id uuid unique references linked_meters(id),
  utility_type text not null default 'electricity' check (utility_type in ('electricity','water','gas')),
  available_kobo bigint not null default 0 check (available_kobo >=0),
  reserved_kobo bigint not null default 0 check (reserved_kobo >=0),
  ledger_version bigint not null default 0,
  updated_at timestamptz not null default now(),
  check ( (device_id is not null)::int + (building_id is not null)::int + (linked_meter_id is not null)::int =1 )
);

-- Quotes: immutable, expiring
create table if not exists quotes (
  id uuid primary key default gen_random_uuid(),
  destination_token text not null,
  amount_kobo bigint not null check (amount_kobo >=0),
  wallet_value_kobo bigint not null check (wallet_value_kobo >=0),
  markup_kobo bigint not null check (markup_kobo >=0),
  fee_kobo bigint not null check (fee_kobo >=0),
  units_mwh bigint not null check (units_mwh >=0),
  tariff_version text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  created_by uuid references profiles(id)
);

-- Payments: provider reference unique per provider+reference
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quotes(id),
  payer_id uuid references profiles(id),
  provider text not null default 'paystack',
  provider_reference text not null,
  status_token text unique not null, -- opaque payer receipt
  payment_state text not null default 'pending' check (payment_state in ('pending','verified','failed','refunded','chargeback','unknown')),
  vending_state text not null default 'not_required' check (vending_state in ('not_required','pending','confirmed','token_pending_entry','failed','unknown')),
  credit_state text not null default 'none' check (credit_state in ('reserved','available','reversed','none')),
  amount_kobo bigint not null check (amount_kobo >=0),
  units_mwh bigint not null check (units_mwh >=0),
  gateway_ref text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider, provider_reference)
);
create index idx_payments_quote on payments(quote_id);

-- Vending attempts: separate from payment money
create table if not exists vending_attempts (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payments(id),
  provider text not null,
  provider_reference text not null,
  destination text not null,
  units_mwh bigint not null,
  status text not null default 'pending' check (status in ('pending','confirmed','failed','unknown')),
  token text, -- STS token if needs entry
  response_payload jsonb,
  created_at timestamptz not null default now(),
  unique(provider, provider_reference)
);

-- Idempotency keys: 24h payer/scope+request-hash binding
create table if not exists idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  payer_id uuid,
  scope text not null,
  key text not null,
  body_hash text not null,
  response jsonb not null,
  status_code int not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours',
  unique(payer_id, scope, key)
);
create index idx_idemp_expires on idempotency_keys(expires_at);

-- Ledger: immutable, balanced per transaction
create table if not exists ledger_transactions (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references wallets(id),
  kind text not null check (kind in ('recharge','consumption','refund','reversal','payout','subscription_charge')),
  provider_reference text,
  correlation_id uuid,
  created_at timestamptz not null default now(),
  created_by uuid references profiles(id),
  unique(provider_reference)
);

create table if not exists ledger_entries (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references ledger_transactions(id) on delete cascade,
  wallet_id uuid not null references wallets(id),
  account text not null,
  direction text not null check (direction in ('debit','credit')),
  amount_kobo bigint check (amount_kobo >=0),
  energy_mwh bigint check (energy_mwh >=0),
  check ( (amount_kobo is not null)::int + (energy_mwh is not null)::int =1 ),
  created_at timestamptz not null default now()
);
create index idx_ledger_wallet on ledger_entries(wallet_id);

-- Tariffs: immutable version, no overlap per provider
create table if not exists tariffs (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  version text unique not null,
  effective_from timestamptz not null,
  effective_to timestamptz,
  day_rate_kobo_per_kwh int not null,
  night_rate_kobo_per_kwh int,
  margin_bps int not null default 0,
  rounding text not null default 'half_up',
  created_at timestamptz not null default now(),
  check (effective_to is null or effective_to > effective_from)
);

create table if not exists bills (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (subject_type in ('device','building','room')),
  subject_id uuid not null,
  period_start date not null,
  period_end date not null,
  tariff_version text not null references tariffs(version),
  amount_kobo bigint not null check (amount_kobo >=0),
  status text not null default 'unpaid' check (status in ('unpaid','paid','overdue','disputed')),
  generated_by_nepa boolean not null default false,
  created_at timestamptz not null default now(),
  check (period_end > period_start)
);

-- Payouts for agent/referrer
create table if not exists payouts (
  id uuid primary key default gen_random_uuid(),
  earner_id uuid not null references profiles(id),
  trigger_type text not null,
  trigger_reference_id uuid,
  amount_kobo bigint not null check (amount_kobo >=0),
  status text not null default 'pending' check (status in ('pending','approved','disbursed','reversed')),
  schedule_at timestamptz,
  disbursed_at timestamptz,
  created_at timestamptz not null default now()
);

$sc_source_956221f4fdffdf94af27785ef4412a5151595fad8bed5f85a07190e9aaa3911e$;
    INSERT INTO public.schema_migrations(name,sha256) VALUES('004_wallets_ledger.sql','956221f4fdffdf94af27785ef4412a5151595fad8bed5f85a07190e9aaa3911e');
  END IF;
END $sc_step_3$;

DO $sc_step_4$
DECLARE seen text;
BEGIN
  SELECT sha256 INTO seen FROM public.schema_migrations WHERE name='005_commands_outbox.sql';
  IF FOUND THEN
    IF seen IS DISTINCT FROM 'cf3d96a0db869d9ca7ed16eb798c0e77516609652de800d7d0262d925b344f9a' THEN RAISE EXCEPTION 'Migration checksum mismatch: 005_commands_outbox.sql'; END IF;
  ELSE
    EXECUTE $sc_source_cf3d96a0db869d9ca7ed16eb798c0e77516609652de800d7d0262d925b344f9a$
-- 005_commands_outbox_acknowledgments_schedules_budgets
create table if not exists commands (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references devices(id),
  command_id uuid unique not null default gen_random_uuid(),
  seq bigint not null, -- persistent global counter per key epoch
  key_epoch int not null,
  config_epoch int not null,
  policy_epoch int not null,
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  on_state boolean not null, -- absolute state
  reason text not null,
  authorization_ref text not null,
  requester_id uuid not null references profiles(id),
  status text not null default 'pending' check (status in ('pending','pending_delivery','applied','rejected','expired','uncertain','revoked')),
  -- signed bytes stored for verification
  signed_envelope jsonb not null,
  created_at timestamptz not null default now(),
  unique(device_id, seq),
  check (expires_at > issued_at and expires_at <= issued_at + interval '120 seconds')
);
create index idx_commands_device_pending on commands(device_id, status) where status in ('pending','pending_delivery');

-- Receipts: device signed feedback
create table if not exists command_receipts (
  id uuid primary key default gen_random_uuid(),
  command_id uuid not null references commands(command_id),
  device_id uuid not null references devices(id),
  seq bigint not null,
  result text not null check (result in ('applied','rejected','uncertain')),
  observed_on boolean,
  reason_code text,
  observed_at_ms bigint,
  payload_sha256 text not null,
  created_at timestamptz not null default now(),
  unique(command_id)
);

-- OFF reasons: protection,wallet_zero,budget,schedule,user_manual,maintenance,utility
create table if not exists off_reasons (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references devices(id),
  reason text not null check (reason in ('protection','wallet_zero','budget','schedule','user_manual','maintenance','utility')),
  active boolean not null default true,
  scope text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references profiles(id),
  unique(device_id, reason, scope)
);

-- Schedules: IANA zone, unique occurrence
create table if not exists schedules (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references devices(id),
  owner_id uuid not null references profiles(id),
  days_of_week int[] not null check (array_length(days_of_week,1) between 1 and 7),
  on_time time not null,
  off_time time not null,
  timezone text not null default 'Africa/Lagos',
  active boolean not null default true,
  version int not null default 1,
  delegated_grant_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Budgets: consumption valuation per period
create table if not exists budgets (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references devices(id),
  owner_id uuid not null references profiles(id),
  monthly_limit_kobo bigint not null check (monthly_limit_kobo >=0),
  daily_limit_units_mwh bigint,
  period_start date not null default current_date,
  created_at timestamptz not null default now(),
  unique(device_id)
);

-- Policies (schedule/budget/maintenance/restore) versioned
create table if not exists policies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id),
  scope_type text not null check (scope_type in ('device','building','organization')),
  scope_id uuid not null,
  type text not null check (type in ('schedule','budget','maintenance','restore')),
  version int not null default 1,
  timezone text,
  valid_from timestamptz not null default now(),
  valid_to timestamptz,
  delegated_grant_id uuid,
  revoked_at timestamptz,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

$sc_source_cf3d96a0db869d9ca7ed16eb798c0e77516609652de800d7d0262d925b344f9a$;
    INSERT INTO public.schema_migrations(name,sha256) VALUES('005_commands_outbox.sql','cf3d96a0db869d9ca7ed16eb798c0e77516609652de800d7d0262d925b344f9a');
  END IF;
END $sc_step_4$;

DO $sc_step_5$
DECLARE seen text;
BEGIN
  SELECT sha256 INTO seen FROM public.schema_migrations WHERE name='006_disputes_evidence_reports.sql';
  IF FOUND THEN
    IF seen IS DISTINCT FROM '716283fa149b7916d09e6fca9dcf278b2c713e3a2632d455621f68351e4672b1' THEN RAISE EXCEPTION 'Migration checksum mismatch: 006_disputes_evidence_reports.sql'; END IF;
  ELSE
    EXECUTE $sc_source_716283fa149b7916d09e6fca9dcf278b2c713e3a2632d455621f68351e4672b1$
-- 006_disputes_evidence_reports_private_storage
create table if not exists disputes (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid references bills(id),
  period_start date not null,
  period_end date not null,
  raised_by uuid not null references profiles(id),
  assigned_to uuid references profiles(id),
  status text not null default 'open' check (status in ('open','responded','resolved','escalated','closed_no_adjustment')),
  note text,
  evidence_snapshot_hash text not null,
  evidence_snapshot jsonb not null, -- immutable period readings/coverage/tariff/ledger versions
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  check (period_end > period_start)
);
create index idx_disputes_raised_by on disputes(raised_by);
create index idx_disputes_bill on disputes(bill_id);

create table if not exists dispute_messages (
  id uuid primary key default gen_random_uuid(),
  dispute_id uuid not null references disputes(id) on delete cascade,
  author_id uuid not null references profiles(id),
  message text not null check (char_length(message) <=4000),
  attachment_ids uuid[],
  created_at timestamptz not null default now()
);

create table if not exists dispute_resolutions (
  id uuid primary key default gen_random_uuid(),
  dispute_id uuid not null references disputes(id),
  decision text not null check (decision in ('accept_proposal','escalate','close_no_adjustment')),
  proposal_id uuid,
  decided_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

-- Support tickets
create table if not exists support_tickets (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles(id),
  scope_device_id uuid references devices(id),
  category text not null check (category in ('payment','device','billing','installation','account','other')),
  subject text not null check (char_length(subject) <=200),
  message text not null check (char_length(message) <=4000),
  status text not null default 'open' check (status in ('open','triaged','waiting_customer','waiting_provider','resolved','reopened')),
  priority text not null default 'normal',
  assigned_to uuid references profiles(id),
  opened_at timestamptz not null default now(),
  response_due_at timestamptz,
  resolved_at timestamptz
);
create index idx_tickets_reporter on support_tickets(reporter_id);

create table if not exists support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references support_tickets(id) on delete cascade,
  author_id uuid not null references profiles(id),
  message text not null check (char_length(message) <=4000),
  attachment_ids uuid[],
  created_at timestamptz not null default now()
);

-- Reports: immutable canonical bytes, SHA256, signature, revocable token
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  device_id uuid references devices(id),
  subject_type text not null,
  subject_id uuid not null,
  canonical_bytes bytea not null,
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  signature text not null,
  key_id text not null,
  public_token_hash text unique not null, -- hashed token, not plain
  public_token_hint text, -- last 4 for UI
  coverage jsonb not null,
  issued_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_by uuid not null references profiles(id)
);

-- Private storage metadata (Supabase Storage private buckets)
create table if not exists private_objects (
  id uuid primary key default gen_random_uuid(),
  bucket text not null check (bucket in ('evidence','reports','exports','avatars')),
  owner_id uuid not null references profiles(id),
  scope_type text not null,
  scope_id uuid not null,
  content_type text not null check (content_type in ('image/jpeg','image/png','application/pdf')),
  size_bytes int not null check (size_bytes between 1 and 10485760),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  storage_path text not null,
  scan_status text not null default 'pending' check (scan_status in ('pending','clean','infected','failed')),
  created_at timestamptz not null default now()
);

-- Exports
create table if not exists exports (
  id uuid primary key default gen_random_uuid(),
  scope_id uuid not null,
  format text not null check (format in ('pdf','csv','xlsx')),
  period_start timestamptz not null,
  period_end timestamptz not null,
  status text not null default 'queued' check (status in ('queued','generating','ready','failed','expired','revoked')),
  requester_id uuid not null references profiles(id),
  result_path text,
  created_at timestamptz not null default now()
);

$sc_source_716283fa149b7916d09e6fca9dcf278b2c713e3a2632d455621f68351e4672b1$;
    INSERT INTO public.schema_migrations(name,sha256) VALUES('006_disputes_evidence_reports.sql','716283fa149b7916d09e6fca9dcf278b2c713e3a2632d455621f68351e4672b1');
  END IF;
END $sc_step_5$;

DO $sc_step_6$
DECLARE seen text;
BEGIN
  SELECT sha256 INTO seen FROM public.schema_migrations WHERE name='007_policies_rls.sql';
  IF FOUND THEN
    IF seen IS DISTINCT FROM '7865e6d51643187d9e559cd3acfa6a55827c929fdafce9966de4c60fad1a3a38' THEN RAISE EXCEPTION 'Migration checksum mismatch: 007_policies_rls.sql'; END IF;
  ELSE
    EXECUTE $sc_source_7865e6d51643187d9e559cd3acfa6a55827c929fdafce9966de4c60fad1a3a38$
-- Pre-release correction: define viewer relation before functions/policies reference it.
create table if not exists device_viewers (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references devices(id) on delete cascade,
  viewer_user_id uuid not null references profiles(id),
  added_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  unique(device_id, viewer_user_id)
);

-- 007_scoped_access_policies_grants_views
-- Enable RLS on all tables and define least-privilege policies

-- Helper function: is user landlord of building?
create or replace function is_landlord_of_building(uid uuid, bid uuid)
returns boolean language sql stable as $$
  select exists(select 1 from buildings where id=bid and landlord_id=uid);
$$;

create or replace function is_tenant_in_room(uid uuid, rid uuid)
returns boolean language sql stable as $$
  select exists(select 1 from occupancies where room_id=rid and tenant_id=uid and end_at is null);
$$;

create or replace function has_viewer_grant(uid uuid, did uuid)
returns boolean language sql stable as $$
  select exists(select 1 from device_viewers where device_id=did and viewer_user_id=uid);
$$;

-- Buildings
alter table buildings enable row level security;
drop policy if exists buildings_owner on buildings;
create policy buildings_owner on buildings for all using (
  landlord_id = auth.uid() or
  exists(select 1 from memberships where user_id=auth.uid() and role in ('internal_ops','internal_superadmin') and revoked_at is null)
);
-- need SELECT for landlord
drop policy if exists buildings_select on buildings;
create policy buildings_select on buildings for select using (
  landlord_id = auth.uid() or
  is_landlord_of_building(auth.uid(), id) or
  exists(select 1 from memberships where user_id=auth.uid() and role in ('internal_ops','internal_superadmin','internal_support') and revoked_at is null)
);

-- Rooms
alter table rooms enable row level security;
drop policy if exists rooms_select on rooms;
create policy rooms_select on rooms for select using (
  exists(select 1 from buildings where buildings.id=rooms.building_id and buildings.landlord_id=auth.uid()) or
  exists(select 1 from occupancies where occupancies.room_id=rooms.id and occupancies.tenant_id=auth.uid() and occupancies.end_at is null) or
  exists(select 1 from memberships where user_id=auth.uid() and revoked_at is null and role in ('internal_ops','internal_superadmin'))
);

-- Occupancies: immutable history, no update of end_at except via landlord
alter table occupancies enable row level security;
create policy occupancies_select on occupancies for select using (
  tenant_id=auth.uid() or
  exists(select 1 from rooms join buildings on rooms.building_id=buildings.id where rooms.id=occupancies.room_id and buildings.landlord_id=auth.uid())
);

-- Devices
alter table devices enable row level security;
drop policy if exists devices_select on devices;
create policy devices_select on devices for select using (
  owner_id=auth.uid() or
  building_id in (select id from buildings where landlord_id=auth.uid()) or
  room_id in (select room_id from occupancies where tenant_id=auth.uid() and end_at is null) or
  has_viewer_grant(auth.uid(), id) or
  exists(select 1 from memberships where user_id=auth.uid() and role in ('internal_ops','internal_engineering','internal_superadmin') and revoked_at is null)
);

-- Readings
alter table readings enable row level security;
create policy readings_select on readings for select using (
  device_id in (select id from devices where owner_id=auth.uid()) or
  device_id in (select d.id from devices d join occupancies o on d.room_id=o.room_id where o.tenant_id=auth.uid() and o.end_at is null) or
  device_id in (select device_id from device_viewers where viewer_user_id=auth.uid()) or
  exists(select 1 from memberships where user_id=auth.uid() and role in ('internal_ops','internal_superadmin') and revoked_at is null)
);

-- Wallets
alter table wallets enable row level security;
create policy wallets_select on wallets for select using (
  device_id in (select id from devices where owner_id=auth.uid()) or
  building_id in (select id from buildings where landlord_id=auth.uid()) or
  exists(select 1 from memberships where user_id=auth.uid() and revoked_at is null)
);

-- Ledger: owner only + finance ops
alter table ledger_entries enable row level security;
alter table ledger_transactions enable row level security;
create policy ledger_select on ledger_entries for select using (
  wallet_id in (select id from wallets where device_id in (select id from devices where owner_id=auth.uid())) or
  exists(select 1 from memberships where user_id=auth.uid() and role in ('internal_finance','internal_superadmin') and revoked_at is null)
);

-- Payments: payer only + finance
alter table payments enable row level security;
create policy payments_select on payments for select using (
  payer_id=auth.uid() or
  exists(select 1 from memberships where user_id=auth.uid() and role in ('internal_finance','internal_superadmin') and revoked_at is null)
);

-- Disputes: scoped
alter table disputes enable row level security;
create policy disputes_select on disputes for select using (
  raised_by=auth.uid() or
  exists(select 1 from memberships where user_id=auth.uid() and role in ('internal_support','internal_ops','internal_superadmin') and revoked_at is null)
);

-- Support tickets
alter table support_tickets enable row level security;
create policy tickets_select on support_tickets for select using (
  reporter_id=auth.uid() or
  assigned_to=auth.uid() or
  exists(select 1 from memberships where user_id=auth.uid() and role in ('internal_support','internal_ops','internal_superadmin') and revoked_at is null)
);

-- Reports: owner + token holder (token checked via hash in API, not RLS broad grant)
alter table reports enable row level security;
create policy reports_select on reports for select using (
  created_by=auth.uid() or
  exists(select 1 from memberships where user_id=auth.uid() and revoked_at is null and role in ('internal_ops','internal_support'))
);

-- Realtime: only allow scoped publication
-- (Supabase Realtime uses RLS; private tables have no anonymous read)

-- Private credentials: never exposed
alter table private.device_credentials enable row level security;
-- no public policy -> deny by default; only service_role via API can read

-- Device viewers
alter table device_viewers enable row level security;
create policy viewers_select on device_viewers for select using (
  viewer_user_id=auth.uid() or added_by=auth.uid() or exists(select 1 from devices where devices.id=device_viewers.device_id and devices.owner_id=auth.uid())
);

$sc_source_7865e6d51643187d9e559cd3acfa6a55827c929fdafce9966de4c60fad1a3a38$;
    INSERT INTO public.schema_migrations(name,sha256) VALUES('007_policies_rls.sql','7865e6d51643187d9e559cd3acfa6a55827c929fdafce9966de4c60fad1a3a38');
  END IF;
END $sc_step_6$;

DO $sc_step_7$
DECLARE seen text;
BEGIN
  SELECT sha256 INTO seen FROM public.schema_migrations WHERE name='008_consent_subscriptions_ops.sql';
  IF FOUND THEN
    IF seen IS DISTINCT FROM '30f2380871018d745ce23e16420eea5ca7c61b1419b38b8c246b27f3baa39291' THEN RAISE EXCEPTION 'Migration checksum mismatch: 008_consent_subscriptions_ops.sql'; END IF;
  ELSE
    EXECUTE $sc_source_30f2380871018d745ce23e16420eea5ca7c61b1419b38b8c246b27f3baa39291$
-- 008_flags_consent_subscriptions_jobs_inventory_payouts_ops

-- Consent: utility control
create table if not exists consents (
  id uuid primary key default gen_random_uuid(),
  device_id uuid references devices(id),
  actor_id uuid not null references profiles(id),
  utility text not null, -- named utility/capability
  capability text not null,
  disclosure_version text not null,
  accepted_at timestamptz not null default now(),
  revoked_at timestamptz,
  policy_epoch int not null default 1,
  unique(actor_id, device_id, utility, capability, policy_epoch)
);
create index idx_consents_device_active on consents(device_id, revoked_at) where revoked_at is null;
alter table consents enable row level security;
create policy consents_select on consents for select using (
  actor_id=auth.uid() or
  exists(select 1 from memberships where user_id=auth.uid() and role in ('internal_ops','internal_superadmin','nepa_staff') and revoked_at is null)
);

-- Subscriptions
create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  plan subscription_tier not null,
  cadence text not null check (cadence in ('monthly','quarterly','yearly')),
  status text not null default 'active' check (status in ('active','past_due','cancelled','expired','grace')),
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz not null default now() + interval '30 days',
  grace_until timestamptz,
  entitlement_validity jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, plan)
);
alter table subscriptions enable row level security;
create policy subs_select on subscriptions for select using (user_id=auth.uid() or exists(select 1 from memberships where user_id=auth.uid() and role in ('internal_finance','internal_superadmin') and revoked_at is null));

-- Jobs: installer field jobs
create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  device_id uuid references devices(id),
  building_id uuid references buildings(id),
  assignee_id uuid references profiles(id),
  status text not null default 'open' check (status in ('open','assigned','in_progress','diagnostic_failed','awaiting_online','commissioned','commissioning_failed','rma')),
  priority text not null default 'normal',
  opened_at timestamptz not null default now(),
  due_at timestamptz,
  completed_at timestamptz,
  created_by uuid references profiles(id)
);
alter table jobs enable row level security;
create policy jobs_select on jobs for select using (
  assignee_id=auth.uid() or created_by=auth.uid() or exists(select 1 from memberships where user_id=auth.uid() and role in ('internal_ops','internal_superadmin') and revoked_at is null)
);

-- Inventory movements (not raw stock overwrite)
create table if not exists inventory_items (
  id uuid primary key default gen_random_uuid(),
  sku text unique not null,
  name text not null,
  stock int not null default 0 check (stock >=0),
  reorder_point int not null default 10,
  created_at timestamptz not null default now()
);
create table if not exists inventory_movements (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references inventory_items(id),
  quantity int not null, -- positive inbound, negative outbound
  reason text not null,
  shipment_cost_kobo bigint,
  supplier text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- Compliance tracker
create table if not exists compliance_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  status text not null default 'pending' check (status in ('pending','compliant','expired','waived')),
  expiry_date date,
  owner text,
  created_at timestamptz not null default now()
);

-- Episodes/alerts (tamper, outage, etc.)
create table if not exists episodes (
  id uuid primary key default gen_random_uuid(),
  cause text not null,
  source text not null,
  confidence numeric(4,3) not null check (confidence between 0 and 1),
  topology_scope jsonb not null,
  start_at timestamptz not null,
  end_at timestamptz,
  coverage numeric(5,2),
  dedupe_key text unique not null,
  status text not null default 'open' check (status in ('open','resolved','false_positive')),
  resolution text,
  reviewer_id uuid references profiles(id),
  created_at timestamptz not null default now()
);
alter table episodes enable row level security;
create policy episodes_select on episodes for select using (
  exists(select 1 from memberships where user_id=auth.uid() and revoked_at is null)
);

-- Notifications: deduped episode delivery
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid references episodes(id),
  template_key text not null,
  recipient_id uuid references profiles(id),
  channel text not null check (channel in ('in_app','sms','push','email','ussd')),
  status text not null default 'queued' check (status in ('queued','sent','provider_accepted','delivered','failed','unknown')),
  payload jsonb not null,
  provider_reference text,
  attempts int not null default 0,
  created_at timestamptz not null default now(),
  unique(episode_id, recipient_id, template_key, channel)
);

-- Incidents (ops)
create table if not exists incidents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  cause text not null,
  scope jsonb not null,
  status text not null default 'open' check (status in ('open','assigned','reviewed','resolved','reopened')),
  assignee_id uuid references profiles(id),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
alter table incidents enable row level security;
create policy incidents_select on incidents for select using (
  exists(select 1 from memberships where user_id=auth.uid() and revoked_at is null)
);

-- Audit log: immutable
create table if not exists audit_log (
  id bigserial primary key,
  actor_id uuid references profiles(id),
  action text not null,
  target_type text,
  target_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);
alter table audit_log enable row level security;
create policy audit_select on audit_log for select using (
  exists(select 1 from memberships where user_id=auth.uid() and role in ('internal_superadmin','internal_ops') and revoked_at is null)
);


-- Operational records are entered by authorized staff. No fabricated stock or expiry dates.

$sc_source_30f2380871018d745ce23e16420eea5ca7c61b1419b38b8c246b27f3baa39291$;
    INSERT INTO public.schema_migrations(name,sha256) VALUES('008_consent_subscriptions_ops.sql','30f2380871018d745ce23e16420eea5ca7c61b1419b38b8c246b27f3baa39291');
  END IF;
END $sc_step_7$;

DO $sc_step_8$
DECLARE seen text;
BEGIN
  SELECT sha256 INTO seen FROM public.schema_migrations WHERE name='009_live_runtime.sql';
  IF FOUND THEN
    IF seen IS DISTINCT FROM '52b2e6587e3fcbc72eebe181e88901df9bd91049a226b5f6af5d966e1d46aca2' THEN RAISE EXCEPTION 'Migration checksum mismatch: 009_live_runtime.sql'; END IF;
  ELSE
    EXECUTE $sc_source_52b2e6587e3fcbc72eebe181e88901df9bd91049a226b5f6af5d966e1d46aca2$
-- Live runtime requirements. No sample users, readings, stock, prices or balances.
alter table private.device_credentials drop constraint if exists device_credentials_pkey;
alter table private.device_credentials add primary key (device_id,key_epoch,direction);
alter table devices add column policy_epoch integer not null default 1;
alter table devices add column prepaid_enforced boolean not null default false;
alter table devices add column public_token_hash text unique;
alter table devices add column next_command_seq bigint not null default 0;
alter table devices add column relay_observed boolean;
alter table devices add column relay_observed_at timestamptz;
alter table devices add column supply_state text not null default 'unknown';
alter table wallets add column available_mwh bigint not null default 0 check(available_mwh>=0);
alter table wallets add column reserved_mwh bigint not null default 0 check(reserved_mwh>=0);
alter table wallets add column unpaid_mwh bigint not null default 0 check(unpaid_mwh>=0);
alter table wallets add column payment_token text not null unique default encode(gen_random_bytes(24),'hex');
alter table wallets add column tariff_version text references tariffs(version);
alter table quotes add column wallet_id uuid references wallets(id);
alter table quotes add column currency text not null default 'NGN';
alter table quotes add column request_hash text;
alter table payments add column checkout_url text;
alter table payments add column provider_response jsonb;
alter table payments add column credited_at timestamptz;
alter table payments add column version integer not null default 1;
alter table subscriptions alter column status set default 'pending';
alter table subscriptions drop constraint subscriptions_status_check;
alter table subscriptions add constraint subscriptions_status_check check(status in ('pending','active','past_due','cancelled','expired','grace'));
alter table device_viewers add column revoked_at timestamptz;
alter table idempotency_keys add column owner_scope text;
create unique index idempotency_owner_key on idempotency_keys(coalesce(payer_id::text,'public'),scope,key);
create unique index only_active_room_occupancy on occupancies(room_id) where end_at is null;
create unique index topology_active_child on topology_edges(child_device_id) where valid_to is null;
create unique index usage_chain_once on usage_event_chain(reading_id);
create table usage_postings (
 reading_id uuid primary key references readings(id), wallet_id uuid references wallets(id),
 consumed_mwh bigint not null check(consumed_mwh>=0), funded_mwh bigint not null check(funded_mwh>=0),
 created_at timestamptz not null default now()
);
create table user_preferences(user_id uuid primary key references profiles(id),value jsonb not null default '{}',version int not null default 1,updated_at timestamptz not null default now());
create table step_up_challenges (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references profiles(id),
 operation_hash text not null check(operation_hash ~ '^[0-9a-f]{64}$'),scope_ids uuid[] not null,
 expires_at timestamptz not null default now()+interval '5 minutes',attempts int not null default 0,
 verified_at timestamptz,used_at timestamptz,created_at timestamptz not null default now()
);
create table provider_events (
 provider text not null,reference text not null,kind text not null,body_hash text not null,
 payload jsonb not null,status text not null default 'received',created_at timestamptz not null default now(),
 primary key(provider,reference,kind)
);
create table orders (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references profiles(id),profile device_role not null,
 service_address text not null,contact_phone text not null,notes text,status text not null default 'requested',
 version int not null default 1,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table manual_readings (
 id uuid primary key default gen_random_uuid(),linked_meter_id uuid not null references linked_meters(id),
 entered_by uuid not null references profiles(id),reading_kwh numeric(18,6) not null check(reading_kwh>=0),
 recorded_at timestamptz not null,created_at timestamptz not null default now()
);
create table report_preferences(user_id uuid primary key references profiles(id),auto_delivery_enabled boolean not null default false,frequency text not null default 'monthly');
alter table notifications add column dedupe_key text unique;
create table command_grants (
 id uuid primary key default gen_random_uuid(),challenge_id uuid not null references step_up_challenges(id),
 user_id uuid not null references profiles(id),device_id uuid not null references devices(id),
 expires_at timestamptz not null,revoked_at timestamptz
);
create table schedule_occurrences(schedule_id uuid not null references schedules(id),occurrence_at timestamptz not null,command_id uuid references commands(command_id),primary key(schedule_id,occurrence_at));
create unique index off_reasons_scope on off_reasons(device_id,reason,coalesce(scope,''));
-- Replace the recursive and overly broad prototype RLS. Browser writes are not allowed.
do $$ declare r record; begin
 for r in select tablename,policyname from pg_policies where schemaname='public' loop
  execute format('drop policy %I on public.%I',r.policyname,r.tablename);
 end loop;
 for r in select tablename from pg_tables where schemaname='public' loop
  execute format('alter table public.%I enable row level security',r.tablename);
 end loop;
end $$;
revoke all on all tables in schema public from anon,authenticated;
revoke all on all tables in schema private from public,anon,authenticated;
revoke all on schema private from public,anon,authenticated;
-- API uses a backend-only database connection and authorizes each query. Private browser reads are
-- intentionally disabled until audited nonrecursive Realtime projections are implemented.
grant select on profiles to authenticated;
create policy own_profile on profiles for select to authenticated using(id=auth.uid());
grant select on notifications to authenticated;
create policy own_notifications on notifications for select to authenticated using(recipient_id=auth.uid());
-- Existing prototype globally enabled analytics must not imply entitlement or verification.
update feature_flags set enabled_globally=false,version=version+1;

$sc_source_52b2e6587e3fcbc72eebe181e88901df9bd91049a226b5f6af5d966e1d46aca2$;
    INSERT INTO public.schema_migrations(name,sha256) VALUES('009_live_runtime.sql','52b2e6587e3fcbc72eebe181e88901df9bd91049a226b5f6af5d966e1d46aca2');
  END IF;
END $sc_step_8$;

DO $sc_step_9$
DECLARE seen text;
BEGIN
  SELECT sha256 INTO seen FROM public.schema_migrations WHERE name='010_financial_guardrails.sql';
  IF FOUND THEN
    IF seen IS DISTINCT FROM '0d49a962cf6cdb13aa7fcd97354452ce074b4cc85d86c42530308ff38126901a' THEN RAISE EXCEPTION 'Migration checksum mismatch: 010_financial_guardrails.sql'; END IF;
  ELSE
    EXECUTE $sc_source_0d49a962cf6cdb13aa7fcd97354452ce074b4cc85d86c42530308ff38126901a$
create unique index payment_quote_once on payments(quote_id);
create function private.check_ledger_balance() returns trigger language plpgsql set search_path=pg_catalog,public as $$
declare tid uuid; cash numeric; energy numeric; count_entries int;
begin
 tid:=coalesce(new.transaction_id,old.transaction_id);
 select count(*),coalesce(sum(case when direction='debit' then amount_kobo else -amount_kobo end),0),coalesce(sum(case when direction='debit' then energy_mwh else -energy_mwh end),0)
 into count_entries,cash,energy from public.ledger_entries where transaction_id=tid;
 if count_entries<2 or cash<>0 or energy<>0 then raise exception 'unbalanced ledger transaction';end if;
 return null;
end$$;
create constraint trigger ledger_must_balance after insert or update or delete on ledger_entries deferrable initially deferred for each row execute function private.check_ledger_balance();
create function private.immutable_record() returns trigger language plpgsql as $$begin raise exception 'immutable record: append a reversal instead';end$$;
create trigger immutable_ledger_entries before update or delete on ledger_entries for each row execute function private.immutable_record();
create trigger immutable_ledger_transactions before update or delete on ledger_transactions for each row execute function private.immutable_record();
create trigger immutable_raw_readings before update or delete on readings for each row execute function private.immutable_record();
create trigger immutable_audit before update or delete on audit_log for each row execute function private.immutable_record();

$sc_source_0d49a962cf6cdb13aa7fcd97354452ce074b4cc85d86c42530308ff38126901a$;
    INSERT INTO public.schema_migrations(name,sha256) VALUES('010_financial_guardrails.sql','0d49a962cf6cdb13aa7fcd97354452ce074b4cc85d86c42530308ff38126901a');
  END IF;
END $sc_step_9$;

DO $sc_step_10$
DECLARE seen text;
BEGIN
  SELECT sha256 INTO seen FROM public.schema_migrations WHERE name='011_accounting_watermarks.sql';
  IF FOUND THEN
    IF seen IS DISTINCT FROM 'd295a82a342ee10c80dd9a6c0694dd5228f4b177e6b415da1d13b000dc41c058' THEN RAISE EXCEPTION 'Migration checksum mismatch: 011_accounting_watermarks.sql'; END IF;
  ELSE
    EXECUTE $sc_source_d295a82a342ee10c80dd9a6c0694dd5228f4b177e6b415da1d13b000dc41c058$
alter table devices add column accounted_at_ms bigint;
alter table devices add column accounted_counter_mwh bigint;
alter table devices add column accounted_boot_id text;

$sc_source_d295a82a342ee10c80dd9a6c0694dd5228f4b177e6b415da1d13b000dc41c058$;
    INSERT INTO public.schema_migrations(name,sha256) VALUES('011_accounting_watermarks.sql','d295a82a342ee10c80dd9a6c0694dd5228f4b177e6b415da1d13b000dc41c058');
  END IF;
END $sc_step_10$;

DO $sc_step_11$
DECLARE seen text;
BEGIN
  SELECT sha256 INTO seen FROM public.schema_migrations WHERE name='012_claims_and_utility_scope.sql';
  IF FOUND THEN
    IF seen IS DISTINCT FROM 'ff25270048eb5f20493b0c203430462fdfb41616bc059fda70fd0758acfb694e' THEN RAISE EXCEPTION 'Migration checksum mismatch: 012_claims_and_utility_scope.sql'; END IF;
  ELSE
    EXECUTE $sc_source_ff25270048eb5f20493b0c203430462fdfb41616bc059fda70fd0758acfb694e$
-- Single-use package codes are separate from the device authentication keys.
CREATE TABLE device_claims (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 device_id uuid NOT NULL REFERENCES devices(id),
 token_sha256 text NOT NULL UNIQUE CHECK (token_sha256 ~ '^[0-9a-f]{64}$'),
 expires_at timestamptz NOT NULL,
 created_by uuid NOT NULL REFERENCES profiles(id),
 used_by uuid REFERENCES profiles(id), used_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE utility_device_scopes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES organizations(id),
 device_id uuid NOT NULL REFERENCES devices(id),
 granted_by uuid NOT NULL REFERENCES profiles(id),
 granted_at timestamptz NOT NULL DEFAULT now(), revoked_at timestamptz,
 UNIQUE(organization_id,device_id)
);
ALTER TABLE device_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE utility_device_scopes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON device_claims,utility_device_scopes FROM anon,authenticated;
CREATE TABLE device_signals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 device_id uuid NOT NULL REFERENCES devices(id),
 inbox_id uuid NOT NULL UNIQUE REFERENCES device_inbox(id),
 kind text NOT NULL CHECK (kind IN ('tamper','protection')),
 occurred_at_ms bigint, clock_quality text NOT NULL,
 received_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE device_signals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON device_signals FROM anon,authenticated;
ALTER TABLE jobs ADD COLUMN kind text NOT NULL DEFAULT 'installation' CHECK(kind IN ('installation','repair','inspection'));

$sc_source_ff25270048eb5f20493b0c203430462fdfb41616bc059fda70fd0758acfb694e$;
    INSERT INTO public.schema_migrations(name,sha256) VALUES('012_claims_and_utility_scope.sql','ff25270048eb5f20493b0c203430462fdfb41616bc059fda70fd0758acfb694e');
  END IF;
END $sc_step_11$;

DO $sc_step_12$
DECLARE seen text;
BEGIN
  SELECT sha256 INTO seen FROM public.schema_migrations WHERE name='013_signal_observation.sql';
  IF FOUND THEN
    IF seen IS DISTINCT FROM '7a3775ac2232f065165601e6ad35d1d95c613e6fba15fd23cd6b365cd5c3e1bb' THEN RAISE EXCEPTION 'Migration checksum mismatch: 013_signal_observation.sql'; END IF;
  ELSE
    EXECUTE $sc_source_7a3775ac2232f065165601e6ad35d1d95c613e6fba15fd23cd6b365cd5c3e1bb$
-- Preserve source time separately from connectivity/receipt time.
ALTER TABLE devices ADD COLUMN supply_observed_at_ms bigint;
ALTER TABLE devices ADD COLUMN supply_clock_quality text NOT NULL DEFAULT 'unknown';
ALTER TABLE device_signals ADD COLUMN active boolean NOT NULL DEFAULT true;

$sc_source_7a3775ac2232f065165601e6ad35d1d95c613e6fba15fd23cd6b365cd5c3e1bb$;
    INSERT INTO public.schema_migrations(name,sha256) VALUES('013_signal_observation.sql','7a3775ac2232f065165601e6ad35d1d95c613e6fba15fd23cd6b365cd5c3e1bb');
  END IF;
END $sc_step_12$;

DO $sc_step_13$
DECLARE seen text;
BEGIN
  SELECT sha256 INTO seen FROM public.schema_migrations WHERE name='014_measured_usage_intervals.sql';
  IF FOUND THEN
    IF seen IS DISTINCT FROM '397b5c67ef31cb8d4476feabdeb8f00e8ea11fb482498a2c4ee5362f4d848bf8' THEN RAISE EXCEPTION 'Migration checksum mismatch: 014_measured_usage_intervals.sql'; END IF;
  ELSE
    EXECUTE $sc_source_397b5c67ef31cb8d4476feabdeb8f00e8ea11fb482498a2c4ee5362f4d848bf8$
ALTER TABLE usage_postings ADD COLUMN interval_start_ms bigint;
ALTER TABLE usage_postings ADD COLUMN accounting_quality text NOT NULL DEFAULT 'unavailable' CHECK(accounting_quality IN('measured','unavailable'));

$sc_source_397b5c67ef31cb8d4476feabdeb8f00e8ea11fb482498a2c4ee5362f4d848bf8$;
    INSERT INTO public.schema_migrations(name,sha256) VALUES('014_measured_usage_intervals.sql','397b5c67ef31cb8d4476feabdeb8f00e8ea11fb482498a2c4ee5362f4d848bf8');
  END IF;
END $sc_step_13$;

DO $sc_step_14$
DECLARE seen text;
BEGIN
  SELECT sha256 INTO seen FROM public.schema_migrations WHERE name='015_field_workflow.sql';
  IF FOUND THEN
    IF seen IS DISTINCT FROM '967aab028398bae12131daa0ec45e2a321ad764cd33d63fd7091b07700c20395' THEN RAISE EXCEPTION 'Migration checksum mismatch: 015_field_workflow.sql'; END IF;
  ELSE
    EXECUTE $sc_source_967aab028398bae12131daa0ec45e2a321ad764cd33d63fd7091b07700c20395$
-- Field-work completion is separate from device commissioning and installer payables.
ALTER TABLE jobs ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK (version > 0);
ALTER TABLE jobs ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE jobs DROP CONSTRAINT jobs_status_check;
ALTER TABLE jobs ADD CONSTRAINT jobs_status_check CHECK (status IN
 ('open','assigned','in_progress','diagnostic_failed','awaiting_online','commissioned','commissioning_failed','rma','closed'));
CREATE TABLE job_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 job_id uuid NOT NULL REFERENCES jobs(id),
 actor_id uuid NOT NULL REFERENCES profiles(id),
 action text NOT NULL CHECK (action IN ('assigned','started','diagnostic_failed','submitted','rma','closed','reopened')),
 from_status text NOT NULL, to_status text NOT NULL,
 assignee_id uuid REFERENCES profiles(id),
 note text NOT NULL CHECK (char_length(note) BETWEEN 10 AND 4000),
 version integer NOT NULL CHECK (version > 1),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(job_id,version)
);
CREATE INDEX job_events_timeline ON job_events(job_id,version);
ALTER TABLE job_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON job_events FROM anon,authenticated;
CREATE TRIGGER immutable_job_events BEFORE UPDATE OR DELETE ON job_events
 FOR EACH ROW EXECUTE FUNCTION private.immutable_record();

$sc_source_967aab028398bae12131daa0ec45e2a321ad764cd33d63fd7091b07700c20395$;
    INSERT INTO public.schema_migrations(name,sha256) VALUES('015_field_workflow.sql','967aab028398bae12131daa0ec45e2a321ad764cd33d63fd7091b07700c20395');
  END IF;
END $sc_step_14$;

DO $sc_step_15$
DECLARE seen text;
BEGIN
  SELECT sha256 INTO seen FROM public.schema_migrations WHERE name='016_sms_dispatch.sql';
  IF FOUND THEN
    IF seen IS DISTINCT FROM '800d9f531c1ae26e4f5331c50d1f22086941de2733b4220893763262d4d97176' THEN RAISE EXCEPTION 'Migration checksum mismatch: 016_sms_dispatch.sql'; END IF;
  ELSE
    EXECUTE $sc_source_800d9f531c1ae26e4f5331c50d1f22086941de2733b4220893763262d4d97176$
-- Provider acceptance never proves handset delivery. Unknown dispatches are not resent.
ALTER TABLE notifications ADD COLUMN dispatched_at timestamptz;
ALTER TABLE notifications ADD COLUMN last_error text;

$sc_source_800d9f531c1ae26e4f5331c50d1f22086941de2733b4220893763262d4d97176$;
    INSERT INTO public.schema_migrations(name,sha256) VALUES('016_sms_dispatch.sql','800d9f531c1ae26e4f5331c50d1f22086941de2733b4220893763262d4d97176');
  END IF;
END $sc_step_15$;

DO $sc_step_16$
DECLARE seen text;
BEGIN
  SELECT sha256 INTO seen FROM public.schema_migrations WHERE name='017_firmware_delivery.sql';
  IF FOUND THEN
    IF seen IS DISTINCT FROM '6c699898bdf702536de5e307951937a9124864e9896116335cf90dc8197a2f7a' THEN RAISE EXCEPTION 'Migration checksum mismatch: 017_firmware_delivery.sql'; END IF;
  ELSE
    EXECUTE $sc_source_6c699898bdf702536de5e307951937a9124864e9896116335cf90dc8197a2f7a$
-- Firmware artifacts are private, immutable and signed. A staged download is not a healthy boot.
ALTER TABLE devices ADD COLUMN firmware_secure_version integer NOT NULL DEFAULT 0 CHECK (firmware_secure_version>=0);
ALTER TABLE devices ADD COLUMN firmware_sha256 text CHECK (firmware_sha256 ~ '^[0-9a-f]{64}$');
ALTER TABLE devices ADD COLUMN ota_qualified boolean NOT NULL DEFAULT false;
CREATE TABLE firmware_artifacts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), profile device_role NOT NULL,
 board text NOT NULL, version text NOT NULL, secure_version integer NOT NULL CHECK(secure_version>0),
 image bytea NOT NULL CHECK(octet_length(image) BETWEEN 1024 AND 2097152),
 sha256 text NOT NULL CHECK(sha256 ~ '^[0-9a-f]{64}$'), size_bytes integer NOT NULL,
 manifest jsonb NOT NULL, signature text NOT NULL, key_id text NOT NULL,
 created_by uuid NOT NULL REFERENCES profiles(id), created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(profile,board,secure_version), CHECK(octet_length(image)=size_bytes)
);
CREATE TRIGGER immutable_firmware_artifacts BEFORE UPDATE OR DELETE ON firmware_artifacts
 FOR EACH ROW EXECUTE FUNCTION private.immutable_record();
CREATE TABLE firmware_rollouts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), artifact_id uuid NOT NULL REFERENCES firmware_artifacts(id),
 status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','paused','completed','cancelled')),
 wave integer NOT NULL DEFAULT 0 CHECK(wave BETWEEN 0 AND 3), version integer NOT NULL DEFAULT 1,
 created_by uuid NOT NULL REFERENCES profiles(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE firmware_targets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), rollout_id uuid NOT NULL REFERENCES firmware_rollouts(id),
 device_id uuid NOT NULL REFERENCES devices(id), ordinal integer NOT NULL, wave integer,
 status text NOT NULL DEFAULT 'waiting' CHECK(status IN ('waiting','pending','offered','staged','boot_confirmed','failed','rolled_back','cancelled')),
 offered_boot_id text, offered_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(rollout_id,device_id), UNIQUE(rollout_id,ordinal)
);
CREATE UNIQUE INDEX firmware_one_active_target ON firmware_targets(device_id) WHERE status IN ('waiting','pending','offered','staged');
CREATE TABLE firmware_receipts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), target_id uuid NOT NULL REFERENCES firmware_targets(id),
 inbox_id uuid NOT NULL UNIQUE REFERENCES device_inbox(id), result text NOT NULL,
 reason_code text NOT NULL, boot_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(target_id,result)
);
CREATE TRIGGER immutable_firmware_receipts BEFORE UPDATE OR DELETE ON firmware_receipts
 FOR EACH ROW EXECUTE FUNCTION private.immutable_record();
ALTER TABLE firmware_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE firmware_rollouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE firmware_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE firmware_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON firmware_artifacts,firmware_rollouts,firmware_targets,firmware_receipts FROM anon,authenticated;

$sc_source_6c699898bdf702536de5e307951937a9124864e9896116335cf90dc8197a2f7a$;
    INSERT INTO public.schema_migrations(name,sha256) VALUES('017_firmware_delivery.sql','6c699898bdf702536de5e307951937a9124864e9896116335cf90dc8197a2f7a');
  END IF;
END $sc_step_16$;

DO $sc_step_17$
DECLARE seen text;
BEGIN
  SELECT sha256 INTO seen FROM public.schema_migrations WHERE name='018_provider_unit_reconciliation.sql';
  IF FOUND THEN
    IF seen IS DISTINCT FROM '920114af1cfa591d2ae19a8dbcd5966a8006a316ee6175bd17b0bae2ba46781e' THEN RAISE EXCEPTION 'Migration checksum mismatch: 018_provider_unit_reconciliation.sql'; END IF;
  ELSE
    EXECUTE $sc_source_920114af1cfa591d2ae19a8dbcd5966a8006a316ee6175bd17b0bae2ba46781e$
-- Keep quoted units separate from actual provider-delivered energy.
ALTER TABLE payments ADD COLUMN delivered_units_mwh bigint CHECK(delivered_units_mwh>0);
CREATE TABLE energy_credit_lots (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), wallet_id uuid NOT NULL REFERENCES wallets(id),
 payment_id uuid NOT NULL UNIQUE REFERENCES payments(id),
 credited_mwh bigint NOT NULL CHECK(credited_mwh>0), cost_kobo bigint NOT NULL CHECK(cost_kobo>=0),
 remaining_mwh bigint NOT NULL CHECK(remaining_mwh>=0), remaining_cost_kobo bigint NOT NULL CHECK(remaining_cost_kobo>=0),
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(remaining_mwh<=credited_mwh AND remaining_cost_kobo<=cost_kobo)
);
ALTER TABLE energy_credit_lots ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON energy_credit_lots FROM anon,authenticated;
CREATE INDEX energy_lots_fifo ON energy_credit_lots(wallet_id,created_at,id) WHERE remaining_mwh>0;

$sc_source_920114af1cfa591d2ae19a8dbcd5966a8006a316ee6175bd17b0bae2ba46781e$;
    INSERT INTO public.schema_migrations(name,sha256) VALUES('018_provider_unit_reconciliation.sql','920114af1cfa591d2ae19a8dbcd5966a8006a316ee6175bd17b0bae2ba46781e');
  END IF;
END $sc_step_17$;

DO $sc_step_18$
DECLARE seen text;
BEGIN
  SELECT sha256 INTO seen FROM public.schema_migrations WHERE name='019_meter_payment_destinations.sql';
  IF FOUND THEN
    IF seen IS DISTINCT FROM 'd1a8618721698c5cbf1b3eda8f103a981f38d4483c5e429f778aadbef903c7c2' THEN RAISE EXCEPTION 'Migration checksum mismatch: 019_meter_payment_destinations.sql'; END IF;
  ELSE
    EXECUTE $sc_source_d1a8618721698c5cbf1b3eda8f103a981f38d4483c5e429f778aadbef903c7c2$
-- Identical meter digits can belong to different DisCos; do not silently reuse a destination.
ALTER TABLE linked_meters DROP CONSTRAINT linked_meters_owner_id_meter_number_key;
ALTER TABLE linked_meters ADD CONSTRAINT linked_meter_owner_service_number UNIQUE(owner_id,disco_name,meter_number);

$sc_source_d1a8618721698c5cbf1b3eda8f103a981f38d4483c5e429f778aadbef903c7c2$;
    INSERT INTO public.schema_migrations(name,sha256) VALUES('019_meter_payment_destinations.sql','d1a8618721698c5cbf1b3eda8f103a981f38d4483c5e429f778aadbef903c7c2');
  END IF;
END $sc_step_18$;

DO $sc_step_19$
DECLARE seen text;
BEGIN
  SELECT sha256 INTO seen FROM public.schema_migrations WHERE name='020_central_meter_destinations.sql';
  IF FOUND THEN
    IF seen IS DISTINCT FROM 'fee4497e7c422cb30b3b458fc4d24c8c3b16b233cb7788afe5eaa450d2ad05f4' THEN RAISE EXCEPTION 'Migration checksum mismatch: 020_central_meter_destinations.sql'; END IF;
  ELSE
    EXECUTE $sc_source_fee4497e7c422cb30b3b458fc4d24c8c3b16b233cb7788afe5eaa450d2ad05f4$
-- Pin the quoted vending destination so reassociation cannot redirect a paid purchase.
ALTER TABLE quotes ADD COLUMN destination_meter_id uuid REFERENCES linked_meters(id);
ALTER TABLE quotes ADD COLUMN destination_meter_number text;
ALTER TABLE quotes ADD COLUMN destination_service_id text;
CREATE TABLE building_payment_destinations (
 building_id uuid PRIMARY KEY REFERENCES buildings(id),
 linked_meter_id uuid NOT NULL REFERENCES linked_meters(id),
 tariff_version text NOT NULL REFERENCES tariffs(version),
 configured_by uuid NOT NULL REFERENCES profiles(id), configured_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE building_payment_destinations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON building_payment_destinations FROM anon,authenticated;
CREATE UNIQUE INDEX one_room_device ON devices(room_id) WHERE room_id IS NOT NULL;

$sc_source_fee4497e7c422cb30b3b458fc4d24c8c3b16b233cb7788afe5eaa450d2ad05f4$;
    INSERT INTO public.schema_migrations(name,sha256) VALUES('020_central_meter_destinations.sql','fee4497e7c422cb30b3b458fc4d24c8c3b16b233cb7788afe5eaa450d2ad05f4');
  END IF;
END $sc_step_19$;

DO $sc_step_20$
DECLARE seen text;
BEGIN
  SELECT sha256 INTO seen FROM public.schema_migrations WHERE name='021_signed_report_exports.sql';
  IF FOUND THEN
    IF seen IS DISTINCT FROM '299749060cc7c61a3ffea99a66c37886c70a077022d0632ca86562166ee5072f' THEN RAISE EXCEPTION 'Migration checksum mismatch: 021_signed_report_exports.sql'; END IF;
  ELSE
    EXECUTE $sc_source_299749060cc7c61a3ffea99a66c37886c70a077022d0632ca86562166ee5072f$
ALTER TABLE reports ADD COLUMN public_key_pem text;
CREATE FUNCTION private.protect_report_snapshot() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF (to_jsonb(OLD)-'revoked_at') IS DISTINCT FROM (to_jsonb(NEW)-'revoked_at') THEN
  RAISE EXCEPTION 'immutable report: only revocation may change';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER immutable_report_snapshot BEFORE UPDATE ON reports FOR EACH ROW EXECUTE FUNCTION private.protect_report_snapshot();
CREATE TRIGGER no_report_delete BEFORE DELETE ON reports FOR EACH ROW EXECUTE FUNCTION private.immutable_record();
CREATE TABLE export_files (
 export_id uuid PRIMARY KEY REFERENCES exports(id),
 content bytea NOT NULL CHECK(octet_length(content)<=4194304),
 sha256 text NOT NULL CHECK(sha256 ~ '^[0-9a-f]{64}$'), content_type text NOT NULL
);
ALTER TABLE export_files ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON export_files FROM anon,authenticated;
CREATE TRIGGER immutable_export_files BEFORE UPDATE OR DELETE ON export_files FOR EACH ROW EXECUTE FUNCTION private.immutable_record();
-- Indexed listing metadata; canonical bytes remain the signed source of truth.
ALTER TABLE reports ADD COLUMN period_start timestamptz;
ALTER TABLE reports ADD COLUMN period_end timestamptz;
CREATE INDEX reports_owner_issued ON reports(created_by,issued_at DESC);

$sc_source_299749060cc7c61a3ffea99a66c37886c70a077022d0632ca86562166ee5072f$;
    INSERT INTO public.schema_migrations(name,sha256) VALUES('021_signed_report_exports.sql','299749060cc7c61a3ffea99a66c37886c70a077022d0632ca86562166ee5072f');
  END IF;
END $sc_step_20$;

DO $sc_step_21$
DECLARE seen text;
BEGIN
  SELECT sha256 INTO seen FROM public.schema_migrations WHERE name='022_immutable_quotes_tariffs.sql';
  IF FOUND THEN
    IF seen IS DISTINCT FROM 'b76a28e85c502d19cf25243030309ff95a2817e7b398a3bc1be1e819f4f09e6d' THEN RAISE EXCEPTION 'Migration checksum mismatch: 022_immutable_quotes_tariffs.sql'; END IF;
  ELSE
    EXECUTE $sc_source_b76a28e85c502d19cf25243030309ff95a2817e7b398a3bc1be1e819f4f09e6d$
-- A paid purchase must continue to describe the exact approved quote/rate version.
CREATE TRIGGER immutable_quote BEFORE UPDATE OR DELETE ON quotes
 FOR EACH ROW EXECUTE FUNCTION private.immutable_record();
CREATE TRIGGER immutable_tariff_version BEFORE UPDATE OR DELETE ON tariffs
 FOR EACH ROW EXECUTE FUNCTION private.immutable_record();

$sc_source_b76a28e85c502d19cf25243030309ff95a2817e7b398a3bc1be1e819f4f09e6d$;
    INSERT INTO public.schema_migrations(name,sha256) VALUES('022_immutable_quotes_tariffs.sql','b76a28e85c502d19cf25243030309ff95a2817e7b398a3bc1be1e819f4f09e6d');
  END IF;
END $sc_step_21$;

DO $sc_step_22$
DECLARE seen text;
BEGIN
  SELECT sha256 INTO seen FROM public.schema_migrations WHERE name='023_prepaid_policy_sync.sql';
  IF FOUND THEN
    IF seen IS DISTINCT FROM 'c2e20db152168a9a9606b8fad9a3765e2b222c5c793adb6d30786610ed6f527d' THEN RAISE EXCEPTION 'Migration checksum mismatch: 023_prepaid_policy_sync.sql'; END IF;
  ELSE
    EXECUTE $sc_source_c2e20db152168a9a9606b8fad9a3765e2b222c5c793adb6d30786610ed6f527d$
-- Signed volume allowances do not depend on a stale cloud balance or wall clock.
-- Activation remains a separate qualified installation decision, never a subscription flag.
ALTER TABLE devices ADD COLUMN persistent_counter_qualified boolean NOT NULL DEFAULT false;
ALTER TABLE devices ADD COLUMN prepaid_policy_qualified boolean NOT NULL DEFAULT false;
ALTER TABLE devices ADD COLUMN meter_counter_epoch integer NOT NULL DEFAULT 1 CHECK(meter_counter_epoch>0);
ALTER TABLE devices ADD COLUMN prepaid_anchor_mwh bigint CHECK(prepaid_anchor_mwh>=0);
ALTER TABLE devices ADD COLUMN next_credit_policy_seq bigint NOT NULL DEFAULT 0;
CREATE TABLE device_credit_policies (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),device_id uuid NOT NULL REFERENCES devices(id),
 seq bigint NOT NULL,body jsonb NOT NULL,body_sha256 text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(device_id,seq)
);
CREATE TABLE device_credit_policy_receipts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),policy_id uuid NOT NULL REFERENCES device_credit_policies(id),
 inbox_id uuid NOT NULL UNIQUE REFERENCES device_inbox(id),
 result text NOT NULL CHECK(result IN ('accepted','rejected')),
 reason_code text NOT NULL,import_mwh bigint CHECK(import_mwh>=0),
 observed_at_ms bigint,clock_quality text NOT NULL CHECK(clock_quality IN ('trusted','estimated','unknown')),
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE device_credit_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_credit_policy_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON device_credit_policies,device_credit_policy_receipts FROM anon,authenticated;
CREATE TRIGGER immutable_credit_policy BEFORE UPDATE OR DELETE ON device_credit_policies FOR EACH ROW EXECUTE FUNCTION private.immutable_record();
CREATE TRIGGER immutable_credit_policy_receipt BEFORE UPDATE OR DELETE ON device_credit_policy_receipts FOR EACH ROW EXECUTE FUNCTION private.immutable_record();
CREATE FUNCTION private.protect_credit_anchor() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF (NEW.prepaid_anchor_mwh,NEW.meter_counter_epoch) IS DISTINCT FROM (OLD.prepaid_anchor_mwh,OLD.meter_counter_epoch)
  AND EXISTS(SELECT 1 FROM public.device_credit_policies WHERE device_id=OLD.id) THEN
  RAISE EXCEPTION 'issued prepaid allowance: replacement/counter reset requires reviewed decommissioning';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER protect_credit_anchor BEFORE UPDATE ON devices FOR EACH ROW EXECUTE FUNCTION private.protect_credit_anchor();

CREATE INDEX credit_policy_receipts_timeline ON device_credit_policy_receipts(policy_id,observed_at_ms DESC,created_at DESC);

$sc_source_c2e20db152168a9a9606b8fad9a3765e2b222c5c793adb6d30786610ed6f527d$;
    INSERT INTO public.schema_migrations(name,sha256) VALUES('023_prepaid_policy_sync.sql','c2e20db152168a9a9606b8fad9a3765e2b222c5c793adb6d30786610ed6f527d');
  END IF;
END $sc_step_22$;

DO $sc_step_23$
DECLARE seen text;
BEGIN
  SELECT sha256 INTO seen FROM public.schema_migrations WHERE name='024_account_onboarding.sql';
  IF FOUND THEN
    IF seen IS DISTINCT FROM '2339601e91221bd3baec2c3fd69c0c28a293bd9249bf69a60bd3c6bf894d410e' THEN RAISE EXCEPTION 'Migration checksum mismatch: 024_account_onboarding.sql'; END IF;
  ELSE
    EXECUTE $sc_source_2339601e91221bd3baec2c3fd69c0c28a293bd9249bf69a60bd3c6bf894d410e$
-- Verified provider identities may use email without a phone. Phone enrollment
-- is separate and must be verified before phone-dependent operations.
ALTER TABLE profiles ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE profiles ADD COLUMN email text;
ALTER TABLE profiles ADD COLUMN onboarding_completed_at timestamptz;
ALTER TABLE profiles ADD CONSTRAINT profile_contact_required CHECK (phone IS NOT NULL OR email IS NOT NULL);
CREATE UNIQUE INDEX profiles_email_unique ON profiles(lower(email)) WHERE email IS NOT NULL;

CREATE TABLE account_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id),
  terms_version text NOT NULL CHECK (length(terms_version) BETWEEN 1 AND 100),
  privacy_version text NOT NULL CHECK (length(privacy_version) BETWEEN 1 AND 100),
  accepted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id,terms_version,privacy_version)
);
CREATE FUNCTION keep_account_consent() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Consent records are immutable'; END $$;
CREATE TRIGGER immutable_account_consent BEFORE UPDATE OR DELETE ON account_consents
  FOR EACH ROW EXECUTE FUNCTION keep_account_consent();
ALTER TABLE account_consents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON account_consents FROM anon,authenticated;
-- Existing profiles have no fabricated consent or inferred completion timestamp.

$sc_source_2339601e91221bd3baec2c3fd69c0c28a293bd9249bf69a60bd3c6bf894d410e$;
    INSERT INTO public.schema_migrations(name,sha256) VALUES('024_account_onboarding.sql','2339601e91221bd3baec2c3fd69c0c28a293bd9249bf69a60bd3c6bf894d410e');
  END IF;
END $sc_step_23$;

DO $sc_step_24$
DECLARE seen text;
BEGIN
  SELECT sha256 INTO seen FROM public.schema_migrations WHERE name='025_web_push.sql';
  IF FOUND THEN
    IF seen IS DISTINCT FROM '5320cf861e0ce9d0261c2743e13e88f060010f981bbe399cd78c543db837126a' THEN RAISE EXCEPTION 'Migration checksum mismatch: 025_web_push.sql'; END IF;
  ELSE
    EXECUTE $sc_source_5320cf861e0ce9d0261c2743e13e88f060010f981bbe399cd78c543db837126a$
CREATE TABLE push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id),
  endpoint_hash text NOT NULL UNIQUE,
  encrypted_subscription text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE push_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES notifications(id),
  subscription_id uuid NOT NULL REFERENCES push_subscriptions(id),
  status text NOT NULL DEFAULT 'queued' CHECK(status IN('queued','unknown','provider_accepted','failed','expired','opted_out')),
  dispatched_at timestamptz,
  last_error text,
  UNIQUE(notification_id,subscription_id)
);
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON push_subscriptions,push_deliveries FROM anon,authenticated;

$sc_source_5320cf861e0ce9d0261c2743e13e88f060010f981bbe399cd78c543db837126a$;
    INSERT INTO public.schema_migrations(name,sha256) VALUES('025_web_push.sql','5320cf861e0ce9d0261c2743e13e88f060010f981bbe399cd78c543db837126a');
  END IF;
END $sc_step_24$;

DO $sc_step_25$
DECLARE seen text;
BEGIN
  SELECT sha256 INTO seen FROM public.schema_migrations WHERE name='026_scoped_service_notices.sql';
  IF FOUND THEN
    IF seen IS DISTINCT FROM '9f9577e0845da609eb5542939f05304d5fa0bf3b44309eb3a9401d516ee7e64e' THEN RAISE EXCEPTION 'Migration checksum mismatch: 026_scoped_service_notices.sql'; END IF;
  ELSE
    EXECUTE $sc_source_9f9577e0845da609eb5542939f05304d5fa0bf3b44309eb3a9401d516ee7e64e$
CREATE TABLE organization_notice_grants (
  organization_id uuid PRIMARY KEY REFERENCES organizations(id),
  enabled boolean NOT NULL,
  expires_at timestamptz NOT NULL,
  reviewed_by uuid NOT NULL REFERENCES profiles(id),
  review_note text NOT NULL CHECK(length(review_note) BETWEEN 10 AND 2000),
  version integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE service_notice_previews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES profiles(id),
  organization_id uuid REFERENCES organizations(id),
  title text NOT NULL,
  message text NOT NULL,
  channels jsonb NOT NULL,
  device_ids uuid[] NOT NULL,
  recipient_ids uuid[] NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT now()+interval '5 minutes',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE service_notice_dispatches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  preview_id uuid NOT NULL UNIQUE REFERENCES service_notice_previews(id),
  actor_id uuid NOT NULL REFERENCES profiles(id),
  recipient_count integer NOT NULL CHECK(recipient_count BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE FUNCTION keep_service_notice() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Service notice records are immutable'; END $$;
CREATE TRIGGER immutable_service_notice_preview BEFORE UPDATE OR DELETE ON service_notice_previews FOR EACH ROW EXECUTE FUNCTION keep_service_notice();
CREATE TRIGGER immutable_service_notice_dispatch BEFORE UPDATE OR DELETE ON service_notice_dispatches FOR EACH ROW EXECUTE FUNCTION keep_service_notice();
ALTER TABLE organization_notice_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_notice_previews ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_notice_dispatches ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON organization_notice_grants,service_notice_previews,service_notice_dispatches FROM anon,authenticated;

$sc_source_9f9577e0845da609eb5542939f05304d5fa0bf3b44309eb3a9401d516ee7e64e$;
    INSERT INTO public.schema_migrations(name,sha256) VALUES('026_scoped_service_notices.sql','9f9577e0845da609eb5542939f05304d5fa0bf3b44309eb3a9401d516ee7e64e');
  END IF;
END $sc_step_25$;

DO $sc_step_26$
DECLARE seen text;
BEGIN
  SELECT sha256 INTO seen FROM public.schema_migrations WHERE name='027_email_dispatch.sql';
  IF FOUND THEN
    IF seen IS DISTINCT FROM '5f28b6b1c99d5f492ea6d787835b7bf4cfd2bfefcd5070644f1190f98ce5c63e' THEN RAISE EXCEPTION 'Migration checksum mismatch: 027_email_dispatch.sql'; END IF;
  ELSE
    EXECUTE $sc_source_5f28b6b1c99d5f492ea6d787835b7bf4cfd2bfefcd5070644f1190f98ce5c63e$
CREATE TABLE email_dispatches (
  notification_id uuid PRIMARY KEY REFERENCES notifications(id),
  encrypted_request text NOT NULL,
  request_sha256 text NOT NULL,
  first_attempt_at timestamptz,
  retry_until timestamptz,
  credential_fingerprint text,
  CHECK ((first_attempt_at IS NULL)=(retry_until IS NULL))
);
CREATE FUNCTION keep_email_request() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.notification_id<>OLD.notification_id OR NEW.encrypted_request<>OLD.encrypted_request OR NEW.request_sha256<>OLD.request_sha256 THEN
    RAISE EXCEPTION 'Email request identity is immutable';
  END IF;
  IF OLD.first_attempt_at IS NOT NULL AND
    (NEW.first_attempt_at IS DISTINCT FROM OLD.first_attempt_at OR NEW.retry_until IS DISTINCT FROM OLD.retry_until OR NEW.credential_fingerprint IS DISTINCT FROM OLD.credential_fingerprint) THEN
    RAISE EXCEPTION 'Email dispatch window is immutable';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER immutable_email_request BEFORE UPDATE ON email_dispatches FOR EACH ROW EXECUTE FUNCTION keep_email_request();
ALTER TABLE email_dispatches ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON email_dispatches FROM anon,authenticated;

$sc_source_5f28b6b1c99d5f492ea6d787835b7bf4cfd2bfefcd5070644f1190f98ce5c63e$;
    INSERT INTO public.schema_migrations(name,sha256) VALUES('027_email_dispatch.sql','5f28b6b1c99d5f492ea6d787835b7bf4cfd2bfefcd5070644f1190f98ce5c63e');
  END IF;
END $sc_step_26$;

DO $sc_step_27$
DECLARE seen text;
BEGIN
  SELECT sha256 INTO seen FROM public.schema_migrations WHERE name='028_email_provider_routing.sql';
  IF FOUND THEN
    IF seen IS DISTINCT FROM '16e02d4bfc7c0b5cd3a20f351090dc571ea3339f13cbb4819de898273516d818' THEN RAISE EXCEPTION 'Migration checksum mismatch: 028_email_provider_routing.sql'; END IF;
  ELSE
    EXECUTE $sc_source_16e02d4bfc7c0b5cd3a20f351090dc571ea3339f13cbb4819de898273516d818$
ALTER TABLE email_dispatches ADD COLUMN provider text DEFAULT 'resend' CHECK(provider IN('resend','onesignal'));
ALTER TABLE email_dispatches ADD COLUMN provider_app_id text;
ALTER TABLE email_dispatches ADD COLUMN provider_request_id uuid NOT NULL DEFAULT gen_random_uuid();
UPDATE email_dispatches SET provider=NULL WHERE first_attempt_at IS NULL;
ALTER TABLE email_dispatches ALTER COLUMN provider DROP DEFAULT;
CREATE TABLE email_quota_counters (
  scope text NOT NULL,
  period text NOT NULL CHECK(period IN('day','month')),
  starts_on date NOT NULL,
  reserved integer NOT NULL DEFAULT 0 CHECK(reserved>=0),
  PRIMARY KEY(scope,period,starts_on)
);
CREATE TABLE email_quota_reservations (
  notification_id uuid NOT NULL REFERENCES email_dispatches(notification_id),
  scope text NOT NULL,
  day date NOT NULL,
  PRIMARY KEY(notification_id,day)
);
-- Preserve today's own previously dispatched Resend usage across this upgrade.
INSERT INTO email_quota_reservations(notification_id,scope,day)
SELECT notification_id,'resend',(first_attempt_at AT TIME ZONE 'UTC')::date
FROM email_dispatches WHERE first_attempt_at IS NOT NULL;
INSERT INTO email_quota_counters(scope,period,starts_on,reserved)
SELECT 'resend','day',day,count(*) FROM email_quota_reservations GROUP BY day;
INSERT INTO email_quota_counters(scope,period,starts_on,reserved)
SELECT 'resend','month',date_trunc('month',day)::date,count(DISTINCT notification_id)
FROM email_quota_reservations GROUP BY date_trunc('month',day)::date;
CREATE FUNCTION keep_email_provider() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.provider_request_id<>OLD.provider_request_id OR (OLD.first_attempt_at IS NOT NULL AND
    (NEW.provider IS DISTINCT FROM OLD.provider OR NEW.provider_app_id IS DISTINCT FROM OLD.provider_app_id)) THEN
    RAISE EXCEPTION 'Email provider identity is immutable after dispatch';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER immutable_email_provider BEFORE UPDATE ON email_dispatches FOR EACH ROW EXECUTE FUNCTION keep_email_provider();
ALTER TABLE email_quota_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_quota_reservations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON email_quota_counters,email_quota_reservations FROM anon,authenticated;

$sc_source_16e02d4bfc7c0b5cd3a20f351090dc571ea3339f13cbb4819de898273516d818$;
    INSERT INTO public.schema_migrations(name,sha256) VALUES('028_email_provider_routing.sql','16e02d4bfc7c0b5cd3a20f351090dc571ea3339f13cbb4819de898273516d818');
  END IF;
END $sc_step_27$;

DO $sc_step_28$
DECLARE seen text;
BEGIN
  SELECT sha256 INTO seen FROM public.schema_migrations WHERE name='029_frozen_provider_payload.sql';
  IF FOUND THEN
    IF seen IS DISTINCT FROM 'a71187b90bb40e0be1fb34cf132d0cf4405dcce7a9e5fa3e67caa2e2822ff1be' THEN RAISE EXCEPTION 'Migration checksum mismatch: 029_frozen_provider_payload.sql'; END IF;
  ELSE
    EXECUTE $sc_source_a71187b90bb40e0be1fb34cf132d0cf4405dcce7a9e5fa3e67caa2e2822ff1be$
ALTER TABLE email_dispatches ADD COLUMN encrypted_provider_request text;
CREATE FUNCTION keep_provider_payload() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.encrypted_provider_request IS NOT NULL AND NEW.encrypted_provider_request IS DISTINCT FROM OLD.encrypted_provider_request THEN
    RAISE EXCEPTION 'Submitted provider payload is immutable';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER immutable_submitted_email BEFORE UPDATE ON email_dispatches FOR EACH ROW EXECUTE FUNCTION keep_provider_payload();

$sc_source_a71187b90bb40e0be1fb34cf132d0cf4405dcce7a9e5fa3e67caa2e2822ff1be$;
    INSERT INTO public.schema_migrations(name,sha256) VALUES('029_frozen_provider_payload.sql','a71187b90bb40e0be1fb34cf132d0cf4405dcce7a9e5fa3e67caa2e2822ff1be');
  END IF;
END $sc_step_28$;

DO $sc_step_29$
DECLARE seen text;
BEGIN
  SELECT sha256 INTO seen FROM public.schema_migrations WHERE name='030_onesignal_web_push.sql';
  IF FOUND THEN
    IF seen IS DISTINCT FROM '14cf8d68e9ddc749c72912e23d4448be8014bb302b97a6bbe355988b609cff7c' THEN RAISE EXCEPTION 'Migration checksum mismatch: 030_onesignal_web_push.sql'; END IF;
  ELSE
    EXECUTE $sc_source_14cf8d68e9ddc749c72912e23d4448be8014bb302b97a6bbe355988b609cff7c$
CREATE TABLE onesignal_push_accounts (
  user_id uuid NOT NULL REFERENCES profiles(id),
  app_id uuid NOT NULL,
  encrypted_alias text NOT NULL,
  PRIMARY KEY(user_id,app_id)
);
CREATE TABLE onesignal_push_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id),
  app_id uuid NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX onesignal_active_device_accounts ON onesignal_push_devices(user_id,app_id) WHERE enabled;
CREATE TABLE onesignal_push_deliveries (
  notification_id uuid PRIMARY KEY REFERENCES notifications(id),
  encrypted_request text NOT NULL,
  first_attempt_at timestamptz,
  retry_until timestamptz,
  credential_fingerprint text
);
CREATE FUNCTION keep_onesignal_payload() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.notification_id<>OLD.notification_id OR NEW.encrypted_request<>OLD.encrypted_request OR
    (OLD.first_attempt_at IS NOT NULL AND (NEW.first_attempt_at IS DISTINCT FROM OLD.first_attempt_at OR
      NEW.retry_until IS DISTINCT FROM OLD.retry_until OR NEW.credential_fingerprint IS DISTINCT FROM OLD.credential_fingerprint)) THEN
    RAISE EXCEPTION 'OneSignal dispatch identity is immutable';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER immutable_onesignal_payload BEFORE UPDATE ON onesignal_push_deliveries
 FOR EACH ROW EXECUTE FUNCTION keep_onesignal_payload();
ALTER TABLE onesignal_push_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE onesignal_push_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE onesignal_push_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON onesignal_push_accounts,onesignal_push_devices,onesignal_push_deliveries FROM anon,authenticated;

$sc_source_14cf8d68e9ddc749c72912e23d4448be8014bb302b97a6bbe355988b609cff7c$;
    INSERT INTO public.schema_migrations(name,sha256) VALUES('030_onesignal_web_push.sql','14cf8d68e9ddc749c72912e23d4448be8014bb302b97a6bbe355988b609cff7c');
  END IF;
END $sc_step_29$;

DO $sc_step_30$
DECLARE seen text;
BEGIN
  SELECT sha256 INTO seen FROM public.schema_migrations WHERE name='031_notice_audiences.sql';
  IF FOUND THEN
    IF seen IS DISTINCT FROM '5196841dbf36a6e06b14fcb5883e033316632feced3fe433dcec66a1d45f1df8' THEN RAISE EXCEPTION 'Migration checksum mismatch: 031_notice_audiences.sql'; END IF;
  ELSE
    EXECUTE $sc_source_5196841dbf36a6e06b14fcb5883e033316632feced3fe433dcec66a1d45f1df8$
CREATE TABLE service_areas (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name text NOT NULL CHECK(length(name) BETWEEN 1 AND 100),
 region text NOT NULL CHECK(length(region) BETWEEN 1 AND 80),
 created_by uuid NOT NULL REFERENCES profiles(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(region,name)
);
CREATE TABLE device_service_areas (
 device_id uuid PRIMARY KEY REFERENCES devices(id),
 area_id uuid NOT NULL REFERENCES service_areas(id),
 assigned_by uuid NOT NULL REFERENCES profiles(id),
 version integer NOT NULL DEFAULT 1,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE bill_responsibilities (
 bill_id uuid NOT NULL REFERENCES bills(id),
 user_id uuid NOT NULL REFERENCES profiles(id),
 assigned_by uuid NOT NULL REFERENCES profiles(id),
 review_note text NOT NULL CHECK(length(review_note) BETWEEN 10 AND 2000),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(bill_id,user_id)
);
ALTER TABLE service_notice_previews ADD COLUMN audience_criteria jsonb;
CREATE TABLE service_notice_recipient_work (
 dispatch_id uuid NOT NULL REFERENCES service_notice_dispatches(id),
 recipient_id uuid NOT NULL REFERENCES profiles(id),
 status text NOT NULL DEFAULT 'queued' CHECK(status IN('queued','committed','skipped')),
 reason text,
 processed_at timestamptz,
 PRIMARY KEY(dispatch_id,recipient_id)
);
ALTER TABLE service_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_service_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_responsibilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_notice_recipient_work ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON service_areas,device_service_areas,bill_responsibilities,service_notice_recipient_work FROM anon,authenticated;

$sc_source_5196841dbf36a6e06b14fcb5883e033316632feced3fe433dcec66a1d45f1df8$;
    INSERT INTO public.schema_migrations(name,sha256) VALUES('031_notice_audiences.sql','5196841dbf36a6e06b14fcb5883e033316632feced3fe433dcec66a1d45f1df8');
  END IF;
END $sc_step_30$;

DO $sc_step_31$
DECLARE seen text;
BEGIN
  SELECT sha256 INTO seen FROM public.schema_migrations WHERE name='032_notice_batch_capacity.sql';
  IF FOUND THEN
    IF seen IS DISTINCT FROM 'd61913f976ff467b549a397ee7041e1adde31685b6fdd5a378cb4baa4971227f' THEN RAISE EXCEPTION 'Migration checksum mismatch: 032_notice_batch_capacity.sql'; END IF;
  ELSE
    EXECUTE $sc_source_d61913f976ff467b549a397ee7041e1adde31685b6fdd5a378cb4baa4971227f$
ALTER TABLE service_notice_dispatches DROP CONSTRAINT service_notice_dispatches_recipient_count_check;
ALTER TABLE service_notice_dispatches ADD CONSTRAINT service_notice_dispatches_recipient_count_check CHECK(recipient_count BETWEEN 1 AND 5000);
CREATE INDEX notice_work_status ON service_notice_recipient_work(dispatch_id,status);
CREATE INDEX service_area_device_lookup ON device_service_areas(area_id,device_id);

$sc_source_d61913f976ff467b549a397ee7041e1adde31685b6fdd5a378cb4baa4971227f$;
    INSERT INTO public.schema_migrations(name,sha256) VALUES('032_notice_batch_capacity.sql','d61913f976ff467b549a397ee7041e1adde31685b6fdd5a378cb4baa4971227f');
  END IF;
END $sc_step_31$;

DO $sc_step_32$
DECLARE seen text;
BEGIN
  SELECT sha256 INTO seen FROM public.schema_migrations WHERE name='033_support_workflow.sql';
  IF FOUND THEN
    IF seen IS DISTINCT FROM '913d12db35e3b5a3f072ca1196f1ce2a8a6168213b8b53b6ac64890e7cdce916' THEN RAISE EXCEPTION 'Migration checksum mismatch: 033_support_workflow.sql'; END IF;
  ELSE
    EXECUTE $sc_source_913d12db35e3b5a3f072ca1196f1ce2a8a6168213b8b53b6ac64890e7cdce916$
-- Support status updates serialize against replies and reject stale actions.
alter table support_tickets add column version bigint not null default 1 check (version > 0);
create index idx_support_queue on support_tickets(status,opened_at desc);

$sc_source_913d12db35e3b5a3f072ca1196f1ce2a8a6168213b8b53b6ac64890e7cdce916$;
    INSERT INTO public.schema_migrations(name,sha256) VALUES('033_support_workflow.sql','913d12db35e3b5a3f072ca1196f1ce2a8a6168213b8b53b6ac64890e7cdce916');
  END IF;
END $sc_step_32$;

DO $sc_step_33$
DECLARE seen text;
BEGIN
  SELECT sha256 INTO seen FROM public.schema_migrations WHERE name='034_dispute_review.sql';
  IF FOUND THEN
    IF seen IS DISTINCT FROM 'e74a5b384e9cf7af972de9f3ff60922dffe30f4fb86e7a08a39efa9a253ac263' THEN RAISE EXCEPTION 'Migration checksum mismatch: 034_dispute_review.sql'; END IF;
  ELSE
    EXECUTE $sc_source_e74a5b384e9cf7af972de9f3ff60922dffe30f4fb86e7a08a39efa9a253ac263$
-- Review state does not authorize wallet credits, bill edits or refunds.
alter table disputes add column version bigint not null default 1 check (version>0);
alter table dispute_resolutions add column note text check (char_length(note)<=4000);
create index idx_dispute_queue on disputes(status,created_at desc);
create function protect_dispute_evidence() returns trigger language plpgsql as $$
begin
  if (new.bill_id,new.period_start,new.period_end,new.raised_by,new.note,new.evidence_snapshot_hash,new.evidence_snapshot)
    is distinct from (old.bill_id,old.period_start,old.period_end,old.raised_by,old.note,old.evidence_snapshot_hash,old.evidence_snapshot)
  then raise exception 'Dispute evidence is immutable'; end if;
  return new;
end $$;
create trigger dispute_evidence_immutable before update on disputes for each row execute function protect_dispute_evidence();

$sc_source_e74a5b384e9cf7af972de9f3ff60922dffe30f4fb86e7a08a39efa9a253ac263$;
    INSERT INTO public.schema_migrations(name,sha256) VALUES('034_dispute_review.sql','e74a5b384e9cf7af972de9f3ff60922dffe30f4fb86e7a08a39efa9a253ac263');
  END IF;
END $sc_step_33$;

DO $sc_step_34$
DECLARE seen text;
BEGIN
  SELECT sha256 INTO seen FROM public.schema_migrations WHERE name='035_email_delivery_receipts.sql';
  IF FOUND THEN
    IF seen IS DISTINCT FROM '7fcb33c4bb4328d4f3ebb4e95a37be683c4363fda0e3369397dc820abd8a1f73' THEN RAISE EXCEPTION 'Migration checksum mismatch: 035_email_delivery_receipts.sql'; END IF;
  ELSE
    EXECUTE $sc_source_7fcb33c4bb4328d4f3ebb4e95a37be683c4363fda0e3369397dc820abd8a1f73$
-- Provider acceptance and recipient-server delivery are separate facts.
alter table email_dispatches add column webhook_tag uuid not null default gen_random_uuid() unique;
alter table email_dispatches add column delivery_state text not null default 'unknown'
  check(delivery_state in ('unknown','sent','delayed','delivered','failed','suppressed','bounced','complained'));
alter table email_dispatches add column delivery_event_at timestamptz;
create table email_delivery_events (
  event_id text primary key check(char_length(event_id)<=200),
  body_sha256 text not null,
  provider_reference text not null,
  event_type text not null,
  occurred_at timestamptz not null,
  recipient_hash text not null,
  notification_id uuid references notifications(id),
  disposition text not null default 'unmatched' check(disposition in ('unmatched','matched','recipient_mismatch','reference_mismatch')),
  received_at timestamptz not null default now()
);
create index idx_email_receipt_unmatched on email_delivery_events(provider_reference) where disposition='unmatched';
create table email_suppressions (
  address_hash text primary key,
  reason text not null check(reason in ('bounced','complained','suppressed')),
  notification_id uuid not null references notifications(id),
  created_at timestamptz not null default now()
);
alter table email_delivery_events enable row level security;
alter table email_suppressions enable row level security;
revoke all on email_delivery_events,email_suppressions from anon,authenticated;

$sc_source_7fcb33c4bb4328d4f3ebb4e95a37be683c4363fda0e3369397dc820abd8a1f73$;
    INSERT INTO public.schema_migrations(name,sha256) VALUES('035_email_delivery_receipts.sql','7fcb33c4bb4328d4f3ebb4e95a37be683c4363fda0e3369397dc820abd8a1f73');
  END IF;
END $sc_step_34$;

DO $sc_step_35$
DECLARE seen text;
BEGIN
  SELECT sha256 INTO seen FROM public.schema_migrations WHERE name='036_alert_interactions.sql';
  IF FOUND THEN
    IF seen IS DISTINCT FROM 'b2755b55a30a71857a894ced2632f81737bc9b492eba7df8fcaafd9db8b7adc4' THEN RAISE EXCEPTION 'Migration checksum mismatch: 036_alert_interactions.sql'; END IF;
  ELSE
    EXECUTE $sc_source_b2755b55a30a71857a894ced2632f81737bc9b492eba7df8fcaafd9db8b7adc4$
-- UI acknowledgement/snooze must not overwrite a provider delivery outcome.
create table notification_interactions (
 notification_id uuid primary key references notifications(id),
 recipient_id uuid not null references profiles(id),
 acknowledged_at timestamptz,
 snoozed_until timestamptz,
 updated_at timestamptz not null default now()
);
create index idx_notification_interactions_recipient on notification_interactions(recipient_id);
alter table notification_interactions enable row level security;
revoke all on notification_interactions from anon,authenticated;

$sc_source_b2755b55a30a71857a894ced2632f81737bc9b492eba7df8fcaafd9db8b7adc4$;
    INSERT INTO public.schema_migrations(name,sha256) VALUES('036_alert_interactions.sql','b2755b55a30a71857a894ced2632f81737bc9b492eba7df8fcaafd9db8b7adc4');
  END IF;
END $sc_step_35$;

DO $sc_step_36$
DECLARE seen text;
BEGIN
  SELECT sha256 INTO seen FROM public.schema_migrations WHERE name='037_device_experience_state.sql';
  IF FOUND THEN
    IF seen IS DISTINCT FROM 'e626234c78f0b7d614b9ee44889a013c6b7759d21ff7ac4306fbc10576de079b' THEN RAISE EXCEPTION 'Migration checksum mismatch: 037_device_experience_state.sql'; END IF;
  ELSE
    EXECUTE $sc_source_e626234c78f0b7d614b9ee44889a013c6b7759d21ff7ac4306fbc10576de079b$
-- Transition memory prevents repeated audible alerts for the same recorded condition.
create table device_experience_state (
 device_id uuid not null references devices(id),
 signal_key text not null,
 state text not null,
 observed_at timestamptz not null,
 primary key(device_id,signal_key)
);
alter table device_experience_state enable row level security;
revoke all on device_experience_state from anon,authenticated;

$sc_source_e626234c78f0b7d614b9ee44889a013c6b7759d21ff7ac4306fbc10576de079b$;
    INSERT INTO public.schema_migrations(name,sha256) VALUES('037_device_experience_state.sql','e626234c78f0b7d614b9ee44889a013c6b7759d21ff7ac4306fbc10576de079b');
  END IF;
END $sc_step_36$;

DO $sc_step_37$
DECLARE seen text;
BEGIN
  SELECT sha256 INTO seen FROM public.schema_migrations WHERE name='038_signed_channel_manifests.sql';
  IF FOUND THEN
    IF seen IS DISTINCT FROM '9cf0976cc69ee2547b9b7ced4031767e8716215d0aae7ab468c0e034a421660e' THEN RAISE EXCEPTION 'Migration checksum mismatch: 038_signed_channel_manifests.sql'; END IF;
  ELSE
    EXECUTE $sc_source_9cf0976cc69ee2547b9b7ced4031767e8716215d0aae7ab468c0e034a421660e$
-- Display manifests are signed device declarations. They do not grant actuation authority.
create table device_channel_manifests (
 device_id uuid primary key references devices(id),
 version bigint not null check(version>0),
 schema_version integer not null check(schema_version=1),
 channels jsonb not null check(jsonb_typeof(channels)='object'),
 calibration_version text not null,
 inbox_id uuid not null references device_inbox(id),
 updated_at timestamptz not null default now()
);
alter table device_channel_manifests enable row level security;
revoke all on device_channel_manifests from anon,authenticated;

$sc_source_9cf0976cc69ee2547b9b7ced4031767e8716215d0aae7ab468c0e034a421660e$;
    INSERT INTO public.schema_migrations(name,sha256) VALUES('038_signed_channel_manifests.sql','9cf0976cc69ee2547b9b7ced4031767e8716215d0aae7ab468c0e034a421660e');
  END IF;
END $sc_step_37$;

DO $sc_step_38$
DECLARE seen text;
BEGIN
  SELECT sha256 INTO seen FROM public.schema_migrations WHERE name='039_signal_investigations.sql';
  IF FOUND THEN
    IF seen IS DISTINCT FROM '80d823892481e1b2a3390c65d146e2f52d19c76ed7e22ad1a8de50170778b7e8' THEN RAISE EXCEPTION 'Migration checksum mismatch: 039_signal_investigations.sql'; END IF;
  ELSE
    EXECUTE $sc_source_80d823892481e1b2a3390c65d146e2f52d19c76ed7e22ad1a8de50170778b7e8$
-- A signal requests investigation, never establishes theft or authorizes switching.
create table signal_reviews (
 id uuid primary key default gen_random_uuid(),
 signal_id uuid not null references device_signals(id),
 reporter_id uuid not null references profiles(id),
 ticket_id uuid not null unique references support_tickets(id),
 job_id uuid unique references jobs(id),
 created_at timestamptz not null default now(),
 unique(signal_id,reporter_id)
);
alter table signal_reviews enable row level security;
revoke all on signal_reviews from anon,authenticated;
create index signal_reviews_signal on signal_reviews(signal_id);

$sc_source_80d823892481e1b2a3390c65d146e2f52d19c76ed7e22ad1a8de50170778b7e8$;
    INSERT INTO public.schema_migrations(name,sha256) VALUES('039_signal_investigations.sql','80d823892481e1b2a3390c65d146e2f52d19c76ed7e22ad1a8de50170778b7e8');
  END IF;
END $sc_step_38$;

DO $sc_step_39$
DECLARE seen text;
BEGIN
  SELECT sha256 INTO seen FROM public.schema_migrations WHERE name='040_transport_reports.sql';
  IF FOUND THEN
    IF seen IS DISTINCT FROM '1fcbaa7b0e124ac1e5445dad0442f2798a4f598494bdec9e3d43bfb91173d5f5' THEN RAISE EXCEPTION 'Migration checksum mismatch: 040_transport_reports.sql'; END IF;
  ELSE
    EXECUTE $sc_source_1fcbaa7b0e124ac1e5445dad0442f2798a4f598494bdec9e3d43bfb91173d5f5$
-- Authenticated modem counters are separate from stored JSON size and SIM billing.
create table device_transport_reports (
 id uuid primary key default gen_random_uuid(),
 device_id uuid not null references devices(id),
 inbox_id uuid not null unique references device_inbox(id),
 counter_session text not null check(counter_session ~ '^[0-9a-f]{32}$'),
 occurred_at_ms bigint,
 clock_quality text not null check(clock_quality in('trusted','estimated','unknown')),
 received_at timestamptz not null default now(),
 rx_bytes bigint not null check(rx_bytes>=0),
 tx_bytes bigint not null check(tx_bytes>=0),
 signal_dbm integer check(signal_dbm between -150 and -20),
 network_type text not null check(network_type in('2g','3g','4g','nb_iot','unknown'))
);
alter table device_transport_reports enable row level security;
revoke all on device_transport_reports from anon,authenticated;
create index transport_device_time on device_transport_reports(device_id,occurred_at_ms desc);

$sc_source_1fcbaa7b0e124ac1e5445dad0442f2798a4f598494bdec9e3d43bfb91173d5f5$;
    INSERT INTO public.schema_migrations(name,sha256) VALUES('040_transport_reports.sql','1fcbaa7b0e124ac1e5445dad0442f2798a4f598494bdec9e3d43bfb91173d5f5');
  END IF;
END $sc_step_39$;

DO $sc_step_40$
DECLARE seen text;
BEGIN
  SELECT sha256 INTO seen FROM public.schema_migrations WHERE name='041_automation_policy_sync.sql';
  IF FOUND THEN
    IF seen IS DISTINCT FROM '0c3f923de6caa7d48a9c9c5b0b8969d78301d59ed474003ce01b5c48d6dfc5f8' THEN RAISE EXCEPTION 'Migration checksum mismatch: 041_automation_policy_sync.sql'; END IF;
  ELSE
    EXECUTE $sc_source_0c3f923de6caa7d48a9c9c5b0b8969d78301d59ed474003ce01b5c48d6dfc5f8$
-- Qualification is never granted by a resident form or a policy acknowledgement.
alter table devices add column automation_policy_qualified boolean not null default false;
create table device_automation_policies (
 id uuid primary key default gen_random_uuid(),
 device_id uuid not null references devices(id),
 seq bigint not null check(seq>0),
 requested_by uuid not null references profiles(id),
 body jsonb not null,
 body_sha256 text not null check(body_sha256 ~ '^[0-9a-f]{64}$'),
 created_at timestamptz not null default now(),
 unique(device_id,seq)
);
create table device_automation_receipts (
 id uuid primary key default gen_random_uuid(),
 policy_id uuid not null references device_automation_policies(id),
 inbox_id uuid not null unique references device_inbox(id),
 result text not null check(result in('accepted','rejected')),
 reason_code text not null,
 observed_at_ms bigint,
 clock_quality text not null check(clock_quality in('trusted','estimated','unknown')),
 created_at timestamptz not null default now()
);
alter table device_automation_policies enable row level security;
alter table device_automation_receipts enable row level security;
revoke all on device_automation_policies,device_automation_receipts from anon,authenticated;
create trigger automation_policy_immutable before update or delete on device_automation_policies for each row execute function private.immutable_record();
create trigger automation_receipt_immutable before update or delete on device_automation_receipts for each row execute function private.immutable_record();

$sc_source_0c3f923de6caa7d48a9c9c5b0b8969d78301d59ed474003ce01b5c48d6dfc5f8$;
    INSERT INTO public.schema_migrations(name,sha256) VALUES('041_automation_policy_sync.sql','0c3f923de6caa7d48a9c9c5b0b8969d78301d59ed474003ce01b5c48d6dfc5f8');
  END IF;
END $sc_step_40$;

DO $sc_step_41$
DECLARE seen text;
BEGIN
  SELECT sha256 INTO seen FROM public.schema_migrations WHERE name='042_revoke_browser_sequence_access.sql';
  IF FOUND THEN
    IF seen IS DISTINCT FROM '46b218e6ef7857185ff6d8d95745de9663fc7ccc84c25c2060e24b6009738f87' THEN RAISE EXCEPTION 'Migration checksum mismatch: 042_revoke_browser_sequence_access.sql'; END IF;
  ELSE
    EXECUTE $sc_source_46b218e6ef7857185ff6d8d95745de9663fc7ccc84c25c2060e24b6009738f87$
-- Browser roles cannot manipulate backend audit/evidence identity counters.
-- Backend database owners retain their own privileges. RLS is not a sequence boundary.
revoke all on sequence public.audit_log_id_seq,public.usage_event_chain_id_seq from public,anon,authenticated;
-- Also prevent browser grants on future sequences created by the migration owner.
alter default privileges in schema public revoke all on sequences from public,anon,authenticated;

$sc_source_46b218e6ef7857185ff6d8d95745de9663fc7ccc84c25c2060e24b6009738f87$;
    INSERT INTO public.schema_migrations(name,sha256) VALUES('042_revoke_browser_sequence_access.sql','46b218e6ef7857185ff6d8d95745de9663fc7ccc84c25c2060e24b6009738f87');
  END IF;
END $sc_step_41$;

DO $sc_step_42$
DECLARE seen text;
BEGIN
  SELECT sha256 INTO seen FROM public.schema_migrations WHERE name='043_versioned_business_rules.sql';
  IF FOUND THEN
    IF seen IS DISTINCT FROM '9389855135743dd4d9f81e20bb824d96b11d4a132a21a0d507d608e00199bb5b' THEN RAISE EXCEPTION 'Migration checksum mismatch: 043_versioned_business_rules.sql'; END IF;
  ELSE
    EXECUTE $sc_source_9389855135743dd4d9f81e20bb824d96b11d4a132a21a0d507d608e00199bb5b$
-- Business values are versioned data. Credentials and permission invariants are not rules.
create table business_rule_versions (
 id uuid primary key default gen_random_uuid(),
 rule_key text not null,
 scope_type text not null check(scope_type in('global','region','organisation','building','device')),
 scope_ref text not null default '',
 version integer not null check(version>0),
 value jsonb not null,
 effective_from timestamptz not null default now(),
 created_by uuid not null references profiles(id),
 created_at timestamptz not null default now(),
 reason text not null check(length(reason) between 10 and 2000),
 restored_from_version integer,
 check((scope_type='global')=(scope_ref='')),
 unique(rule_key,scope_type,scope_ref,version)
);
alter table business_rule_versions enable row level security;
revoke all on business_rule_versions from public,anon,authenticated;
create trigger business_rule_immutable before update or delete on business_rule_versions for each row execute function private.immutable_record();
create index business_rule_resolution on business_rule_versions(rule_key,scope_type,scope_ref,effective_from desc,version desc);

$sc_source_9389855135743dd4d9f81e20bb824d96b11d4a132a21a0d507d608e00199bb5b$;
    INSERT INTO public.schema_migrations(name,sha256) VALUES('043_versioned_business_rules.sql','9389855135743dd4d9f81e20bb824d96b11d4a132a21a0d507d608e00199bb5b');
  END IF;
END $sc_step_42$;

DO $sc_step_43$
DECLARE seen text;
BEGIN
  SELECT sha256 INTO seen FROM public.schema_migrations WHERE name='044_energy_comparison_history.sql';
  IF FOUND THEN
    IF seen IS DISTINCT FROM 'bd6565cc857b5a5bcf654aa62cc0d5ac60827def0e89cb09e140cc97dd3d2bee' THEN RAISE EXCEPTION 'Migration checksum mismatch: 044_energy_comparison_history.sql'; END IF;
  ELSE
    EXECUTE $sc_source_bd6565cc857b5a5bcf654aa62cc0d5ac60827def0e89cb09e140cc97dd3d2bee$
-- Evidence register only. This table never credits/debits wallets or commands devices.
create table energy_comparison_windows (
 id uuid primary key default gen_random_uuid(),
 building_id uuid not null references buildings(id),
 minutes integer not null check(minutes in(15,60,1440)),
 period_start_ms bigint not null,
 period_end_ms bigint not null,
 topology_version integer not null check(topology_version>0),
 policy_sha256 text not null check(policy_sha256 ~ '^[0-9a-f]{64}$'),
 snapshot_sha256 text not null check(snapshot_sha256 ~ '^[0-9a-f]{64}$'),
 status text not null check(status in('unknown','review','within_tolerance')),
 difference_mwh bigint,
 snapshot jsonb not null,
 created_by uuid not null references profiles(id),
 created_at timestamptz not null default clock_timestamp(),
 check(period_end_ms-period_start_ms=minutes::bigint*60000),
 unique(building_id,minutes,period_end_ms,topology_version,policy_sha256,snapshot_sha256)
);
alter table energy_comparison_windows enable row level security;
revoke all on energy_comparison_windows from public,anon,authenticated;
create trigger energy_comparison_immutable before update or delete on energy_comparison_windows for each row execute function private.immutable_record();
create index energy_comparison_history on energy_comparison_windows(building_id,minutes,period_end_ms desc,created_at desc,id desc);

$sc_source_bd6565cc857b5a5bcf654aa62cc0d5ac60827def0e89cb09e140cc97dd3d2bee$;
    INSERT INTO public.schema_migrations(name,sha256) VALUES('044_energy_comparison_history.sql','bd6565cc857b5a5bcf654aa62cc0d5ac60827def0e89cb09e140cc97dd3d2bee');
  END IF;
END $sc_step_43$;

DO $sc_step_44$
DECLARE seen text;
BEGIN
  SELECT sha256 INTO seen FROM public.schema_migrations WHERE name='045_energy_comparison_schedules.sql';
  IF FOUND THEN
    IF seen IS DISTINCT FROM 'efdac6d4856449fc785157264fd74e983fb23cfffd710f67ad0c6fc80bd65a69' THEN RAISE EXCEPTION 'Migration checksum mismatch: 045_energy_comparison_schedules.sql'; END IF;
  ELSE
    EXECUTE $sc_source_efdac6d4856449fc785157264fd74e983fb23cfffd710f67ad0c6fc80bd65a69$
-- Automated evidence has a system actor, not an impersonated resident.
alter table energy_comparison_windows alter column created_by drop not null;
alter table energy_comparison_windows add column recording_mode text not null default 'manual' check(recording_mode in('manual','automatic'));
alter table energy_comparison_windows add constraint energy_comparison_actor check((recording_mode='manual')=(created_by is not null));
create table energy_comparison_schedules (
 building_id uuid primary key references buildings(id),
 enabled boolean not null default false,
 minutes integer not null default 15 check(minutes in(15,60,1440)),
 version integer not null default 1 check(version>0),
 next_window_end_ms bigint,
 next_check_at timestamptz not null default now(),
 last_record_id uuid references energy_comparison_windows(id),
 last_recorded_at timestamptz,
 last_error text,
 updated_by uuid not null references profiles(id),
 updated_at timestamptz not null default now(),
 check(not enabled or next_window_end_ms is not null)
);
alter table energy_comparison_schedules enable row level security;
revoke all on energy_comparison_schedules from public,anon,authenticated;
create index energy_comparison_schedule_due on energy_comparison_schedules(next_check_at,building_id) where enabled;

$sc_source_efdac6d4856449fc785157264fd74e983fb23cfffd710f67ad0c6fc80bd65a69$;
    INSERT INTO public.schema_migrations(name,sha256) VALUES('045_energy_comparison_schedules.sql','efdac6d4856449fc785157264fd74e983fb23cfffd710f67ad0c6fc80bd65a69');
  END IF;
END $sc_step_44$;

DO $sc_step_45$
DECLARE seen text;
BEGIN
  SELECT sha256 INTO seen FROM public.schema_migrations WHERE name='046_energy_review_cases.sql';
  IF FOUND THEN
    IF seen IS DISTINCT FROM '81abbed950b6e2f983349d29967f398f636dcd4568dcae81088219ca16ad3d2c' THEN RAISE EXCEPTION 'Migration checksum mismatch: 046_energy_review_cases.sql'; END IF;
  ELSE
    EXECUTE $sc_source_81abbed950b6e2f983349d29967f398f636dcd4568dcae81088219ca16ad3d2c$
-- Neutral investigations, never financial postings or relay restrictions.
create table energy_review_cases (
 id uuid primary key default gen_random_uuid(),
 building_id uuid not null references buildings(id),
 minutes integer not null check(minutes in(15,60,1440)),
 parent_device_id uuid not null references devices(id),
 first_window_id uuid not null references energy_comparison_windows(id),
 latest_window_id uuid not null references energy_comparison_windows(id),
 status text not null default 'open' check(status in('open','acknowledged','resolved')),
 version integer not null default 1 check(version>0),
 ticket_id uuid unique references support_tickets(id),
 job_id uuid references jobs(id),
 acknowledged_by uuid references profiles(id),
 acknowledged_at timestamptz,
 resolved_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check(status<>'resolved' or resolved_at is not null)
);
alter table energy_review_cases enable row level security;
revoke all on energy_review_cases from public,anon,authenticated;
create unique index energy_review_active on energy_review_cases(building_id,minutes) where status<>'resolved';
create index energy_review_history on energy_review_cases(building_id,created_at desc);

$sc_source_81abbed950b6e2f983349d29967f398f636dcd4568dcae81088219ca16ad3d2c$;
    INSERT INTO public.schema_migrations(name,sha256) VALUES('046_energy_review_cases.sql','81abbed950b6e2f983349d29967f398f636dcd4568dcae81088219ca16ad3d2c');
  END IF;
END $sc_step_45$;

COMMIT;
