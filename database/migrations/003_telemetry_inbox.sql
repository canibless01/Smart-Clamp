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
