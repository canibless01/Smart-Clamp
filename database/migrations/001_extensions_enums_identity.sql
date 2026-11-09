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
