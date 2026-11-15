CREATE TABLE service_areas (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name text NOT NULL CHECK(length(name) BETWEEN 1 AND 100),
 region text NOT NULL CHECK(length(region) BETWEEN 1 AND 80),
 created_by uuid NOT NULL REFERENCES profiles(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(region,name)
);
CREATE TABLE device_service_areas (
 device_id uuid PRIMARY KEY REFERENCES devices(id),
 area_id uuid NOT NULL REFERENCES service_areas(id),
 assigned_by uuid NOT NULL REFERENCES profiles(id),
 version integer NOT NULL DEFAULT 1,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE bill_responsibilities (
 bill_id uuid NOT NULL REFERENCES bills(id),
 user_id uuid NOT NULL REFERENCES profiles(id),
 assigned_by uuid NOT NULL REFERENCES profiles(id),
 review_note text NOT NULL CHECK(length(review_note) BETWEEN 10 AND 2000),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(bill_id,user_id)
);
ALTER TABLE service_notice_previews ADD COLUMN audience_criteria jsonb;
CREATE TABLE service_notice_recipient_work (
 dispatch_id uuid NOT NULL REFERENCES service_notice_dispatches(id),
 recipient_id uuid NOT NULL REFERENCES profiles(id),
 status text NOT NULL DEFAULT 'queued' CHECK(status IN('queued','committed','skipped')),
 reason text,
 processed_at timestamptz,
 PRIMARY KEY(dispatch_id,recipient_id)
);
ALTER TABLE service_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_service_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_responsibilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_notice_recipient_work ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON service_areas,device_service_areas,bill_responsibilities,service_notice_recipient_work FROM anon,authenticated;
