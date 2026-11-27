-- Authenticated modem counters are separate from stored JSON size and SIM billing.
create table device_transport_reports (
 id uuid primary key default gen_random_uuid(),
 device_id uuid not null references devices(id),
 inbox_id uuid not null unique references device_inbox(id),
 counter_session text not null check(counter_session ~ '^[0-9a-f]{32}$'),
 occurred_at_ms bigint,
 clock_quality text not null check(clock_quality in('trusted','estimated','unknown')),
 received_at timestamptz not null default now(),
 rx_bytes bigint not null check(rx_bytes>=0),
 tx_bytes bigint not null check(tx_bytes>=0),
 signal_dbm integer check(signal_dbm between -150 and -20),
 network_type text not null check(network_type in('2g','3g','4g','nb_iot','unknown'))
);
alter table device_transport_reports enable row level security;
revoke all on device_transport_reports from anon,authenticated;
create index transport_device_time on device_transport_reports(device_id,occurred_at_ms desc);
