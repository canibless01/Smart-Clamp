create unique index payment_quote_once on payments(quote_id);
create function private.check_ledger_balance() returns trigger language plpgsql set search_path=pg_catalog,public as $$
declare tid uuid; cash numeric; energy numeric; count_entries int;
begin
 tid:=coalesce(new.transaction_id,old.transaction_id);
 select count(*),coalesce(sum(case when direction='debit' then amount_kobo else -amount_kobo end),0),coalesce(sum(case when direction='debit' then energy_mwh else -energy_mwh end),0)
 into count_entries,cash,energy from public.ledger_entries where transaction_id=tid;
 if count_entries<2 or cash<>0 or energy<>0 then raise exception 'unbalanced ledger transaction';end if;
 return null;
end$$;
create constraint trigger ledger_must_balance after insert or update or delete on ledger_entries deferrable initially deferred for each row execute function private.check_ledger_balance();
create function private.immutable_record() returns trigger language plpgsql as $$begin raise exception 'immutable record: append a reversal instead';end$$;
create trigger immutable_ledger_entries before update or delete on ledger_entries for each row execute function private.immutable_record();
create trigger immutable_ledger_transactions before update or delete on ledger_transactions for each row execute function private.immutable_record();
create trigger immutable_raw_readings before update or delete on readings for each row execute function private.immutable_record();
create trigger immutable_audit before update or delete on audit_log for each row execute function private.immutable_record();
