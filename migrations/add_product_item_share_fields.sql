-- Add per-item revenue share config on products and sale snapshot on order items
-- Date: 2026-04-20

ALTER TABLE products
ADD COLUMN IF NOT EXISTS organizer_share_type TEXT;

ALTER TABLE products
ADD COLUMN IF NOT EXISTS organizer_share_value NUMERIC(12, 2);

ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS organizer_share_at_sale NUMERIC(12, 2) NOT NULL DEFAULT 0;
