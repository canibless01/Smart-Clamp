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
