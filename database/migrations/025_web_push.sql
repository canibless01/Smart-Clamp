CREATE TABLE push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id),
  endpoint_hash text NOT NULL UNIQUE,
  encrypted_subscription text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE push_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES notifications(id),
  subscription_id uuid NOT NULL REFERENCES push_subscriptions(id),
  status text NOT NULL DEFAULT 'queued' CHECK(status IN('queued','unknown','provider_accepted','failed','expired','opted_out')),
  dispatched_at timestamptz,
  last_error text,
  UNIQUE(notification_id,subscription_id)
);
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON push_subscriptions,push_deliveries FROM anon,authenticated;
