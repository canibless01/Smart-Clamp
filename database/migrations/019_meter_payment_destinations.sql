-- Identical meter digits can belong to different DisCos; do not silently reuse a destination.
ALTER TABLE linked_meters DROP CONSTRAINT linked_meters_owner_id_meter_number_key;
ALTER TABLE linked_meters ADD CONSTRAINT linked_meter_owner_service_number UNIQUE(owner_id,disco_name,meter_number);
