ALTER TABLE email_dispatches ADD COLUMN provider text DEFAULT 'resend' CHECK(provider IN('resend','onesignal'));
ALTER TABLE email_dispatches ADD COLUMN provider_app_id text;
ALTER TABLE email_dispatches ADD COLUMN provider_request_id uuid NOT NULL DEFAULT gen_random_uuid();
UPDATE email_dispatches SET provider=NULL WHERE first_attempt_at IS NULL;
ALTER TABLE email_dispatches ALTER COLUMN provider DROP DEFAULT;
CREATE TABLE email_quota_counters (
  scope text NOT NULL,
  period text NOT NULL CHECK(period IN('day','month')),
  starts_on date NOT NULL,
  reserved integer NOT NULL DEFAULT 0 CHECK(reserved>=0),
  PRIMARY KEY(scope,period,starts_on)
);
CREATE TABLE email_quota_reservations (
  notification_id uuid NOT NULL REFERENCES email_dispatches(notification_id),
  scope text NOT NULL,
  day date NOT NULL,
  PRIMARY KEY(notification_id,day)
);
-- Preserve today's own previously dispatched Resend usage across this upgrade.
INSERT INTO email_quota_reservations(notification_id,scope,day)
SELECT notification_id,'resend',(first_attempt_at AT TIME ZONE 'UTC')::date
FROM email_dispatches WHERE first_attempt_at IS NOT NULL;
INSERT INTO email_quota_counters(scope,period,starts_on,reserved)
SELECT 'resend','day',day,count(*) FROM email_quota_reservations GROUP BY day;
INSERT INTO email_quota_counters(scope,period,starts_on,reserved)
SELECT 'resend','month',date_trunc('month',day)::date,count(DISTINCT notification_id)
FROM email_quota_reservations GROUP BY date_trunc('month',day)::date;
CREATE FUNCTION keep_email_provider() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.provider_request_id<>OLD.provider_request_id OR (OLD.first_attempt_at IS NOT NULL AND
    (NEW.provider IS DISTINCT FROM OLD.provider OR NEW.provider_app_id IS DISTINCT FROM OLD.provider_app_id)) THEN
    RAISE EXCEPTION 'Email provider identity is immutable after dispatch';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER immutable_email_provider BEFORE UPDATE ON email_dispatches FOR EACH ROW EXECUTE FUNCTION keep_email_provider();
ALTER TABLE email_quota_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_quota_reservations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON email_quota_counters,email_quota_reservations FROM anon,authenticated;
