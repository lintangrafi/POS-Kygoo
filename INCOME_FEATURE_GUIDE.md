# Feature Guide - Income & Payment Method Tracking

## Overview
Panduan lengkap untuk fitur **Income** (pemasukan tambahan harian) dan **Payment Method Tracking** (CASH/QRIS) yang terintegrasi dengan sistem Expenses untuk perhitungan finansial yang akurat.

---

## 📚 Fitur-Fitur Baru

### 1. **Income Management** ✨
Fitur untuk mencatat pemasukan tambahan harian selain dari ordernya, seperti:
- Service charge / tip
- Refund reversal
- Bonus atau komisi tambahan
- Sumber pemasukan lainnya

### 2. **Payment Method Tracking** 🏦
Semua transaksi (income & expenses) dapat dipilih metode pembayarannya:
- **CASH** - Pembayaran tunai
- **QRIS** - Pembayaran digital/transfer

### 3. **Net Daily Income Calculation** 📊
Perhitungan penghasilan bersih harian otomatis:
```
NET DAILY INCOME = 
  (Cash Income + Cash Additional Income - Cash Expenses) +
  (QRIS Income + QRIS Additional Income - QRIS Expenses)

Formula:
  Net Profit = Gross Profit (Turnover - COGS) - Total Expenses + Total Additional Income
```

### 4. **Daily Cashflow Breakdown** 💰
Detail cashflow per hari dengan breakdown:
- Cash Income dari orders
- QRIS Income dari orders
- Cash Additional Income
- QRIS Additional Income
- Cash Expenses
- QRIS Expenses
- Net Cash Balance
- Net QRIS Balance
- Total Daily Net Income

---

## 🔧 Database Schema

### New Tables

#### `incomes` Table
Mirip dengan `expenses` tapi untuk pemasukan:
```sql
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
```

**Categories:**
- `SERVICE` - Service charge / tip
- `REFUND` - Refund reversal
- `OTHER` - Lainnya

**Payment Methods:**
- `CASH` - Tunai
- `QRIS` - Digital

### Updated Tables

#### `expenses` Table
Tambahan field untuk tracking payment method:
```sql
ALTER TABLE expenses 
ADD COLUMN payment_method transaction_payment_method NOT NULL DEFAULT 'CASH';
```

---

## 📋 File-File yang Dimodifikasi/Ditambahkan

### Backend (Server Actions)
1. **`src/actions/income-actions.ts`** - CRUD operations untuk income
   - `getIncomes()` - Fetch income records
   - `addIncome()` - Menambah income baru
   - `updateIncome()` - Update income
   - `deleteIncome()` - Hapus income

2. **`src/actions/expense-actions.ts`** - Updated untuk support payment method
   - `addExpense()` - Sekarang include `paymentMethod` parameter
   - `updateExpense()` - Sekarang include `paymentMethod` parameter

3. **`src/actions/report-actions.ts`** - Enhanced untuk perhitungan lengkap
   - `getFinancialReport()` - Extended untuk include incomes dan payment breakdown
   - `getDailyCashflow()` - **BARU** - Detail cashflow per hari dengan CASH/QRIS breakdown

### Frontend (Components)
1. **`src/components/reports/IncomeManagement.tsx`** - **BARU**
   - Form untuk menambah income
   - List income dengan delete functionality
   - Payment method selection (CASH/QRIS)
   - Category selection (SERVICE/REFUND/OTHER)

2. **`src/components/reports/ExpenseManagement.tsx`** - Updated
   - Tambahan payment method field
   - Payment method badge display (CASH/QRIS)
   - Updated form dialog

### Pages
1. **`src/app/(dashboard)/reports/page.tsx`** - Updated
   - Import IncomeManagement component
   - Fetch incomes dan daily cashflow data
   - Tambahan card untuk Additional Income
   - Tambahan card untuk Expenses & Income by Payment Method
   - Daily Cashflow Detail table

