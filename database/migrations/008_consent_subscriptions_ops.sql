-- 008_flags_consent_subscriptions_jobs_inventory_payouts_ops

-- Consent: utility control
create table if not exists consents (
  id uuid primary key default gen_random_uuid(),
  device_id uuid references devices(id),
  actor_id uuid not null references profiles(id),
  utility text not null, -- named utility/capability
  capability text not null,
  disclosure_version text not null,
  accepted_at timestamptz not null default now(),
  revoked_at timestamptz,
  policy_epoch int not null default 1,
  unique(actor_id, device_id, utility, capability, policy_epoch)
);
create index idx_consents_device_active on consents(device_id, revoked_at) where revoked_at is null;
alter table consents enable row level security;
create policy consents_select on consents for select using (
  actor_id=auth.uid() or
  exists(select 1 from memberships where user_id=auth.uid() and role in ('internal_ops','internal_superadmin','nepa_staff') and revoked_at is null)
);

-- Subscriptions
create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  plan subscription_tier not null,
  cadence text not null check (cadence in ('monthly','quarterly','yearly')),
  status text not null default 'active' check (status in ('active','past_due','cancelled','expired','grace')),
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz not null default now() + interval '30 days',
  grace_until timestamptz,
  entitlement_validity jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, plan)
);
alter table subscriptions enable row level security;
create policy subs_select on subscriptions for select using (user_id=auth.uid() or exists(select 1 from memberships where user_id=auth.uid() and role in ('internal_finance','internal_superadmin') and revoked_at is null));

-- Jobs: installer field jobs
create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  device_id uuid references devices(id),
  building_id uuid references buildings(id),
  assignee_id uuid references profiles(id),
  status text not null default 'open' check (status in ('open','assigned','in_progress','diagnostic_failed','awaiting_online','commissioned','commissioning_failed','rma')),
  priority text not null default 'normal',
  opened_at timestamptz not null default now(),
  due_at timestamptz,
  completed_at timestamptz,
  created_by uuid references profiles(id)
);
alter table jobs enable row level security;
create policy jobs_select on jobs for select using (
  assignee_id=auth.uid() or created_by=auth.uid() or exists(select 1 from memberships where user_id=auth.uid() and role in ('internal_ops','internal_superadmin') and revoked_at is null)
);

-- Inventory movements (not raw stock overwrite)
create table if not exists inventory_items (
  id uuid primary key default gen_random_uuid(),
  sku text unique not null,
  name text not null,
  stock int not null default 0 check (stock >=0),
  reorder_point int not null default 10,
  created_at timestamptz not null default now()
);
create table if not exists inventory_movements (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references inventory_items(id),
  quantity int not null, -- positive inbound, negative outbound
  reason text not null,
  shipment_cost_kobo bigint,
  supplier text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- Compliance tracker
create table if not exists compliance_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  status text not null default 'pending' check (status in ('pending','compliant','expired','waived')),
  expiry_date date,
  owner text,
  created_at timestamptz not null default now()
);

-- Episodes/alerts (tamper, outage, etc.)
create table if not exists episodes (
  id uuid primary key default gen_random_uuid(),
  cause text not null,
  source text not null,
  confidence numeric(4,3) not null check (confidence between 0 and 1),
  topology_scope jsonb not null,
  start_at timestamptz not null,
  end_at timestamptz,
  coverage numeric(5,2),
  dedupe_key text unique not null,
  status text not null default 'open' check (status in ('open','resolved','false_positive')),
  resolution text,
  reviewer_id uuid references profiles(id),
  created_at timestamptz not null default now()
);
alter table episodes enable row level security;
create policy episodes_select on episodes for select using (
  exists(select 1 from memberships where user_id=auth.uid() and revoked_at is null)
);

-- Notifications: deduped episode delivery
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid references episodes(id),
  template_key text not null,
  recipient_id uuid references profiles(id),
  channel text not null check (channel in ('in_app','sms','push','email','ussd')),
  status text not null default 'queued' check (status in ('queued','sent','provider_accepted','delivered','failed','unknown')),
  payload jsonb not null,
  provider_reference text,
  attempts int not null default 0,
  created_at timestamptz not null default now(),
  unique(episode_id, recipient_id, template_key, channel)
);

-- Incidents (ops)
create table if not exists incidents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  cause text not null,
  scope jsonb not null,
  status text not null default 'open' check (status in ('open','assigned','reviewed','resolved','reopened')),
  assignee_id uuid references profiles(id),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
alter table incidents enable row level security;
create policy incidents_select on incidents for select using (
  exists(select 1 from memberships where user_id=auth.uid() and revoked_at is null)
);

-- Audit log: immutable
create table if not exists audit_log (
  id bigserial primary key,
  actor_id uuid references profiles(id),
  action text not null,
  target_type text,
  target_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);
alter table audit_log enable row level security;
create policy audit_select on audit_log for select using (
  exists(select 1 from memberships where user_id=auth.uid() and role in ('internal_superadmin','internal_ops') and revoked_at is null)
);


-- Operational records are entered by authorized staff. No fabricated stock or expiry dates.
