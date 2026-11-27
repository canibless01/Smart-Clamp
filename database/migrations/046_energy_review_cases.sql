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
