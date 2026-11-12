-- Live runtime requirements. No sample users, readings, stock, prices or balances.
alter table private.device_credentials drop constraint if exists device_credentials_pkey;
alter table private.device_credentials add primary key (device_id,key_epoch,direction);
alter table devices add column policy_epoch integer not null default 1;
alter table devices add column prepaid_enforced boolean not null default false;
alter table devices add column public_token_hash text unique;
alter table devices add column next_command_seq bigint not null default 0;
alter table devices add column relay_observed boolean;
alter table devices add column relay_observed_at timestamptz;
alter table devices add column supply_state text not null default 'unknown';
alter table wallets add column available_mwh bigint not null default 0 check(available_mwh>=0);
alter table wallets add column reserved_mwh bigint not null default 0 check(reserved_mwh>=0);
alter table wallets add column unpaid_mwh bigint not null default 0 check(unpaid_mwh>=0);
alter table wallets add column payment_token text not null unique default encode(gen_random_bytes(24),'hex');
alter table wallets add column tariff_version text references tariffs(version);
alter table quotes add column wallet_id uuid references wallets(id);
alter table quotes add column currency text not null default 'NGN';
alter table quotes add column request_hash text;
alter table payments add column checkout_url text;
alter table payments add column provider_response jsonb;
alter table payments add column credited_at timestamptz;
alter table payments add column version integer not null default 1;
alter table subscriptions alter column status set default 'pending';
alter table subscriptions drop constraint subscriptions_status_check;
alter table subscriptions add constraint subscriptions_status_check check(status in ('pending','active','past_due','cancelled','expired','grace'));
alter table device_viewers add column revoked_at timestamptz;
alter table idempotency_keys add column owner_scope text;
create unique index idempotency_owner_key on idempotency_keys(coalesce(payer_id::text,'public'),scope,key);
create unique index only_active_room_occupancy on occupancies(room_id) where end_at is null;
create unique index topology_active_child on topology_edges(child_device_id) where valid_to is null;
create unique index usage_chain_once on usage_event_chain(reading_id);
create table usage_postings (
 reading_id uuid primary key references readings(id), wallet_id uuid references wallets(id),
 consumed_mwh bigint not null check(consumed_mwh>=0), funded_mwh bigint not null check(funded_mwh>=0),
 created_at timestamptz not null default now()
);
create table user_preferences(user_id uuid primary key references profiles(id),value jsonb not null default '{}',version int not null default 1,updated_at timestamptz not null default now());
create table step_up_challenges (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references profiles(id),
 operation_hash text not null check(operation_hash ~ '^[0-9a-f]{64}$'),scope_ids uuid[] not null,
 expires_at timestamptz not null default now()+interval '5 minutes',attempts int not null default 0,
 verified_at timestamptz,used_at timestamptz,created_at timestamptz not null default now()
);
create table provider_events (
 provider text not null,reference text not null,kind text not null,body_hash text not null,
 payload jsonb not null,status text not null default 'received',created_at timestamptz not null default now(),
 primary key(provider,reference,kind)
);
create table orders (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references profiles(id),profile device_role not null,
 service_address text not null,contact_phone text not null,notes text,status text not null default 'requested',
 version int not null default 1,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table manual_readings (
 id uuid primary key default gen_random_uuid(),linked_meter_id uuid not null references linked_meters(id),
 entered_by uuid not null references profiles(id),reading_kwh numeric(18,6) not null check(reading_kwh>=0),
 recorded_at timestamptz not null,created_at timestamptz not null default now()
);
create table report_preferences(user_id uuid primary key references profiles(id),auto_delivery_enabled boolean not null default false,frequency text not null default 'monthly');
alter table notifications add column dedupe_key text unique;
create table command_grants (
 id uuid primary key default gen_random_uuid(),challenge_id uuid not null references step_up_challenges(id),
 user_id uuid not null references profiles(id),device_id uuid not null references devices(id),
 expires_at timestamptz not null,revoked_at timestamptz
);
create table schedule_occurrences(schedule_id uuid not null references schedules(id),occurrence_at timestamptz not null,command_id uuid references commands(command_id),primary key(schedule_id,occurrence_at));
create unique index off_reasons_scope on off_reasons(device_id,reason,coalesce(scope,''));
-- Replace the recursive and overly broad prototype RLS. Browser writes are not allowed.
do $$ declare r record; begin
 for r in select tablename,policyname from pg_policies where schemaname='public' loop
  execute format('drop policy %I on public.%I',r.policyname,r.tablename);
 end loop;
 for r in select tablename from pg_tables where schemaname='public' loop
  execute format('alter table public.%I enable row level security',r.tablename);
 end loop;
end $$;
revoke all on all tables in schema public from anon,authenticated;
revoke all on all tables in schema private from public,anon,authenticated;
revoke all on schema private from public,anon,authenticated;
-- API uses a backend-only database connection and authorizes each query. Private browser reads are
-- intentionally disabled until audited nonrecursive Realtime projections are implemented.
grant select on profiles to authenticated;
create policy own_profile on profiles for select to authenticated using(id=auth.uid());
grant select on notifications to authenticated;
create policy own_notifications on notifications for select to authenticated using(recipient_id=auth.uid());
-- Existing prototype globally enabled analytics must not imply entitlement or verification.
update feature_flags set enabled_globally=false,version=version+1;
