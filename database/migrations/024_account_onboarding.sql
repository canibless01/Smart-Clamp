-- Verified provider identities may use email without a phone. Phone enrollment
-- is separate and must be verified before phone-dependent operations.
ALTER TABLE profiles ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE profiles ADD COLUMN email text;
ALTER TABLE profiles ADD COLUMN onboarding_completed_at timestamptz;
ALTER TABLE profiles ADD CONSTRAINT profile_contact_required CHECK (phone IS NOT NULL OR email IS NOT NULL);
CREATE UNIQUE INDEX profiles_email_unique ON profiles(lower(email)) WHERE email IS NOT NULL;

CREATE TABLE account_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id),
  terms_version text NOT NULL CHECK (length(terms_version) BETWEEN 1 AND 100),
  privacy_version text NOT NULL CHECK (length(privacy_version) BETWEEN 1 AND 100),
  accepted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id,terms_version,privacy_version)
);
CREATE FUNCTION keep_account_consent() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Consent records are immutable'; END $$;
CREATE TRIGGER immutable_account_consent BEFORE UPDATE OR DELETE ON account_consents
  FOR EACH ROW EXECUTE FUNCTION keep_account_consent();
ALTER TABLE account_consents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON account_consents FROM anon,authenticated;
-- Existing profiles have no fabricated consent or inferred completion timestamp.
