-- Rollback Migration: Remove Expenses Table
-- Use this if you need to undo the expenses table creation
-- Date: 2026-02-15

-- Drop indexes first
DROP INDEX IF EXISTS idx_expenses_category;
DROP INDEX IF EXISTS idx_expenses_date;
DROP INDEX IF EXISTS idx_expenses_user_id;

-- Drop table
DROP TABLE IF EXISTS expenses;

-- Drop enum type
DROP TYPE IF EXISTS expense_category;

-- Verify removal
-- SELECT * FROM expenses; -- Should return error: relation "expenses" does not exist
