ALTER TABLE email_dispatches ADD COLUMN encrypted_provider_request text;
CREATE FUNCTION keep_provider_payload() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.encrypted_provider_request IS NOT NULL AND NEW.encrypted_provider_request IS DISTINCT FROM OLD.encrypted_provider_request THEN
    RAISE EXCEPTION 'Submitted provider payload is immutable';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER immutable_submitted_email BEFORE UPDATE ON email_dispatches FOR EACH ROW EXECUTE FUNCTION keep_provider_payload();
