-- Keep quoted units separate from actual provider-delivered energy.
ALTER TABLE payments ADD COLUMN delivered_units_mwh bigint CHECK(delivered_units_mwh>0);
CREATE TABLE energy_credit_lots (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), wallet_id uuid NOT NULL REFERENCES wallets(id),
 payment_id uuid NOT NULL UNIQUE REFERENCES payments(id),
 credited_mwh bigint NOT NULL CHECK(credited_mwh>0), cost_kobo bigint NOT NULL CHECK(cost_kobo>=0),
 remaining_mwh bigint NOT NULL CHECK(remaining_mwh>=0), remaining_cost_kobo bigint NOT NULL CHECK(remaining_cost_kobo>=0),
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(remaining_mwh<=credited_mwh AND remaining_cost_kobo<=cost_kobo)
);
ALTER TABLE energy_credit_lots ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON energy_credit_lots FROM anon,authenticated;
CREATE INDEX energy_lots_fifo ON energy_credit_lots(wallet_id,created_at,id) WHERE remaining_mwh>0;
