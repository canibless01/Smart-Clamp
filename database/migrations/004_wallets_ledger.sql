-- 004_wallets_immutable_balanced_ledger_payment_vending

create table if not exists wallets (
  id uuid primary key default gen_random_uuid(),
  device_id uuid unique references devices(id),
  building_id uuid unique references buildings(id),
  linked_meter_id uuid unique references linked_meters(id),
  utility_type text not null default 'electricity' check (utility_type in ('electricity','water','gas')),
  available_kobo bigint not null default 0 check (available_kobo >=0),
  reserved_kobo bigint not null default 0 check (reserved_kobo >=0),
  ledger_version bigint not null default 0,
  updated_at timestamptz not null default now(),
  check ( (device_id is not null)::int + (building_id is not null)::int + (linked_meter_id is not null)::int =1 )
);

-- Quotes: immutable, expiring
create table if not exists quotes (
  id uuid primary key default gen_random_uuid(),
  destination_token text not null,
  amount_kobo bigint not null check (amount_kobo >=0),
  wallet_value_kobo bigint not null check (wallet_value_kobo >=0),
  markup_kobo bigint not null check (markup_kobo >=0),
  fee_kobo bigint not null check (fee_kobo >=0),
  units_mwh bigint not null check (units_mwh >=0),
  tariff_version text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  created_by uuid references profiles(id)
);

-- Payments: provider reference unique per provider+reference
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quotes(id),
  payer_id uuid references profiles(id),
  provider text not null default 'paystack',
  provider_reference text not null,
  status_token text unique not null, -- opaque payer receipt
  payment_state text not null default 'pending' check (payment_state in ('pending','verified','failed','refunded','chargeback','unknown')),
  vending_state text not null default 'not_required' check (vending_state in ('not_required','pending','confirmed','token_pending_entry','failed','unknown')),
  credit_state text not null default 'none' check (credit_state in ('reserved','available','reversed','none')),
  amount_kobo bigint not null check (amount_kobo >=0),
  units_mwh bigint not null check (units_mwh >=0),
  gateway_ref text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider, provider_reference)
);
create index idx_payments_quote on payments(quote_id);

-- Vending attempts: separate from payment money
create table if not exists vending_attempts (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payments(id),
  provider text not null,
  provider_reference text not null,
  destination text not null,
  units_mwh bigint not null,
  status text not null default 'pending' check (status in ('pending','confirmed','failed','unknown')),
  token text, -- STS token if needs entry
  response_payload jsonb,
  created_at timestamptz not null default now(),
  unique(provider, provider_reference)
);

-- Idempotency keys: 24h payer/scope+request-hash binding
create table if not exists idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  payer_id uuid,
  scope text not null,
  key text not null,
  body_hash text not null,
  response jsonb not null,
  status_code int not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours',
  unique(payer_id, scope, key)
);
create index idx_idemp_expires on idempotency_keys(expires_at);

-- Ledger: immutable, balanced per transaction
create table if not exists ledger_transactions (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references wallets(id),
  kind text not null check (kind in ('recharge','consumption','refund','reversal','payout','subscription_charge')),
  provider_reference text,
  correlation_id uuid,
  created_at timestamptz not null default now(),
  created_by uuid references profiles(id),
  unique(provider_reference)
);

create table if not exists ledger_entries (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references ledger_transactions(id) on delete cascade,
  wallet_id uuid not null references wallets(id),
  account text not null,
  direction text not null check (direction in ('debit','credit')),
  amount_kobo bigint check (amount_kobo >=0),
  energy_mwh bigint check (energy_mwh >=0),
  check ( (amount_kobo is not null)::int + (energy_mwh is not null)::int =1 ),
  created_at timestamptz not null default now()
);
create index idx_ledger_wallet on ledger_entries(wallet_id);

-- Tariffs: immutable version, no overlap per provider
create table if not exists tariffs (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  version text unique not null,
  effective_from timestamptz not null,
  effective_to timestamptz,
  day_rate_kobo_per_kwh int not null,
  night_rate_kobo_per_kwh int,
  margin_bps int not null default 0,
  rounding text not null default 'half_up',
  created_at timestamptz not null default now(),
  check (effective_to is null or effective_to > effective_from)
);

create table if not exists bills (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (subject_type in ('device','building','room')),
  subject_id uuid not null,
  period_start date not null,
  period_end date not null,
  tariff_version text not null references tariffs(version),
  amount_kobo bigint not null check (amount_kobo >=0),
  status text not null default 'unpaid' check (status in ('unpaid','paid','overdue','disputed')),
  generated_by_nepa boolean not null default false,
  created_at timestamptz not null default now(),
  check (period_end > period_start)
);

-- Payouts for agent/referrer
create table if not exists payouts (
  id uuid primary key default gen_random_uuid(),
  earner_id uuid not null references profiles(id),
  trigger_type text not null,
  trigger_reference_id uuid,
  amount_kobo bigint not null check (amount_kobo >=0),
  status text not null default 'pending' check (status in ('pending','approved','disbursed','reversed')),
  schedule_at timestamptz,
  disbursed_at timestamptz,
  created_at timestamptz not null default now()
);
