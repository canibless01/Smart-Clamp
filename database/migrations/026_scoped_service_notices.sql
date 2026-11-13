CREATE TABLE organization_notice_grants (
  organization_id uuid PRIMARY KEY REFERENCES organizations(id),
  enabled boolean NOT NULL,
  expires_at timestamptz NOT NULL,
  reviewed_by uuid NOT NULL REFERENCES profiles(id),
  review_note text NOT NULL CHECK(length(review_note) BETWEEN 10 AND 2000),
  version integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE service_notice_previews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES profiles(id),
  organization_id uuid REFERENCES organizations(id),
  title text NOT NULL,
  message text NOT NULL,
  channels jsonb NOT NULL,
  device_ids uuid[] NOT NULL,
  recipient_ids uuid[] NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT now()+interval '5 minutes',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE service_notice_dispatches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  preview_id uuid NOT NULL UNIQUE REFERENCES service_notice_previews(id),
  actor_id uuid NOT NULL REFERENCES profiles(id),
  recipient_count integer NOT NULL CHECK(recipient_count BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE FUNCTION keep_service_notice() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Service notice records are immutable'; END $$;
CREATE TRIGGER immutable_service_notice_preview BEFORE UPDATE OR DELETE ON service_notice_previews FOR EACH ROW EXECUTE FUNCTION keep_service_notice();
CREATE TRIGGER immutable_service_notice_dispatch BEFORE UPDATE OR DELETE ON service_notice_dispatches FOR EACH ROW EXECUTE FUNCTION keep_service_notice();
ALTER TABLE organization_notice_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_notice_previews ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_notice_dispatches ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON organization_notice_grants,service_notice_previews,service_notice_dispatches FROM anon,authenticated;