### Database
1. **`migrations/add_income_table_and_payment_method.sql`** - **BARU**
   - Migration untuk menambah incomes table
   - Menambah payment_method field ke expenses
   - Membuat enums baru

### Schema
1. **`src/db/schema.ts`** - Updated
   - `transactionPaymentMethodEnum` - Enum untuk CASH/QRIS
   - `incomeCategoryEnum` - Enum untuk income categories
   - `incomes` table definition
   - `incomes relations`

---

## 🚀 Setup Instructions

### Step 1: Migrate Database
Pilih salah satu cara:

#### Option A: Menggunakan Drizzle ORM (Recommended)
```bash
cd d:\Project\POS-Kygo-V2
npm run db:push
```

#### Option B: Manual SQL Migration
```bash
# Koneksi ke PostgreSQL
psql -h localhost -U postgres -d kygodb

# Jalankan migration
\i 'D:/Project/POS-Kygo-V2/migrations/add_income_table_and_payment_method.sql'

# Verify
\d incomes
\d expenses
```

### Step 2: Update Server Actions
Semua file sudah disiapkan:
- ✅ `src/actions/income-actions.ts` - Created
- ✅ `src/actions/expense-actions.ts` - Updated
- ✅ `src/actions/report-actions.ts` - Updated

### Step 3: Update Components
Semua component sudah disiapkan:
- ✅ `src/components/reports/IncomeManagement.tsx` - Created
- ✅ `src/components/reports/ExpenseManagement.tsx` - Updated
- ✅ `src/app/(dashboard)/reports/page.tsx` - Updated

### Step 4: Done! 🎉
Fitur siap digunakan.

---

## 📖 Usage Examples

### Menambah Expense dengan Payment Method
```typescript
import { addExpense } from '@/actions/expense-actions';

await addExpense({
    description: "Beli es untuk mixer",
    amount: 50000,
    category: "SUPPLIES",
    paymentMethod: "CASH",  // ← New parameter
    date: new Date(),
    notes: "Es untuk keperluan harian"
});
```

### Menambah Income dengan Payment Method
```typescript
import { addIncome } from '@/actions/income-actions';

await addIncome({
    description: "Service charge dari order",
    amount: 25000,
    category: "SERVICE",
    paymentMethod: "QRIS",  // ← CASH atau QRIS
    date: new Date(),
    notes: "Service charge digital order"
});
```

### Mengambil Financial Report (Extended)
```typescript
import { getFinancialReport } from '@/actions/report-actions';

const report = await getFinancialReport({
    from: new Date('2026-03-01'),
    to: new Date('2026-03-31')
});

// Report sekarang include:
// - totalIncomes: Total pemasukan tambahan
// - incomesByMethod: { CASH, QRIS }
// - totalExpenses
// - expensesByMethod: { CASH, QRIS }
// - netProfit: Calculated sebagai Gross Profit - Expenses + Incomes
```

### Mengambil Daily Cashflow
```typescript
import { getDailyCashflow } from '@/actions/report-actions';

const cashflow = await getDailyCashflow({
    from: new Date('2026-03-01'),
    to: new Date('2026-03-31')
});

// Result:
// [{
//     date: "2026-03-01",
//     ordersTotal: 1500000,
//     cashIncome: 800000,
//     qrisIncome: 700000,
//     cashAdditional: 50000,           // dari income
//     qrisAdditional: 25000,           // dari income
//     cashExpenses: 75000,
//     qrisExpenses: 25000,
//     netCash: 775000,                 // income + additional - expenses
//     netQris: 700000,
//     netDailyIncome: 1475000         // total net
// }, ...]
```

---

## 📊 Reports Page Changes

### Cards Added
1. **Additional Income** - Total pemasukan tambahan
2. **Expenses & Income by Payment Method** - 4 cards breakdown:
   - Cash Expenses
   - QRIS Expenses
   - Cash Additional Income
   - QRIS Additional Income

