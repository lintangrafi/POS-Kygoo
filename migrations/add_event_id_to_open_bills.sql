-- Migration: Add event_id to open_bills table
-- Description: Enable event-based financial separation for open bills and draft invoices
-- Date: 2026-04-17

ALTER TABLE open_bills
ADD COLUMN event_id INTEGER REFERENCES events(id);

CREATE INDEX idx_open_bills_event_id ON open_bills(event_id);
