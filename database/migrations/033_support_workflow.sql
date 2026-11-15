-- Support status updates serialize against replies and reject stale actions.
alter table support_tickets add column version bigint not null default 1 check (version > 0);
create index idx_support_queue on support_tickets(status,opened_at desc);
