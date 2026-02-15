-- Common SQL Queries for Expenses Table
-- Use these queries for manual database operations

-- ===== SELECT QUERIES =====

-- 1. Get all expenses for a specific date
SELECT * FROM expenses
WHERE DATE(date) = '2026-02-15'
ORDER BY created_at DESC;

-- 2. Get expenses for a date range
SELECT * FROM expenses
WHERE date >= '2026-02-15'::timestamp
  AND date < '2026-02-16'::timestamp
ORDER BY date DESC;

-- 3. Get expenses by category
SELECT category, COUNT(*) as count, SUM(amount) as total_amount
FROM expenses
WHERE DATE(date) = '2026-02-15'
GROUP BY category;

-- 4. Get all expenses with user info
SELECT e.id, e.description, e.amount, e.category, e.date, e.notes, u.name as user_name
FROM expenses e
LEFT JOIN users u ON e.user_id = u.id
WHERE DATE(e.date) = '2026-02-15'
ORDER BY e.date DESC;

-- 5. Get total expenses for a period
SELECT SUM(amount) as total_expenses
FROM expenses
WHERE date >= '2026-02-01'::timestamp
  AND date < '2026-03-01'::timestamp;

-- 6. Get daily expense summary
SELECT DATE(date) as expense_date, COUNT(*) as count, SUM(amount) as total_amount
FROM expenses
WHERE date >= '2026-02-01'::timestamp
  AND date < '2026-02-16'::timestamp
GROUP BY DATE(date)
ORDER BY DATE(date) DESC;

-- 7. Get expenses with financial impact on daily reports
SELECT 
  DATE(date) as expense_date,
  SUM(CASE WHEN category = 'SUPPLIES' THEN amount ELSE 0 END) as supplies,
  SUM(CASE WHEN category = 'UTILITIES' THEN amount ELSE 0 END) as utilities,
  SUM(CASE WHEN category = 'MAINTENANCE' THEN amount ELSE 0 END) as maintenance,
  SUM(CASE WHEN category = 'OTHER' THEN amount ELSE 0 END) as other,
  SUM(amount) as total
FROM expenses
WHERE date >= '2026-02-01'::timestamp
  AND date < '2026-02-16'::timestamp
GROUP BY DATE(date)
ORDER BY DATE(date) DESC;

-- ===== INSERT QUERIES =====

-- 1. Insert a single expense
INSERT INTO expenses (user_id, description, amount, category, date, notes)
VALUES (1, 'Bought ice', 5000, 'SUPPLIES', '2026-02-15'::timestamp, 'For daily needs');

-- 2. Insert multiple expenses
INSERT INTO expenses (user_id, description, amount, category, date, notes)
VALUES 
  (1, 'Electricity bill', 50000, 'UTILITIES', '2026-02-15'::timestamp, NULL),
  (1, 'Water refill', 15000, 'UTILITIES', '2026-02-15'::timestamp, NULL),
  (2, 'Equipment maintenance', 75000, 'MAINTENANCE', '2026-02-14'::timestamp, 'Fixed compressor'),
  (1, 'Cleaning supplies', 25000, 'SUPPLIES', '2026-02-15'::timestamp, NULL);

-- ===== UPDATE QUERIES =====

-- 1. Update an expense
UPDATE expenses
SET description = 'Updated description', notes = 'Updated notes'
WHERE id = 1;

-- 2. Update amount and category
UPDATE expenses
SET amount = 5500, category = 'SUPPLIES'
WHERE id = 1;

-- ===== DELETE QUERIES =====

-- 1. Delete a specific expense
DELETE FROM expenses WHERE id = 1;

-- 2. Delete all expenses for a specific date
DELETE FROM expenses WHERE DATE(date) = '2026-02-15';

-- 3. Delete expenses by category
DELETE FROM expenses WHERE category = 'OTHER' AND DATE(date) = '2026-02-15';

-- ===== MAINTENANCE QUERIES =====

-- 1. Check table structure
\d expenses

-- 2. View all enum values for category
SELECT enum_range(NULL::expense_category);

-- 3. Count total expenses in system
SELECT COUNT(*) as total_expenses, SUM(amount) as total_amount
FROM expenses;

-- 4. Find duplicate or suspicious entries (expenses added in last 5 minutes)
SELECT * FROM expenses
WHERE created_at > NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC;

-- 5. Get expenses statistics by category
SELECT 
  category,
  COUNT(*) as expense_count,
  SUM(amount) as total_amount,
  AVG(amount) as avg_amount,
  MIN(amount) as min_amount,
  MAX(amount) as max_amount
FROM expenses
GROUP BY category
ORDER BY total_amount DESC;

-- 6. Verify referential integrity
SELECT e.id, e.user_id, u.name
FROM expenses e
LEFT JOIN users u ON e.user_id = u.id
WHERE u.id IS NULL;

-- 7. Export data for external analysis (with headers)
-- Run with: psql -h host -U user -d database -c "COPY (SELECT ...) TO STDOUT WITH (FORMAT CSV, HEADER)"
COPY (
  SELECT 
    id, 
    u.name as user_name,
    description,
    amount,
    category,
    date,
    notes,
    created_at
  FROM expenses e
  LEFT JOIN users u ON e.user_id = u.id
  WHERE date >= '2026-02-01'::timestamp
    AND date < '2026-02-16'::timestamp
  ORDER BY date DESC
) TO STDOUT WITH (FORMAT CSV, HEADER);
