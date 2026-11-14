CREATE TABLE onesignal_push_accounts (
  user_id uuid NOT NULL REFERENCES profiles(id),
  app_id uuid NOT NULL,
  encrypted_alias text NOT NULL,
  PRIMARY KEY(user_id,app_id)
);
CREATE TABLE onesignal_push_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id),
  app_id uuid NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX onesignal_active_device_accounts ON onesignal_push_devices(user_id,app_id) WHERE enabled;
CREATE TABLE onesignal_push_deliveries (
  notification_id uuid PRIMARY KEY REFERENCES notifications(id),
  encrypted_request text NOT NULL,
  first_attempt_at timestamptz,
  retry_until timestamptz,
  credential_fingerprint text
);
CREATE FUNCTION keep_onesignal_payload() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.notification_id<>OLD.notification_id OR NEW.encrypted_request<>OLD.encrypted_request OR
    (OLD.first_attempt_at IS NOT NULL AND (NEW.first_attempt_at IS DISTINCT FROM OLD.first_attempt_at OR
      NEW.retry_until IS DISTINCT FROM OLD.retry_until OR NEW.credential_fingerprint IS DISTINCT FROM OLD.credential_fingerprint)) THEN
    RAISE EXCEPTION 'OneSignal dispatch identity is immutable';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER immutable_onesignal_payload BEFORE UPDATE ON onesignal_push_deliveries
 FOR EACH ROW EXECUTE FUNCTION keep_onesignal_payload();
ALTER TABLE onesignal_push_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE onesignal_push_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE onesignal_push_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON onesignal_push_accounts,onesignal_push_devices,onesignal_push_deliveries FROM anon,authenticated;
