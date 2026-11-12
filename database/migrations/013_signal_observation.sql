-- Preserve source time separately from connectivity/receipt time.
ALTER TABLE devices ADD COLUMN supply_observed_at_ms bigint;
ALTER TABLE devices ADD COLUMN supply_clock_quality text NOT NULL DEFAULT 'unknown';
ALTER TABLE device_signals ADD COLUMN active boolean NOT NULL DEFAULT true;
