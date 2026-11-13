-- Pin the quoted vending destination so reassociation cannot redirect a paid purchase.
ALTER TABLE quotes ADD COLUMN destination_meter_id uuid REFERENCES linked_meters(id);
ALTER TABLE quotes ADD COLUMN destination_meter_number text;
ALTER TABLE quotes ADD COLUMN destination_service_id text;
CREATE TABLE building_payment_destinations (
 building_id uuid PRIMARY KEY REFERENCES buildings(id),
 linked_meter_id uuid NOT NULL REFERENCES linked_meters(id),
 tariff_version text NOT NULL REFERENCES tariffs(version),
 configured_by uuid NOT NULL REFERENCES profiles(id), configured_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE building_payment_destinations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON building_payment_destinations FROM anon,authenticated;
CREATE UNIQUE INDEX one_room_device ON devices(room_id) WHERE room_id IS NOT NULL;
