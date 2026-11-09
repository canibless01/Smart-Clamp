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
