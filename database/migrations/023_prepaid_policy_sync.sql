-- Signed volume allowances do not depend on a stale cloud balance or wall clock.
-- Activation remains a separate qualified installation decision, never a subscription flag.
ALTER TABLE devices ADD COLUMN persistent_counter_qualified boolean NOT NULL DEFAULT false;
ALTER TABLE devices ADD COLUMN prepaid_policy_qualified boolean NOT NULL DEFAULT false;
ALTER TABLE devices ADD COLUMN meter_counter_epoch integer NOT NULL DEFAULT 1 CHECK(meter_counter_epoch>0);
ALTER TABLE devices ADD COLUMN prepaid_anchor_mwh bigint CHECK(prepaid_anchor_mwh>=0);
ALTER TABLE devices ADD COLUMN next_credit_policy_seq bigint NOT NULL DEFAULT 0;
CREATE TABLE device_credit_policies (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),device_id uuid NOT NULL REFERENCES devices(id),
 seq bigint NOT NULL,body jsonb NOT NULL,body_sha256 text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(device_id,seq)
);
CREATE TABLE device_credit_policy_receipts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),policy_id uuid NOT NULL REFERENCES device_credit_policies(id),
 inbox_id uuid NOT NULL UNIQUE REFERENCES device_inbox(id),
 result text NOT NULL CHECK(result IN ('accepted','rejected')),
 reason_code text NOT NULL,import_mwh bigint CHECK(import_mwh>=0),
 observed_at_ms bigint,clock_quality text NOT NULL CHECK(clock_quality IN ('trusted','estimated','unknown')),
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE device_credit_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_credit_policy_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON device_credit_policies,device_credit_policy_receipts FROM anon,authenticated;
CREATE TRIGGER immutable_credit_policy BEFORE UPDATE OR DELETE ON device_credit_policies FOR EACH ROW EXECUTE FUNCTION private.immutable_record();
CREATE TRIGGER immutable_credit_policy_receipt BEFORE UPDATE OR DELETE ON device_credit_policy_receipts FOR EACH ROW EXECUTE FUNCTION private.immutable_record();
CREATE FUNCTION private.protect_credit_anchor() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF (NEW.prepaid_anchor_mwh,NEW.meter_counter_epoch) IS DISTINCT FROM (OLD.prepaid_anchor_mwh,OLD.meter_counter_epoch)
  AND EXISTS(SELECT 1 FROM public.device_credit_policies WHERE device_id=OLD.id) THEN
  RAISE EXCEPTION 'issued prepaid allowance: replacement/counter reset requires reviewed decommissioning';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER protect_credit_anchor BEFORE UPDATE ON devices FOR EACH ROW EXECUTE FUNCTION private.protect_credit_anchor();

CREATE INDEX credit_policy_receipts_timeline ON device_credit_policy_receipts(policy_id,observed_at_ms DESC,created_at DESC);
