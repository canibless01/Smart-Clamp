-- Review state does not authorize wallet credits, bill edits or refunds.
alter table disputes add column version bigint not null default 1 check (version>0);
alter table dispute_resolutions add column note text check (char_length(note)<=4000);
create index idx_dispute_queue on disputes(status,created_at desc);
create function protect_dispute_evidence() returns trigger language plpgsql as $$
begin
  if (new.bill_id,new.period_start,new.period_end,new.raised_by,new.note,new.evidence_snapshot_hash,new.evidence_snapshot)
    is distinct from (old.bill_id,old.period_start,old.period_end,old.raised_by,old.note,old.evidence_snapshot_hash,old.evidence_snapshot)
  then raise exception 'Dispute evidence is immutable'; end if;
  return new;
end $$;
create trigger dispute_evidence_immutable before update on disputes for each row execute function protect_dispute_evidence();
