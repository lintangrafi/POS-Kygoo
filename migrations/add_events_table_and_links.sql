-- Migration: Add Events Table and event_id links
-- Description: Add event master and link order/expense/income transactions to one event
-- Date: 2026-04-16

CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT events_date_range_check CHECK (start_date <= end_date)
);

ALTER TABLE orders
ADD COLUMN event_id INTEGER REFERENCES events(id);

ALTER TABLE expenses
ADD COLUMN event_id INTEGER REFERENCES events(id);

ALTER TABLE incomes
ADD COLUMN event_id INTEGER REFERENCES events(id);

CREATE INDEX idx_events_active_dates ON events(is_active, start_date, end_date);
CREATE INDEX idx_orders_event_id ON orders(event_id);
CREATE INDEX idx_expenses_event_id ON expenses(event_id);
CREATE INDEX idx_incomes_event_id ON incomes(event_id);
