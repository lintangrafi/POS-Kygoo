-- Migration: Add Open Bill tables for suspended POS transactions
-- Description: Allow cashier to save, resume, and close bills later
-- Date: 2026-03-06

-- Create open bill status enum
CREATE TYPE open_bill_status AS ENUM ('OPEN', 'PARTIAL', 'CLOSED', 'VOID');

-- Main open bills table
CREATE TABLE open_bills (
    id SERIAL PRIMARY KEY,
    bill_number TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    customer_name TEXT,
    note TEXT,
    subtotal_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    discount_percent DECIMAL(5, 2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    paid_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    status open_bill_status NOT NULL DEFAULT 'OPEN',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMP
);

-- Bill item snapshots
CREATE TABLE open_bill_items (
    id SERIAL PRIMARY KEY,
    open_bill_id INTEGER NOT NULL REFERENCES open_bills(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    price_at_bill DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Helpful indexes
CREATE INDEX idx_open_bills_status ON open_bills(status);
CREATE INDEX idx_open_bills_user_id ON open_bills(user_id);
CREATE INDEX idx_open_bills_created_at ON open_bills(created_at);
CREATE INDEX idx_open_bill_items_open_bill_id ON open_bill_items(open_bill_id);

COMMENT ON TABLE open_bills IS 'Saved POS bills that can be resumed and paid later';
COMMENT ON TABLE open_bill_items IS 'Snapshot of products in each open bill';
