-- Field-work completion is separate from device commissioning and installer payables.
ALTER TABLE jobs ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK (version > 0);
ALTER TABLE jobs ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE jobs DROP CONSTRAINT jobs_status_check;
ALTER TABLE jobs ADD CONSTRAINT jobs_status_check CHECK (status IN
 ('open','assigned','in_progress','diagnostic_failed','awaiting_online','commissioned','commissioning_failed','rma','closed'));
CREATE TABLE job_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 job_id uuid NOT NULL REFERENCES jobs(id),
 actor_id uuid NOT NULL REFERENCES profiles(id),
 action text NOT NULL CHECK (action IN ('assigned','started','diagnostic_failed','submitted','rma','closed','reopened')),
 from_status text NOT NULL, to_status text NOT NULL,
 assignee_id uuid REFERENCES profiles(id),
 note text NOT NULL CHECK (char_length(note) BETWEEN 10 AND 4000),
 version integer NOT NULL CHECK (version > 1),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(job_id,version)
);
CREATE INDEX job_events_timeline ON job_events(job_id,version);
ALTER TABLE job_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON job_events FROM anon,authenticated;
CREATE TRIGGER immutable_job_events BEFORE UPDATE OR DELETE ON job_events
 FOR EACH ROW EXECUTE FUNCTION private.immutable_record();
