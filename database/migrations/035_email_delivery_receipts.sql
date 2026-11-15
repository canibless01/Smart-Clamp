-- Provider acceptance and recipient-server delivery are separate facts.
alter table email_dispatches add column webhook_tag uuid not null default gen_random_uuid() unique;
alter table email_dispatches add column delivery_state text not null default 'unknown'
  check(delivery_state in ('unknown','sent','delayed','delivered','failed','suppressed','bounced','complained'));
alter table email_dispatches add column delivery_event_at timestamptz;
create table email_delivery_events (
  event_id text primary key check(char_length(event_id)<=200),
  body_sha256 text not null,
  provider_reference text not null,
  event_type text not null,
  occurred_at timestamptz not null,
  recipient_hash text not null,
  notification_id uuid references notifications(id),
  disposition text not null default 'unmatched' check(disposition in ('unmatched','matched','recipient_mismatch','reference_mismatch')),
  received_at timestamptz not null default now()
);
create index idx_email_receipt_unmatched on email_delivery_events(provider_reference) where disposition='unmatched';
create table email_suppressions (
  address_hash text primary key,
  reason text not null check(reason in ('bounced','complained','suppressed')),
  notification_id uuid not null references notifications(id),
  created_at timestamptz not null default now()
);
alter table email_delivery_events enable row level security;
alter table email_suppressions enable row level security;
revoke all on email_delivery_events,email_suppressions from anon,authenticated;
