-- Rollback Migration: Remove discount fields from orders table
-- Date: 2026-02-18

ALTER TABLE orders
    DROP COLUMN IF EXISTS discount_percent,
    DROP COLUMN IF EXISTS discount_amount,
    DROP COLUMN IF EXISTS subtotal_amount;
