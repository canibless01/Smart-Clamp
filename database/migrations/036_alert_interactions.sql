-- UI acknowledgement/snooze must not overwrite a provider delivery outcome.
create table notification_interactions (
 notification_id uuid primary key references notifications(id),
 recipient_id uuid not null references profiles(id),
 acknowledged_at timestamptz,
 snoozed_until timestamptz,
 updated_at timestamptz not null default now()
);
create index idx_notification_interactions_recipient on notification_interactions(recipient_id);
alter table notification_interactions enable row level security;
revoke all on notification_interactions from anon,authenticated;
