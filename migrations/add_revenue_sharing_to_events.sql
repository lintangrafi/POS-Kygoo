-- Migration: Add revenue sharing fields to events table
-- Description: Enable revenue sharing configuration per event (percentage or fixed amount)
-- Date: 2026-04-17

ALTER TABLE events
ADD COLUMN revenue_share_type TEXT DEFAULT 'PERCENTAGE',
ADD COLUMN organizer_share_percent DECIMAL(5, 2),
ADD COLUMN studio_share_percent DECIMAL(5, 2),
ADD COLUMN organizer_share_fixed DECIMAL(12, 2),
ADD COLUMN studio_share_fixed DECIMAL(12, 2);

CREATE INDEX idx_events_revenue_share ON events(revenue_share_type);
