-- Migration: Add discount fields to orders table
-- Description: Store subtotal and discount details for POS orders
-- Date: 2026-02-18

ALTER TABLE orders
    ADD COLUMN subtotal_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    ADD COLUMN discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    ADD COLUMN discount_percent DECIMAL(5, 2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN orders.subtotal_amount IS 'Total before discount';
COMMENT ON COLUMN orders.discount_amount IS 'Discount amount in rupiah';
COMMENT ON COLUMN orders.discount_percent IS 'Discount percent (0-100)';
