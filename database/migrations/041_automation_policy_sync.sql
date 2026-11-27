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
