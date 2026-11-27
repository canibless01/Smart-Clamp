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
