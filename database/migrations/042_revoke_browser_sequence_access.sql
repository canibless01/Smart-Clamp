-- Browser roles cannot manipulate backend audit/evidence identity counters.
-- Backend database owners retain their own privileges. RLS is not a sequence boundary.
revoke all on sequence public.audit_log_id_seq,public.usage_event_chain_id_seq from public,anon,authenticated;
-- Also prevent browser grants on future sequences created by the migration owner.
alter default privileges in schema public revoke all on sequences from public,anon,authenticated;
