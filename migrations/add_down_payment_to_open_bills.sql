-- Add Down Payment (DP) fields to open_bills table
-- Allows tracking partial payments with % or Rp amount
ALTER TABLE open_bills
ADD COLUMN down_payment_amount decimal(12, 2) NOT NULL DEFAULT 0,
ADD COLUMN down_payment_percent decimal(5, 2) NOT NULL DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN open_bills.down_payment_amount IS 'Down payment amount in Rp (if down_payment_percent = 0)';
COMMENT ON COLUMN open_bills.down_payment_percent IS 'Down payment percentage (0-100, if > 0 this takes precedence over amount)';
