-- Pre-release correction: define viewer relation before functions/policies reference it.
create table if not exists device_viewers (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references devices(id) on delete cascade,
  viewer_user_id uuid not null references profiles(id),
  added_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  unique(device_id, viewer_user_id)
);

-- 007_scoped_access_policies_grants_views
-- Enable RLS on all tables and define least-privilege policies

-- Helper function: is user landlord of building?
create or replace function is_landlord_of_building(uid uuid, bid uuid)
returns boolean language sql stable as $$
  select exists(select 1 from buildings where id=bid and landlord_id=uid);
$$;

create or replace function is_tenant_in_room(uid uuid, rid uuid)
returns boolean language sql stable as $$
  select exists(select 1 from occupancies where room_id=rid and tenant_id=uid and end_at is null);
$$;

create or replace function has_viewer_grant(uid uuid, did uuid)
returns boolean language sql stable as $$
  select exists(select 1 from device_viewers where device_id=did and viewer_user_id=uid);
$$;

-- Buildings
alter table buildings enable row level security;
drop policy if exists buildings_owner on buildings;
create policy buildings_owner on buildings for all using (
  landlord_id = auth.uid() or
  exists(select 1 from memberships where user_id=auth.uid() and role in ('internal_ops','internal_superadmin') and revoked_at is null)
);
-- need SELECT for landlord
drop policy if exists buildings_select on buildings;
create policy buildings_select on buildings for select using (
  landlord_id = auth.uid() or
  is_landlord_of_building(auth.uid(), id) or
  exists(select 1 from memberships where user_id=auth.uid() and role in ('internal_ops','internal_superadmin','internal_support') and revoked_at is null)
);

-- Rooms
alter table rooms enable row level security;
drop policy if exists rooms_select on rooms;
create policy rooms_select on rooms for select using (
  exists(select 1 from buildings where buildings.id=rooms.building_id and buildings.landlord_id=auth.uid()) or
  exists(select 1 from occupancies where occupancies.room_id=rooms.id and occupancies.tenant_id=auth.uid() and occupancies.end_at is null) or
  exists(select 1 from memberships where user_id=auth.uid() and revoked_at is null and role in ('internal_ops','internal_superadmin'))
);

-- Occupancies: immutable history, no update of end_at except via landlord
alter table occupancies enable row level security;
create policy occupancies_select on occupancies for select using (
  tenant_id=auth.uid() or
  exists(select 1 from rooms join buildings on rooms.building_id=buildings.id where rooms.id=occupancies.room_id and buildings.landlord_id=auth.uid())
);

-- Devices
alter table devices enable row level security;
drop policy if exists devices_select on devices;
create policy devices_select on devices for select using (
  owner_id=auth.uid() or
  building_id in (select id from buildings where landlord_id=auth.uid()) or
  room_id in (select room_id from occupancies where tenant_id=auth.uid() and end_at is null) or
  has_viewer_grant(auth.uid(), id) or
  exists(select 1 from memberships where user_id=auth.uid() and role in ('internal_ops','internal_engineering','internal_superadmin') and revoked_at is null)
);

-- Readings
alter table readings enable row level security;
create policy readings_select on readings for select using (
  device_id in (select id from devices where owner_id=auth.uid()) or
  device_id in (select d.id from devices d join occupancies o on d.room_id=o.room_id where o.tenant_id=auth.uid() and o.end_at is null) or
  device_id in (select device_id from device_viewers where viewer_user_id=auth.uid()) or
  exists(select 1 from memberships where user_id=auth.uid() and role in ('internal_ops','internal_superadmin') and revoked_at is null)
);

-- Wallets
alter table wallets enable row level security;
create policy wallets_select on wallets for select using (
  device_id in (select id from devices where owner_id=auth.uid()) or
  building_id in (select id from buildings where landlord_id=auth.uid()) or
  exists(select 1 from memberships where user_id=auth.uid() and revoked_at is null)
);

-- Ledger: owner only + finance ops
alter table ledger_entries enable row level security;
alter table ledger_transactions enable row level security;
create policy ledger_select on ledger_entries for select using (
  wallet_id in (select id from wallets where device_id in (select id from devices where owner_id=auth.uid())) or
  exists(select 1 from memberships where user_id=auth.uid() and role in ('internal_finance','internal_superadmin') and revoked_at is null)
);

-- Payments: payer only + finance
alter table payments enable row level security;
create policy payments_select on payments for select using (
  payer_id=auth.uid() or
  exists(select 1 from memberships where user_id=auth.uid() and role in ('internal_finance','internal_superadmin') and revoked_at is null)
);

-- Disputes: scoped
alter table disputes enable row level security;
create policy disputes_select on disputes for select using (
  raised_by=auth.uid() or
  exists(select 1 from memberships where user_id=auth.uid() and role in ('internal_support','internal_ops','internal_superadmin') and revoked_at is null)
);

-- Support tickets
alter table support_tickets enable row level security;
create policy tickets_select on support_tickets for select using (
  reporter_id=auth.uid() or
  assigned_to=auth.uid() or
  exists(select 1 from memberships where user_id=auth.uid() and role in ('internal_support','internal_ops','internal_superadmin') and revoked_at is null)
);

-- Reports: owner + token holder (token checked via hash in API, not RLS broad grant)
alter table reports enable row level security;
create policy reports_select on reports for select using (
  created_by=auth.uid() or
  exists(select 1 from memberships where user_id=auth.uid() and revoked_at is null and role in ('internal_ops','internal_support'))
);

-- Realtime: only allow scoped publication
-- (Supabase Realtime uses RLS; private tables have no anonymous read)

-- Private credentials: never exposed
alter table private.device_credentials enable row level security;
-- no public policy -> deny by default; only service_role via API can read

-- Device viewers
alter table device_viewers enable row level security;
create policy viewers_select on device_viewers for select using (
  viewer_user_id=auth.uid() or added_by=auth.uid() or exists(select 1 from devices where devices.id=device_viewers.device_id and devices.owner_id=auth.uid())
);
