-- Migration: Add Income Table and Payment Method Fields
-- Description: Add table for recording daily additional income and payment method tracking for expenses & income
-- Date: 2026-03-01

-- Create transaction_payment_method enum (shared between expenses and incomes)
CREATE TYPE transaction_payment_method AS ENUM ('CASH', 'QRIS');

-- Create income_category enum
CREATE TYPE income_category AS ENUM ('SERVICE', 'REFUND', 'OTHER');

-- Add payment_method field to expenses table
ALTER TABLE expenses 
ADD COLUMN payment_method transaction_payment_method NOT NULL DEFAULT 'CASH';

-- Create incomes table (mirror structure of expenses but for income)
CREATE TABLE incomes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    description TEXT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    category income_category NOT NULL DEFAULT 'OTHER',
    payment_method transaction_payment_method NOT NULL DEFAULT 'CASH',
    date TIMESTAMP NOT NULL,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_incomes_user_id ON incomes(user_id);
CREATE INDEX idx_incomes_date ON incomes(date);
CREATE INDEX idx_incomes_category ON incomes(category);
CREATE INDEX idx_incomes_payment_method ON incomes(payment_method);

-- Create additional indexes for expenses
CREATE INDEX idx_expenses_payment_method ON expenses(payment_method);

-- Add comments to table
COMMENT ON TABLE incomes IS 'Table for recording daily additional income (services, refunds, etc)';
COMMENT ON COLUMN incomes.user_id IS 'Admin who recorded the income';
COMMENT ON COLUMN incomes.description IS 'Description of the income (e.g., Service charge)';
COMMENT ON COLUMN incomes.amount IS 'Amount in rupiah';
COMMENT ON COLUMN incomes.category IS 'Category: SERVICE, REFUND, or OTHER';
COMMENT ON COLUMN incomes.payment_method IS 'Payment method: CASH or QRIS';
COMMENT ON COLUMN incomes.date IS 'Date when the income was received';
COMMENT ON COLUMN incomes.notes IS 'Additional notes about the income';

COMMENT ON COLUMN expenses.payment_method IS 'Payment method: CASH or QRIS';

-- Verify the migration
-- SELECT * FROM pg_type WHERE typname IN ('transaction_payment_method', 'income_category');
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'expenses';
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'incomes';
