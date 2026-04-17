-- Migration: Add event_id to products table
-- Description: Enable event-specific product management in inventory and POS
-- Date: 2026-04-17

ALTER TABLE products
ADD COLUMN event_id INTEGER REFERENCES events(id);

CREATE INDEX idx_products_event_id ON products(event_id);
