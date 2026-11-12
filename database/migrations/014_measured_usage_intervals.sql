ALTER TABLE usage_postings ADD COLUMN interval_start_ms bigint;
ALTER TABLE usage_postings ADD COLUMN accounting_quality text NOT NULL DEFAULT 'unavailable' CHECK(accounting_quality IN('measured','unavailable'));
