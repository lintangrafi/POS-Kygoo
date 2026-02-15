-- Migration: Add Expenses Table
-- Description: Add table for recording daily operational expenses
-- Date: 2026-02-15

-- Create expense_category enum
CREATE TYPE expense_category AS ENUM ('SUPPLIES', 'UTILITIES', 'MAINTENANCE', 'OTHER');

-- Create expenses table
CREATE TABLE expenses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    description TEXT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    category expense_category NOT NULL DEFAULT 'OTHER',
    date TIMESTAMP NOT NULL,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_category ON expenses(category);

-- Add comment to table
COMMENT ON TABLE expenses IS 'Table for recording daily operational expenses';
COMMENT ON COLUMN expenses.user_id IS 'Admin who recorded the expense';
COMMENT ON COLUMN expenses.description IS 'Description of the expense (e.g., Bought ice)';
COMMENT ON COLUMN expenses.amount IS 'Amount in rupiah';
COMMENT ON COLUMN expenses.category IS 'Category: SUPPLIES, UTILITIES, MAINTENANCE, or OTHER';
COMMENT ON COLUMN expenses.date IS 'Date when the expense occurred';
COMMENT ON COLUMN expenses.notes IS 'Additional notes about the expense';
