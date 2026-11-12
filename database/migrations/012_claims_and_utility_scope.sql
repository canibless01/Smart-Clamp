-- Single-use package codes are separate from the device authentication keys.
CREATE TABLE device_claims (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 device_id uuid NOT NULL REFERENCES devices(id),
 token_sha256 text NOT NULL UNIQUE CHECK (token_sha256 ~ '^[0-9a-f]{64}$'),
 expires_at timestamptz NOT NULL,
 created_by uuid NOT NULL REFERENCES profiles(id),
 used_by uuid REFERENCES profiles(id), used_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE utility_device_scopes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES organizations(id),
 device_id uuid NOT NULL REFERENCES devices(id),
 granted_by uuid NOT NULL REFERENCES profiles(id),
 granted_at timestamptz NOT NULL DEFAULT now(), revoked_at timestamptz,
 UNIQUE(organization_id,device_id)
);
ALTER TABLE device_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE utility_device_scopes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON device_claims,utility_device_scopes FROM anon,authenticated;
CREATE TABLE device_signals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 device_id uuid NOT NULL REFERENCES devices(id),
 inbox_id uuid NOT NULL UNIQUE REFERENCES device_inbox(id),
 kind text NOT NULL CHECK (kind IN ('tamper','protection')),
 occurred_at_ms bigint, clock_quality text NOT NULL,
 received_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE device_signals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON device_signals FROM anon,authenticated;
ALTER TABLE jobs ADD COLUMN kind text NOT NULL DEFAULT 'installation' CHECK(kind IN ('installation','repair','inspection'));
