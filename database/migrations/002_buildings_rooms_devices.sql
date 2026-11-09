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
