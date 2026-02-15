# Database Migration Guide - Expenses Feature

## Overview
Dokumentasi lengkap untuk menambahkan fitur Expenses (pengeluaran harian) ke database POS Kygo.

---

## 📋 Daftar File Migration

1. **add_expenses_table.sql** - Main migration script
2. **expenses_queries.sql** - Common SQL queries untuk operasi sehari-hari
3. **rollback_expenses_table.sql** - Rollback script jika diperlukan

---

## 🚀 Cara Implementasi

### Option 1: Menggunakan Drizzle ORM (Recommended)

```bash
cd d:\Project\POS-Kygo-V2
npm run db:push
```

Drizzle akan otomatis membaca schema.ts dan membuat tabel yang diperlukan.

### Option 2: Menjalankan SQL Script Manual

#### Di PostgreSQL Client (psql)

```bash
# Koneksi ke database
psql -h localhost -U postgres -d kygodb

# Jalankan migration script
\i 'D:/Project/POS-Kygo-V2/migrations/add_expenses_table.sql'

# Verify (optional)
\d expenses
```

#### Menggunakan Database Management Tool (DBeaver, pgAdmin, dll)

1. Buka SQL Editor
2. Copy-paste isi dari `add_expenses_table.sql`
3. Execute/Run
4. Verify hasilnya

#### Menggunakan Node.js Script

```bash
# Create a migration runner script (optional)
node scripts/runMigration.js
```

---

## ✅ Verifikasi Instalasi

### 1. Check tabel ada dan struktur benar

```sql
\d expenses
```

Expected output:
```
Column     |           Type            | Collation | Nullable | Default
-----------+---------------------------+-----------+----------+---------
id         | integer                   |           | not null | nextval(...)
user_id    | integer                   |           | not null | 
description| text                      |           | not null | 
amount     | numeric(12,2)             |           | not null | 
category   | expense_category          |           | not null | 'OTHER'::...
date       | timestamp without time... |           | not null | 
notes      | text                      |           |          | 
created_at | timestamp without time... |           | not null | now()
```

### 2. Check enum type

```sql
SELECT enum_range(NULL::expense_category);
```

Expected output: `{SUPPLIES,UTILITIES,MAINTENANCE,OTHER}`

### 3. Check indexes

```sql
\di expenses*
```

Expected:
- idx_expenses_user_id
- idx_expenses_date
- idx_expenses_category

### 4. Test insert data

```sql
INSERT INTO expenses (user_id, description, amount, category, date)
VALUES (1, 'Test expense', 5000, 'SUPPLIES', NOW());

SELECT * FROM expenses WHERE description = 'Test expense';
```

---

## 📊 Tabel Structure Detail

### expenses Table

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | SERIAL | NO | nextval() | Primary Key |
| user_id | INTEGER | NO | - | Foreign Key to users(id) |
| description | TEXT | NO | - | Deskripsi pengeluaran |
| amount | DECIMAL(12,2) | NO | - | Jumlah rupiah |
| category | expense_category (ENUM) | NO | 'OTHER' | SUPPLIES, UTILITIES, MAINTENANCE, OTHER |
| date | TIMESTAMP | NO | - | Tanggal pengeluaran terjadi |
| notes | TEXT | YES | NULL | Catatan tambahan |
| created_at | TIMESTAMP | NO | NOW() | Waktu record dibuat |

### Indexes

| Index Name | Column | Purpose |
|------------|--------|---------|
| idx_expenses_user_id | user_id | Mempercepat query by admin |
| idx_expenses_date | date | Mempercepat query by date range |
| idx_expenses_category | category | Mempercepat query by category |

---

## 🔄 Operasi Umum

### Insert Expense

```sql
INSERT INTO expenses (user_id, description, amount, category, date, notes)
VALUES (1, 'Membeli es batu', 5000, 'SUPPLIES', '2026-02-15'::timestamp, NULL);
```

### Get Expenses Hari Ini

```sql
SELECT * FROM expenses
WHERE DATE(date) = CURRENT_DATE
ORDER BY date DESC;
```

### Get Daily Summary

```sql
SELECT 
  DATE(date) as expense_date,
  COUNT(*) as count,
  SUM(amount) as total_amount
FROM expenses
GROUP BY DATE(date)
ORDER BY DATE(date) DESC;
```

### Update Expense

```sql
UPDATE expenses
SET description = 'Beli es batu 10kg', amount = 7500
WHERE id = 1;
```