### New Table: Daily Cashflow Detail
Menampilkan breakdown per hari dengan columns:
- Date
- Orders Total
- Cash Income (dari orders)
- QRIS Income (dari orders)
- Cash Additional Income (dari incomes)
- QRIS Additional Income (dari incomes)
- Cash Expenses
- QRIS Expenses
- Net Cash (Income + Additional - Expenses)
- Net QRIS (Income + Additional - Expenses)
- Daily Net (Total net income)

### Updated Cards
- **Expenses Card** - Tetap sama
- **Net Profit Card** - Description diupdate menjadi "Gross Profit - Expenses + Additional Income"

---

## 🔐 Permissions

Sama seperti expenses:
- Hanya **ADMIN** dan **SUPERADMIN** yang bisa menambah/edit/hapus income dan expense
- Semua transaksi di-log dalam audit logs

---

## 💡 Business Logic & Calculations

### Formula Perhitungan Net Profit:
```
NET PROFIT = (Turnover - COGS) - Total Expenses + Total Additional Income

Where:
- Turnover = Total penjualan orders
- COGS = Cost of Goods Sold (HPP)
- Total Expenses = Sum dari semua expenses (CASH + QRIS)
- Total Additional Income = Sum dari semua incomes (CASH + QRIS)
```

### Formula Per Payment Method:
```
NET CASH = (Order Cash Income + Cash Additional Income) - Cash Expenses
NET QRIS = (Order QRIS Income + QRIS Additional Income) - QRIS Expenses

NET DAILY INCOME = NET CASH + NET QRIS
```

### Integrasi dengan Existing System:
✅ Expenses sudah terintegrasi - tinggal tambah payment method tracking
✅ Income adalah fitur tambahan yang terpisah
✅ Daily cashflow otomatis menggabungkan order payments dengan income/expenses
✅ Net profit calculation automatically includes income

---

## 🎯 Key Features Summary

| Feature | Status | Details |
|---------|--------|---------|
| Income Management | ✅ Active | Add/Edit/Delete income dengan categories |
| Payment Method Tracking | ✅ Active | CASH/QRIS for both income & expenses |
| Daily Cashflow Report | ✅ Active | Detailed breakdown per hari |
| Net Income Calculation | ✅ Active | Automatic based on orders + income - expenses |
| Audit Logging | ✅ Active | Semua transaksi income/expense tercatat |
| Admin Only Access | ✅ Active | Only ADMIN/SUPERADMIN yang bisa manage |

---

## ✅ Verification Checklist

After setup, verify:

- [ ] Database migration berhasil (tables & enums created)
- [ ] Income Management component muncul di reports page
- [ ] Bisa menambah expense dengan payment method selection
- [ ] Bisa menambah income dengan payment method selection
- [ ] Daily Cashflow table menampilkan data dengan benar
- [ ] Net Profit calculation include additional income
- [ ] Expense & Income by Payment Method cards menampilkan breakdown yang benar
- [ ] Audit logs mencatat income/expense creation

---

## 🐛 Troubleshooting

### Migration fails
```
ERROR: type "transaction_payment_method" already exists
```
**Solution**: Type sudah ada. Skip step ini atau drop dulu:
```sql
DROP TYPE IF EXISTS transaction_payment_method CASCADE;
```

### Component tidak muncul
- Check imports di reports page
- Verify file paths
- Clear Next.js cache: `rm -rf .next`

### Payment method tidak tersimpan
- Verify database column exist
- Check schema.ts untuk enum definitions
- Run `npm run db:push` lagi

---

## 📞 Support

Untuk pertanyaan atau issues:
1. Check DATABASE_MIGRATION_GUIDE.md
2. Lihat contoh di `src/actions/`
3. Review component implementation

---

**Last Updated**: March 1, 2026
**Feature Version**: 1.0
