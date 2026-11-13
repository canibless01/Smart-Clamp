-- Firmware artifacts are private, immutable and signed. A staged download is not a healthy boot.
ALTER TABLE devices ADD COLUMN firmware_secure_version integer NOT NULL DEFAULT 0 CHECK (firmware_secure_version>=0);
ALTER TABLE devices ADD COLUMN firmware_sha256 text CHECK (firmware_sha256 ~ '^[0-9a-f]{64}$');
ALTER TABLE devices ADD COLUMN ota_qualified boolean NOT NULL DEFAULT false;
CREATE TABLE firmware_artifacts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), profile device_role NOT NULL,
 board text NOT NULL, version text NOT NULL, secure_version integer NOT NULL CHECK(secure_version>0),
 image bytea NOT NULL CHECK(octet_length(image) BETWEEN 1024 AND 2097152),
 sha256 text NOT NULL CHECK(sha256 ~ '^[0-9a-f]{64}$'), size_bytes integer NOT NULL,
 manifest jsonb NOT NULL, signature text NOT NULL, key_id text NOT NULL,
 created_by uuid NOT NULL REFERENCES profiles(id), created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(profile,board,secure_version), CHECK(octet_length(image)=size_bytes)
);
CREATE TRIGGER immutable_firmware_artifacts BEFORE UPDATE OR DELETE ON firmware_artifacts
 FOR EACH ROW EXECUTE FUNCTION private.immutable_record();
CREATE TABLE firmware_rollouts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), artifact_id uuid NOT NULL REFERENCES firmware_artifacts(id),
 status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','paused','completed','cancelled')),
 wave integer NOT NULL DEFAULT 0 CHECK(wave BETWEEN 0 AND 3), version integer NOT NULL DEFAULT 1,
 created_by uuid NOT NULL REFERENCES profiles(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE firmware_targets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), rollout_id uuid NOT NULL REFERENCES firmware_rollouts(id),
 device_id uuid NOT NULL REFERENCES devices(id), ordinal integer NOT NULL, wave integer,
 status text NOT NULL DEFAULT 'waiting' CHECK(status IN ('waiting','pending','offered','staged','boot_confirmed','failed','rolled_back','cancelled')),
 offered_boot_id text, offered_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(rollout_id,device_id), UNIQUE(rollout_id,ordinal)
);
CREATE UNIQUE INDEX firmware_one_active_target ON firmware_targets(device_id) WHERE status IN ('waiting','pending','offered','staged');
CREATE TABLE firmware_receipts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), target_id uuid NOT NULL REFERENCES firmware_targets(id),
 inbox_id uuid NOT NULL UNIQUE REFERENCES device_inbox(id), result text NOT NULL,
 reason_code text NOT NULL, boot_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(target_id,result)
);
CREATE TRIGGER immutable_firmware_receipts BEFORE UPDATE OR DELETE ON firmware_receipts
 FOR EACH ROW EXECUTE FUNCTION private.immutable_record();
ALTER TABLE firmware_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE firmware_rollouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE firmware_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE firmware_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON firmware_artifacts,firmware_rollouts,firmware_targets,firmware_receipts FROM anon,authenticated;
