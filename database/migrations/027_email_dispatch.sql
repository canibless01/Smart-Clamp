CREATE TABLE email_dispatches (
  notification_id uuid PRIMARY KEY REFERENCES notifications(id),
  encrypted_request text NOT NULL,
  request_sha256 text NOT NULL,
  first_attempt_at timestamptz,
  retry_until timestamptz,
  credential_fingerprint text,
  CHECK ((first_attempt_at IS NULL)=(retry_until IS NULL))
);
CREATE FUNCTION keep_email_request() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.notification_id<>OLD.notification_id OR NEW.encrypted_request<>OLD.encrypted_request OR NEW.request_sha256<>OLD.request_sha256 THEN
    RAISE EXCEPTION 'Email request identity is immutable';
  END IF;
  IF OLD.first_attempt_at IS NOT NULL AND
    (NEW.first_attempt_at IS DISTINCT FROM OLD.first_attempt_at OR NEW.retry_until IS DISTINCT FROM OLD.retry_until OR NEW.credential_fingerprint IS DISTINCT FROM OLD.credential_fingerprint) THEN
    RAISE EXCEPTION 'Email dispatch window is immutable';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER immutable_email_request BEFORE UPDATE ON email_dispatches FOR EACH ROW EXECUTE FUNCTION keep_email_request();
ALTER TABLE email_dispatches ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON email_dispatches FROM anon,authenticated;
