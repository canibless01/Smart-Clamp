-- Display manifests are signed device declarations. They do not grant actuation authority.
create table device_channel_manifests (
 device_id uuid primary key references devices(id),
 version bigint not null check(version>0),
 schema_version integer not null check(schema_version=1),
 channels jsonb not null check(jsonb_typeof(channels)='object'),
 calibration_version text not null,
 inbox_id uuid not null references device_inbox(id),
 updated_at timestamptz not null default now()
);
alter table device_channel_manifests enable row level security;
revoke all on device_channel_manifests from anon,authenticated;
