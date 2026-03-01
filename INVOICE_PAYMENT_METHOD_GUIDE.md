# Invoice Payment Method Tracking - Implementation Guide

## 📋 Overview
Invoice pages sekarang menampilkan **Payment Method** yang dipilih saat transaksi di POS, dengan support untuk:
- Single payment method (CASH atau QRIS)
- Split Bill (multiple payment methods dengan breakdown per metode)

---

## ✨ Fitur-Fitur Baru

### 1. **Invoice List with Payment Method Column**
Di `/invoices` page, sekarang ada kolom baru **Payment Method** yang menampilkan:
- Badge untuk setiap payment method (CASH/QRIS/TRANSFER)
- Warna berbeda untuk visual distinction:
  - **CASH** → Green badge
  - **QRIS** → Blue badge
  - **TRANSFER** → Gray badge
- Multiple badges jika split bill

### 2. **Expanded Invoice Detail**
Saat expand invoice di list, payment breakdown terlihat dengan:
- Setiap payment method listed dengan badge
- Amount untuk setiap payment method
- "Split Bill" indicator jika ada multiple payment methods

### 3. **Detailed Invoice Page** (`/invoices/[id]`)
Invoice detail page punya **Payment Method Card** baru yang menampilkan:
- Detailed payment breakdown
- Badge untuk setiap payment method
- "Split Bill" section dengan jumlah metode yang digunakan
- Total amount verification

---

## 🔧 Implementation Details

### Files Modified:
1. **`src/app/(dashboard)/invoices/InvoiceListClient.tsx`**
   - ✅ Tambah kolom "Payment Method" di table header
   - ✅ Display payment badges di table row
   - ✅ Payment breakdown di expanded row
   - ✅ Update colSpan untuk expanded row (8 → 9)

2. **`src/app/(dashboard)/invoices/[id]/page.tsx`**
   - ✅ Tambah "Payment Method" Card section
   - ✅ Display payment breakdown dengan badges
   - ✅ Split Bill indicator dan validation

### Files Unchanged (tapi digunakan):
- **`src/actions/admin-actions.ts`**
  - `getOrders()` - Sudah include `payments: true`
  - `getOrderById()` - Sudah include `payments: true`

---

## 📊 Visual Layout

### Invoice List Page
```
┌────┬──────────┬──────────┬──────────┬────────┬────────────────┬──────────┬─────────┬─────────┐
│    │ Invoice  │ Time     │ Cashier  │ Status │ Payment Method │ Discount │ Total   │ Actions │
├────┼──────────┼──────────┼──────────┼────────┼────────────────┼──────────┼─────────┼─────────┤
│ ▼  │ INV001   │ 10:30    │ Budi     │ COMPL  │ [CASH] [QRIS]  │ 50,000   │ 500,000 │ View... │
│    │          │          │          │        │                │          │         │         │
│    ├─ Items:  │          │          │        │                │          │         │         │
│    │  - Prod1 │          │          │        │                │          │         │         │
│    │  - Prod2 │          │          │        │                │          │         │         │
│    │ Payment:                                                                      │
│    │  [CASH] Rp 300,000                                                           │
│    │  [QRIS] Rp 200,000                                                           │
│    │  Split Bill (2 methods)                                                      │
└────┴──────────┴──────────┴──────────┴────────┴────────────────┴──────────┴─────────┴─────────┘
```

### Invoice Detail Page
```
Invoice #INV001
│
├─ Items Table
│  └─ Product list
│
├─ Totals
│  └─ Subtotal, Discount, Total
│
└─ Payment Method Card
   ├─ [CASH] Rp 300,000
   ├─ [QRIS] Rp 200,000
   └─ Split Bill (2 methods) → Rp 500,000
```

---

## 💻 Code Examples

### Accessing Payment Data in Components
```typescript
// Payment data sudah tersedia di order object
const order = await getOrderById(id);

// Access payments
order.payments.map(payment => ({
    method: payment.method,      // 'CASH', 'QRIS', 'TRANSFER'
    amount: payment.amount        // Decimal string
}));
```

### Split Bill Detection
```typescript
const isSplitBill = order.payments && order.payments.length > 1;

if (isSplitBill) {
    console.log(`Split Bill dengan ${order.payments.length} metode`);
    // Display split bill indicator
}
```

---

## 🎨 Badge Styling

Payment method badges menggunakan Tailwind classes:

| Method | Class | Color |
|--------|-------|-------|
| CASH | `bg-green-100 text-green-800` | Green |
| QRIS | `bg-blue-100 text-blue-800` | Blue |
| TRANSFER | `bg-gray-100 text-gray-800` | Gray |

---

## 📈 Database Relations

Payment data diambil dari existing schema:
```typescript
// From src/db/schema.ts
export const payments = pgTable('payments', {
    id: serial('id').primaryKey(),
    orderId: integer('order_id').references(() => orders.id).notNull(),
    method: paymentMethodEnum('method').notNull(),  // CASH, QRIS, TRANSFER
    amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

**Existing Enum:**
```typescript
export const paymentMethodEnum = pgEnum('payment_method', ['CASH', 'QRIS', 'TRANSFER']);
```

---

## ✅ Features:

- ✅ Single payment method display
- ✅ Multiple payment methods (Split Bill)
- ✅ Payment breakdown with amounts
- ✅ Visual badges untuk payment methods
- ✅ Color-coded distinction (CASH/QRIS/TRANSFER)
- ✅ Split Bill indicator
- ✅ Total verification

---

## 🔗 Related Features

### Fitur yang sudah integrated:
- ✅ Income & Expenses dengan payment method (CASH/QRIS)
- ✅ Daily Cashflow tracking
- ✅ Net income calculation

### Fitur yang belum (optional):
- Invoice printing dengan payment info
- Payment reconciliation report
- Payment method settlement tracking

---

## 🚀 Testing Checklist

- [ ] Buka `/invoices` page
- [ ] Lihat Payment Method column
- [ ] Expand salah satu invoice
- [ ] Lihat payment breakdown di expanded row
- [ ] Klik "View" untuk buka invoice detail
- [ ] Verifikasi Payment Method Card menampilkan data
- [ ] Test split bill (invoice dengan multiple payment methods)
- [ ] Verifikasi total sesuai (sum dari semua payments = total amount)

---

## 📝 Notes

### Data Availability:
- Payment data tersedia untuk semua orders (existing di database)
- Tidak ada schema migration diperlukan
- Menggunakan existing `paymentMethodEnum`

### Browser Support:
- Works on all modern browsers
- Responsive design untuk mobile
- Badge styling auto-adjust

### Performance:
- Data fetching sudah optimized (use dengan Drizzle relations)
- No N+1 queries
- Minimal rendering overhead

---

## 🔄 Integration with Income Tracking

Payment method tracking di invoices terintegrasi dengan:
- **Income Feature**: Additional income tracked by CASH/QRIS
- **Expense Feature**: Operational expenses tracked by CASH/QRIS
- **Daily Cashflow**: Complete cash flow breakdown per payment method

Ini membentuk **complete financial tracking system** dengan:
```
Order Payments (CASH/QRIS/TRANSFER)
     ↓
Invoice Payment Method Display
     ↓
Daily Cashflow Tracking
     ↓
Net Income = Sales - Expenses + Additional Income
```

---

**Last Updated**: March 1, 2026
**Status**: ✅ Complete