### Delete Expense

```sql
DELETE FROM expenses WHERE id = 1;
```

---

## ⚠️ Rollback (Jika Diperlukan)

Jika ingin menghapus fitur expenses:

```bash
# Menggunakan psql
psql -h localhost -U postgres -d kygodb -f 'D:/Project/POS-Kygo-V2/migrations/rollback_expenses_table.sql'
```

atau jalankan:

```sql
DROP INDEX IF EXISTS idx_expenses_category;
DROP INDEX IF EXISTS idx_expenses_date;
DROP INDEX IF EXISTS idx_expenses_user_id;
DROP TABLE IF EXISTS expenses;
DROP TYPE IF EXISTS expense_category;
```

---

## 🔗 Foreign Key Relationship

```
expenses.user_id → users.id
```

**Important**: Saat mendelete user, expenses mereka akan tersimpan tapi referencnya akan invalid (jika tidak ada ON DELETE CASCADE).

Untuk menambahkan cascading delete (optional):

```sql
ALTER TABLE expenses
DROP CONSTRAINT expenses_user_id_fkey;

ALTER TABLE expenses
ADD CONSTRAINT expenses_user_id_fkey
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
```

---

## 📈 Performance Tips

Untuk database besar dengan jutaan records:

### 1. Add Partial Index (untuk expenses aktif saja)

```sql
CREATE INDEX idx_expenses_recent ON expenses(date)
WHERE created_at > NOW() - INTERVAL '1 year';
```

### 2. Add Composite Index (untuk date+category queries)

```sql
CREATE INDEX idx_expenses_date_category ON expenses(date, category);
```

### 3. Analyze Query Plan

```sql
EXPLAIN ANALYZE
SELECT * FROM expenses
WHERE date >= '2026-02-01'::timestamp
  AND date < '2026-02-16'::timestamp
ORDER BY date DESC;
```

---

## 🧪 Testing

### Test Data Generator

```sql
-- Insert 100 test expenses untuk Feb 2026
INSERT INTO expenses (user_id, description, amount, category, date, notes)
SELECT 
  1 as user_id,
  'Test expense ' || (ROW_NUMBER() OVER ()) as description,
  (RANDOM() * 100000)::numeric(12,2) as amount,
  (ARRAY['SUPPLIES', 'UTILITIES', 'MAINTENANCE', 'OTHER']::expense_category[])[ceil(RANDOM()*4)] as category,
  (CURRENT_DATE - RANDOM() * INTERVAL '30 days')::timestamp as date,
  'Auto-generated test data' as notes
FROM generate_series(1, 100);
```

### Verify Data

```sql
SELECT COUNT(*), SUM(amount) FROM expenses WHERE YEAR(date) = 2026;
```

---

## 📝 Application Integration

Setelah migration, aplikasi Node.js Anda sudah siap karena:

1. ✅ Schema sudah didefinisikan di `src/db/schema.ts`
2. ✅ Actions sudah dibuat di `src/actions/expense-actions.ts`
3. ✅ UI Component sudah ada di `src/components/reports/ExpenseManagement.tsx`
4. ✅ Reports page sudah diupdate

Cukup jalankan `npm run dev` dan features sudah berfungsi!

---

## 🆘 Troubleshooting

### Error: "relation 'expenses' does not exist"
**Solusi**: Migration belum dijalankan. Jalankan add_expenses_table.sql

### Error: "type 'expense_category' does not exist"
**Solusi**: Enum belum dibuat. Pastikan CREATE TYPE statement dijalankan duluan

### Error: "foreign key constraint"
**Solusi**: user_id tidak valid. Pastikan user dengan ID tersebut ada di users table

### Error: "permission denied"
**Solusi**: User database tidak punya privilege CREATE. Gunakan SUPERUSER atau ADMIN account

---

## 📚 Additional Resources

- PostgreSQL Enum Docs: https://www.postgresql.org/docs/current/datatype-enum.html
- Drizzle ORM Schema: https://orm.drizzle.team/docs/sql-schema-declaration
- Foreign Keys: https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-FK

---

## ✨ Next Steps

1. Jalankan migration script
2. Verify tabel berhasil dibuat
3. Restart `npm run dev`
4. Test expense input dari UI di Reports page
5. Verifikasi data tersimpan di database

Selesai! Fitur expenses sudah aktif 🎉
