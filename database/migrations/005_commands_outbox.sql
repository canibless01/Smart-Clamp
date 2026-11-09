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
