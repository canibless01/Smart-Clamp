ALTER TABLE reports ADD COLUMN public_key_pem text;
CREATE FUNCTION private.protect_report_snapshot() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF (to_jsonb(OLD)-'revoked_at') IS DISTINCT FROM (to_jsonb(NEW)-'revoked_at') THEN
  RAISE EXCEPTION 'immutable report: only revocation may change';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER immutable_report_snapshot BEFORE UPDATE ON reports FOR EACH ROW EXECUTE FUNCTION private.protect_report_snapshot();
CREATE TRIGGER no_report_delete BEFORE DELETE ON reports FOR EACH ROW EXECUTE FUNCTION private.immutable_record();
CREATE TABLE export_files (
 export_id uuid PRIMARY KEY REFERENCES exports(id),
 content bytea NOT NULL CHECK(octet_length(content)<=4194304),
 sha256 text NOT NULL CHECK(sha256 ~ '^[0-9a-f]{64}$'), content_type text NOT NULL
);
ALTER TABLE export_files ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON export_files FROM anon,authenticated;
CREATE TRIGGER immutable_export_files BEFORE UPDATE OR DELETE ON export_files FOR EACH ROW EXECUTE FUNCTION private.immutable_record();
-- Indexed listing metadata; canonical bytes remain the signed source of truth.
ALTER TABLE reports ADD COLUMN period_start timestamptz;
ALTER TABLE reports ADD COLUMN period_end timestamptz;
CREATE INDEX reports_owner_issued ON reports(created_by,issued_at DESC);
