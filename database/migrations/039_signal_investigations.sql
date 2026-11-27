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
