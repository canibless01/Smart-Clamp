-- Transition memory prevents repeated audible alerts for the same recorded condition.
create table device_experience_state (
 device_id uuid not null references devices(id),
 signal_key text not null,
 state text not null,
 observed_at timestamptz not null,
 primary key(device_id,signal_key)
);
alter table device_experience_state enable row level security;
revoke all on device_experience_state from anon,authenticated;
