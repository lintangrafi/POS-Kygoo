# 📘 Panduan Lengkap Aplikasi POS Kygoo V2

**Versi Dokumentasi**: 2.0  
**Last Updated**: Maret 2026  
**Author**: POS Kygoo Development Team

---

## 📑 Daftar Isi

1. [Pengenalan Aplikasi](#pengenalan-aplikasi)
2. [Instalasi dan Konfigurasi](#instalasi-dan-konfigurasi)
3. [Fitur-Fitur Utama](#fitur-fitur-utama)
4. [Struktur Proyek](#struktur-proyek)
5. [Database & Schema](#database--schema)
6. [User Roles & Permissions](#user-roles--permissions)
7. [Panduan Penggunaan per Modul](#panduan-penggunaan-per-modul)
8. [API Endpoints](#api-endpoints)
9. [Development Guide](#development-guide)
10. [Troubleshooting](#troubleshooting)
11. [Deployment Guide](#deployment-guide)

---

## Pengenalan Aplikasi

### 🎯 Apa itu POS Kygoo?

**POS Kygoo** adalah aplikasi **Point-of-Sale (POS)** modern yang dirancang untuk mengelola transaksi penjualan, inventori, dan laporan keuangan dengan mudah dan efisien. Aplikasi ini dibangun dengan teknologi terkini dan focus pada user experience yang baik.

### ✨ Fitur-Fitur Utama

- **📱 POS System** - Sistem kasir modern dengan interface yang user-friendly
- **📦 Inventory Management** - Kelola stok produk, kategori, dan adjustment
- **💰 Expense Tracking** - Catat pengeluaran sehari-hari dengan kategori
- **💵 Income Tracking** - Catat pemasukan tambahan (tip, service charge, etc)
- **📊 Financial Reports** - Laporan detail tentang penjualan, profit, dan cashflow
- **👥 User Management** - Manajemen pengguna dengan role-based access control
- **⏱️ Shift Management** - Kelola shift kasir dan accountability
- **📋 Invoice Management** - View dan manage invoice dengan payment method tracking
- **🧾 Audit Log** - Tracking semua transaksi untuk audit trail

### 🛠️ Tech Stack

```
Frontend:
├── Next.js 16.1.6 (React framework)
├── React 19.2.4
├── TypeScript
├── Tailwind CSS (styling)
├── Lucide React (icons)
└── Zustand (state management)

Backend:
├── Next.js API Routes
├── Drizzle ORM (database ORM)
├── NextAuth.js (authentication)
└── PostgreSQL (database)

Tools:
├── Drizzle Kit (ORM management)
├── TailwindCSS (CSS framework)
└── PostCSS (CSS processing)
```

---

## Instalasi dan Konfigurasi

### Prerequisites

Sebelum memulai, pastikan Anda sudah menginstall:
- **Node.js** (v18 atau lebih baru)
- **npm** atau **yarn**
- **PostgreSQL** (v12 atau lebih baru) atau Neon, PlanetScale, Supabase

### Langkah-Langkah Instalasi

#### 1. Clone Repository

```bash
git clone https://github.com/lintangrafi/POS-Kygoo.git
cd POS-Kygo-V2
```

#### 2. Install Dependencies

```bash
npm ci
```

Menggunakan `npm ci` (clean install) lebih disarankan untuk memastikan versi yang tepat.

#### 3. Setup Environment Variables

Buat file `.env` di root directory dengan konten berikut:

```env
# Database Connection
DATABASE_URL="postgresql://username:password@localhost:5432/kygodb"

# Authentication
AUTH_SECRET="generate-random-string-here-32-chars-or-more"

# Environment
NODE_ENV="development"
```

**Penjelasan:**
- **DATABASE_URL**: String koneksi ke PostgreSQL. Format: `postgresql://user:password@host:port/database`
  - Untuk Neon: `postgresql://user:password@host.neon.tech:5432/database`
  - Untuk PlanetScale: `mysql://user:password@host.planetscale.com/database`
- **AUTH_SECRET**: Secret key untuk signing JWT tokens. Buat dengan command: `openssl rand -base64 32`
- **NODE_ENV**: Set `development` untuk development, `production` untuk production

#### 4. Setup Database

##### Option A: Menggunakan Drizzle Kit (Recommended)

```bash
npm run db:push
```

Command ini akan:
- Membaca schema dari `src/db/schema.ts`
- Generate migration files
- Apply migration ke database
- Create semua tabel yang diperlukan

##### Option B: Manual Production/Migration SQL

Jika ingin menjalankan migration SQL manual:

```bash
# Generate migration files terlebih dahulu
npm run db:generate

# Kemudian push ke database
npm run db:push
```

### Database Studio (Opsional)

Untuk browse dan modify database secara visual:

```bash
npm run db:studio
```

Ini akan membuka Drizzle Studio di browser, memungkinkan Anda melihat dan mengedit data langsung.

#### 5. Seed Database dengan Data Default (Opsional)

```bash
npx ts-node -r dotenv/config src/db/seed.ts
```

Data yang akan dibuat:
- **Superadmin**: `admin@kygoo.studio` / Password: `admin123`
- **Cashier**: `cashier@kygoo.studio` / Password: `admin123`
- **Categories**: STUDIO, FB, and default categories
- **Sample Products**: Beberapa produk sample untuk testing

⚠️ **Penting**: Ubah password ini di production dan jangan commit credential real ke repository.

#### 6. Jalankan Development Server

```bash
npm run dev
```

Server akan berjalan di `http://localhost:3000`

**Akses aplikasi:**
- URL: http://localhost:3000
- Login dengan kredensial dari seeder di atas

---

## Fitur-Fitur Utama

### 1. 📱 POS System

**Tujuan**: Memproses penjualan dengan cepat dan akurat

**Fitur Utama:**
- 🛒 Shopping cart dengan real-time calculation
- 🔍 Product search dan filter by category
- 💯 Smart numpad untuk input quantity
- 🏷️ Discount management (% atau amount)
- 💳 Multiple payment methods (CASH, QRIS, TRANSFER)
- 💰 Split bill support untuk pembayaran multiple methods
- 🧾 Instant receipt generation
- 📦 Real-time stock deduction

**Workflow:**
```
1. Pilih kategori produk
2. Cari dan klik produk untuk menambah ke cart
3. Adjust quantity menggunakan numpad
4. Apply discount jika ada
5. Pilih payment method(s)
6. Proses pembayaran
7. Generate invoice/receipt
```

**Common Tasks:**
- **Menambah Produk ke Cart**: Klik produk di ProductGrid
- **Mengubah Quantity**: Click product di cart, gunakan numpad untuk input quantity
- **Apply Discount**: Input discount amount/percent, apply
- **Pembayaran Split**: Pilih multiple payment methods, input amount per method

### 2. 📦 Inventory Management

**Tujuan**: Kelola stok produk dan kategori

**Fitur Utama:**
- ➕ Create product dengan SKU, nama, harga, cost price
- ✏️ Edit product details
- 🗑️ Archive/delete product
- 📊 View stock levels
- 📋 Stock adjustment tracking
- 🏷️ Category management
- 🔖 Assign product ke kategori
- 💯 Cost of goods sold (COGS) tracking

**CRUD Operations:**
- **Create Product**: [Inventory] → [Add Product] → Fill form → Save
- **Edit Product**: [Inventory] → Click product → Edit → Save
- **Adjust Stock**: [Inventory] → [Stock Adjustment] → Input adjustment value
- **Archive Product**: [Inventory] → Select product → Archive button
- **Create Category**: [Inventory] → [Categories] → Add new

**Fields Penting:**
- **SKU**: Unique identifier (opsional, untuk barcode)
- **Cost Price (HPP)**: Untuk perhitungan profit
- **Is Menu Item**: Apakah produk ditampilkan di POS menu (true) atau stock-only (false)
- **Is Archived**: Soft-delete flag

### 3. 💰 Expense Tracking

**Tujuan**: Catat semua pengeluaran untuk perhitungan profit yang akurat

**Fitur Utama:**
- ➕ Add expense dengan description dan category
- 📁 Expense categories: SUPPLIES, UTILITIES, MAINTENANCE, OTHER
- 💳 Payment method tracking (CASH, QRIS)
- 📅 Date-based filtering
- 💾 Edit/delete expense
- 📊 Daily/monthly expense summary
- 🧾 Notes/memo untuk setiap expense

**Workflow:**
```
1. Go to [Reports] → [Expense Management]
2. Click [Add Expense]
3. Select category
4. Input amount
5. Select payment method
6. Add notes (opsional)
7. Save
```

**Expense Categories:**
- **SUPPLIES**: Perlengkapan & supplies (napkin, tissue, dll)
- **UTILITIES**: Biaya operasional (listrik, air, internet)
- **MAINTENANCE**: Perbaikan & maintenance
- **OTHER**: Pengeluaran lainnya

### 4. 💵 Income Tracking

**Tujuan**: Catat pemasukan tambahan selain dari order

**Fitur Utama:**
- ➕ Add income dengan description dan category
- 📁 Income categories: SERVICE, REFUND, OTHER
- 💳 Payment method tracking (CASH, QRIS)
- 📊 Income breakdown per method
- 🔄 Refund reversal tracking
- 💵 Service charge / tip tracking

**Workflow:**
```
1. Go to [Reports] → [Income Management]
2. Click [Add Income]
3. Select category (SERVICE/REFUND/OTHER)
4. Input amount
5. Select payment method
6. Add description
7. Save
```

**Income Categories:**
- **SERVICE**: Service charge, tip, atau layanan tambahan
- **REFUND**: Refund reversal atau return related income
- **OTHER**: Pemasukan lainnya yang tidak termasuk kategori

### 5. 📊 Financial Reports

**Tujuan**: Analisis finansial dan performance bisnis

**Report Types:**

#### Daily Sales Report
```
Menampilkan:
- Total revenue hari ini
- Total discount
- Net sales
- Total orders
- Average order value
- Payment method breakdown
- Cashier performance
```

#### Profit & Loss Report
```
Rumus:
Gross Profit = Total Revenue - COGS
Net Profit = Gross Profit - Total Expenses + Total Additional Income

Breakdown:
- Revenue per category
- Cost of goods sold
- Gross profit margin
- Operating expenses
- Net income
```

#### Daily Cashflow Report
```
Menampilkan:
- Cash income dari orders
- QRIS income dari orders
- Cash additional income
- QRIS additional income
- Cash expenses
- QRIS expenses
- Net cash balance
- Net QRIS balance
- Total net income
```

#### Trend Analysis
```
- Sales trend (daily/weekly/monthly)
- Revenue trend
- Expense trend
- Profit trend
- Visualization dengan chart
```

### 6. 👥 User Management & Roles

**Roles & Permissions:**

| Role | POS | Inventory | Expense | Income | Reports | Users | Shift | Admin |
|------|-----|-----------|---------|--------|---------|-------|-------|-------|
| CASHIER | ✅ | ❌ | ❌ | ❌ | View Only | ❌ | View | ❌ |
| ADMIN | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | View |
| SUPERADMIN | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

**Management:**
- **Create User**: [Settings] → [Users] → [Add User]
- **Edit User**: Click user → Edit → Save
- **Delete User**: Click user → Delete
- **Change Password**: User bisa ubah di profile settings

### 7. ⏱️ Shift Management

**Tujuan**: Track accountability dan performance per shift

**Fitur Utama:**
- 🟢 Open shift untuk mulai session
- 🔴 Close shift untuk end session
- 📊 Shift summary (orders, revenue, expenses)
- 🧮 Cashier balance verification
- 📋 Audit trail per shift
- 💰 Cash reconciliation

**Workflow:**
```
1. Morning: Buka aplikasi → [Shift] → Click [Open Shift]
2. Input opening cash (opsional)
3. Process transactions sepanjang hari
4. Evening: Click [Close Shift]
5. Verify summary
6. Input closing cash
7. System auto-reconcile

Rumus Rekonsiliasi:
Expected Cash = Opening Balance + Daily Net Cash Income - Daily Cash Expenses
Actual Cash = Input closing cash
Difference = Actual - Expected
```

### 8. 📋 Invoice Management

**Tujuan**: View dan manage Invoice dengan detail pembayaran

**Fitur Utama:**
- 📜 List semua invoice dengan filter/search
- 🔍 Detail invoice per transaction
- 💳 Payment method breakdown
- 🎯 Split bill indicator jika ada multiple payment methods
- 📊 Invoice status tracking
- 🧾 Printable invoice

**Invoice List Features:**
- Filter by date range
- Filter by status (COMPLETED, VOID)
- Filter by payment method
- Filter by cashier
- Search by invoice number
- View payment breakdown saat expand row

**Invoice Detail:**
- Items table (product, quantity, price)
- Subtotal, discount, total
- Payment method card dengan breakdown
- Cashier & timestamp info
- Print button

---

## Struktur Proyek

### Organisasi Folder

```
POS-Kygo-V2/
├── src/                          # Source code
│   ├── app/                      # Next.js App Router
│   │   ├── (auth)/              # Auth pages (login)
│   │   ├── (dashboard)/         # Main app pages (protected)
│   │   │   ├── inventory/       # Inventory pages
│   │   │   ├── pos/             # POS pages
│   │   │   ├── reports/         # Reports pages
│   │   │   ├── invoices/        # Invoice pages
│   │   │   ├── shift/           # Shift management pages
│   │   │   └── settings/        # Settings pages
│   │   ├── api/                 # REST API endpoints
│   │   │   ├── admin/           # Admin endpoints
│   │   │   ├── inventory/       # Inventory endpoints
│   │   │   ├── pos/             # POS endpoints
│   │   │   └── reports/         # Reports endpoints
│   │   └── layout.tsx           # Root layout
│   ├── actions/                 # Server actions (Next.js)
│   │   ├── admin-actions.ts     # Admin operations
│   │   ├── auth-actions.ts      # Auth operations
│   │   ├── expense-actions.ts   # Expense CRUD
│   │   ├── income-actions.ts    # Income CRUD
│   │   ├── inventory-actions.ts # Inventory CRUD
│   │   ├── pos-actions.ts       # POS operations
│   │   ├── report-actions.ts    # Report queries
│   │   └── shift-actions.ts     # Shift operations
│   ├── components/              # Reusable React components
│   │   ├── pos/                 # POS-specific components
│   │   ├── inventory/           # Inventory-specific components
│   │   ├── reports/             # Reports-specific components
│   │   ├── shift/               # Shift-specific components
│   │   ├── layout/              # Layout components
│   │   └── ui/                  # UI primitives (button, input, etc)
│   ├── db/                      # Database
│   │   ├── schema.ts            # Drizzle schema (tables, enums)
│   │   ├── index.ts             # Database connection
│   │   └── seed.ts              # Seed script
│   ├── hooks/                   # Custom React hooks
│   ├── lib/                     # Utility functions
│   │   ├── auth.ts              # Auth utilities
│   │   └── utils.ts             # General utilities
│   ├── store/                   # Zustand stores
│   │   └── use-pos-store.ts     # POS state management
│   └── middleware.ts            # Next.js middleware
├── migrations/                  # Database migrations
│   ├── *.sql                    # Migration SQL files
│   └── meta/                    # Drizzle metadata
├── scripts/                     # Utility scripts
├── public/                      # Static assets
├── node_modules/                # Dependencies
├── .env                         # Environment variables (git-ignored)
├── .gitignore                   # Git ignore rules
├── tsconfig.json                # TypeScript config
├── tailwind.config.js           # Tailwind CSS config
├── postcss.config.js            # PostCSS config
├── drizzle.config.ts            # Drizzle config
├── next.config.js               # Next.js config
├── package.json                 # Project metadata & dependencies
└── README.md                    # Basic readme
```

### Key Directories Explained

#### `/src/app`
- Next.js App Router pages
- `(auth)/` - unauthenticated pages (login, register)
- `(dashboard)/` - authenticated/protected pages
- `api/` - REST API endpoints
- Layout components dan global styles

#### `/src/actions`
- Server-side functions (Next.js Server Actions)
- CRUD operations untuk setiap entity
- Business logic dan database queries
- Dipanggil dari client components (safe karena server-side)

#### `/src/components`
- Reusable React components
- Organized by feature (pos/, inventory/, etc)
- UI primitives dalam `ui/` folder
- No business logic (dumb components)

#### `/src/db`
- Drizzle ORM table definitions (`schema.ts`)
- Database connection setup (`index.ts`)
- Database seeding (`seed.ts`)

#### `/migrations`
- SQL migration files untuk Drizzle
- `meta/_journal.json` - tracks migration history

---

## Database & Schema

### Entities & Relationships

#### 1. Users Table

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'CASHIER',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Enum: user_role
-- Values: CASHIER, ADMIN, SUPERADMIN
```

**Usage**: Menyimpan data pengguna dan authentication

#### 2. Categories Table

```sql
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type category_type NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Enum: category_type
-- Values: STUDIO, FB (Food & Beverage)
```

**Usage**: Kategorisasi produk

#### 3. Products Table

```sql
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    category_id INTEGER NOT NULL REFERENCES categories(id),
    sku VARCHAR(50) UNIQUE,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(12, 2) NOT NULL,
    cost_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 0,
    is_menu_item BOOLEAN NOT NULL DEFAULT TRUE,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_archived ON products(is_archived);
```

**Fields:**
- `cost_price`: Untuk COGS calculation
- `is_menu_item`: true = shown di POS, false = internal stock item
- `is_archived`: Soft-delete flag

#### 4. Orders Table

```sql
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    subtotal_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    discount_percent DECIMAL(5, 2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(12, 2) NOT NULL,
    status order_status NOT NULL DEFAULT 'COMPLETED',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Enum: order_status
-- Values: COMPLETED, VOID

-- Indexes
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_created_at ON orders(created_at);
```

**Usage**: Menyimpan transaksi penjualan

#### 5. Order Items Table

```sql
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL,
    price_at_sale DECIMAL(12, 2) NOT NULL,
    cost_at_sale DECIMAL(12, 2) NOT NULL
);

-- Indexes
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
```

**Usage**: Detail items dalam setiap order (one-to-many relationship)

#### 6. Payments Table

```sql
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id),
    method payment_method NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Enum: payment_method
-- Values: CASH, QRIS, TRANSFER

-- Indexes
CREATE INDEX idx_payments_order_id ON payments(order_id);
```

**Usage**: Menyimpan payment methods per order (support split bill)

#### 7. Expenses Table

```sql
CREATE TABLE expenses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    description TEXT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    category expense_category NOT NULL DEFAULT 'OTHER',
    payment_method payment_method NOT NULL DEFAULT 'CASH',
    date TIMESTAMP NOT NULL,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Enum: expense_category
-- Values: SUPPLIES, UTILITIES, MAINTENANCE, OTHER

-- Indexes
CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_category ON expenses(category);
```

**Usage**: Menyimpan semua pengeluaran operasional

#### 8. Incomes Table

```sql
CREATE TABLE incomes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    description TEXT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    category income_category NOT NULL DEFAULT 'OTHER',
    payment_method payment_method NOT NULL DEFAULT 'CASH',
    date TIMESTAMP NOT NULL,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Enum: income_category
-- Values: SERVICE, REFUND, OTHER

-- Indexes
CREATE INDEX idx_incomes_user_id ON incomes(user_id);
CREATE INDEX idx_incomes_date ON incomes(date);
CREATE INDEX idx_incomes_category ON incomes(category);
```

**Usage**: Menyimpan pemasukan tambahan

#### 9. Open Bills Table

```sql
CREATE TABLE open_bills (
    id SERIAL PRIMARY KEY,
    bill_number VARCHAR(50) NOT NULL UNIQUE,
    invoice_number VARCHAR(50) UNIQUE,
    invoice_status VARCHAR(20) DEFAULT 'DRAFT',
    user_id INTEGER NOT NULL REFERENCES users(id),
    customer_name VARCHAR(100),
    note TEXT,
    subtotal_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    discount_percent DECIMAL(5, 2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(12, 2) NOT NULL,
    status open_bill_status NOT NULL DEFAULT 'OPEN',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Enum: open_bill_status
-- Values: OPEN, PARTIAL, CLOSED, VOID

-- Indexes
CREATE INDEX idx_open_bills_user_id ON open_bills(user_id);
CREATE INDEX idx_open_bills_status ON open_bills(status);
CREATE INDEX idx_open_bills_created_at ON open_bills(created_at);
```

**Usage**: Menyimpan transaksi yang belum selesai (suspended bills)

#### 10. Open Bill Items Table

```sql
CREATE TABLE open_bill_items (
    id SERIAL PRIMARY KEY,
    open_bill_id INTEGER NOT NULL REFERENCES open_bills(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL,
    price_at_sale DECIMAL(12, 2) NOT NULL,
    cost_at_sale DECIMAL(12, 2) NOT NULL
);

-- Indexes
CREATE INDEX idx_open_bill_items_open_bill_id ON open_bill_items(open_bill_id);
```

**Usage**: Detail items dalam open bill

#### 11. Shifts Table

```sql
CREATE TABLE shifts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    status shift_status NOT NULL DEFAULT 'OPEN',
    opening_balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
    closing_balance DECIMAL(12, 2),
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMP
);

-- Enum: shift_status
-- Values: OPEN, CLOSED

-- Indexes
CREATE INDEX idx_shifts_user_id ON shifts(user_id);
CREATE INDEX idx_shifts_status ON shifts(status);
CREATE INDEX idx_shifts_created_at ON shifts(created_at);
```

**Usage**: Menyimpan shift data untuk accountability

### Entity Relationship Diagram

```
Users (1) ──────< (many) Orders
  │
  ├──────< (many) OpenBills
  ├──────< (many) Expenses
  ├──────< (many) Incomes
  └──────< (many) Shifts

Categories (1) ──────< (many) Products

Products (1) ──────< (many) OrderItems
Products (1) ──────< (many) OpenBillItems
Products (1) ──────< (many) StockAdjustments

Orders (1) ──────< (many) OrderItems
Orders (1) ──────< (many) Payments
Orders (1) ──────< (many) DownPayments

OpenBills (1) ──────< (many) OpenBillItems
OpenBills (1) ──────< (many) OpenBillPayments
```

---

## User Roles & Permissions

### Role Matrix

| Action | CASHIER | ADMIN | SUPERADMIN |
|--------|---------|-------|-----------|
| **POS** |
| Access POS | ✅ | ✅ | ✅ |
| Process Order | ✅ | ✅ | ✅ |
| Void Order | Own only | ✅ | ✅ |
| **Inventory** |
| View Products | ✅ | ✅ | ✅ |
| Create Product | ❌ | ✅ | ✅ |
| Edit Product | ❌ | ✅ | ✅ |
| Delete Product | ❌ | ✅ | ✅ |
| Stock Adjustment | ❌ | ✅ | ✅ |
| **Reports** |
| View Reports | ❌ | ✅ | ✅ |
| View Sales Report | ❌ | ✅ | ✅ |
| View P&L | ❌ | ✅ | ✅ |
| **Expenses** |
| Add Expense | ❌ | ✅ | ✅ |
| Edit Expense | ❌ | Own only | ✅ |
| Delete Expense | ❌ | ❌ | ✅ |
| **Income** |
| Add Income | ❌ | ✅ | ✅ |
| Edit Income | ❌ | Own only | ✅ |
| Delete Income | ❌ | ❌ | ✅ |
| **Users** |
| View Users | ❌ | ✅ | ✅ |
| Create User | ❌ | ❌ | ✅ |
| Edit User | ❌ | ❌ | ✅ |
| Delete User | ❌ | ❌ | ✅ |
| **Shifts** |
| Open Shift | ✅ | ✅ | ✅ |
| Close Shift | Own only | ✅ | ✅ |
| View All Shifts | ❌ | ✅ | ✅ |
| **Admin** |
| System Settings | ❌ | ❌ | ✅ |
| View Audit Log | ❌ | ✅ | ✅ |
| Void/Delete Data | ❌ | Own only | ✅ |

### Default Users

Setelah seed database, ada 2 user default:

1. **Superadmin**
   - Email: `admin@kygoo.studio`
   - Password: `admin123`
   - Role: SUPERADMIN
   - Akses: Semua fitur

2. **Cashier**
   - Email: `cashier@kygoo.studio`
   - Password: `admin123`
   - Role: CASHIER
   - Akses: POS, basic reports (limited)

⚠️ **Penting**: Change passwords di production!

---

## Panduan Penggunaan per Modul

### A. POS Module

#### Memulai Transaksi

**Step 1: Akses POS**
```
1. Login dengan akun CASHIER atau lebih tinggi
2. Click "POS" di sidebar
3. Halaman POS akan terbuka dengan Product Grid
```

**Step 2: Add Items to Cart**
```
1. Lihat ProductGrid dengan produk-produk
2. Langsung klik produk untuk add ke cart
3. Qty default = 1
4. Produk muncul di CartSidebar (right side)
```

**Step 3: Adjust Quantity**
```
1. Click produk di CartSidebar
2. SmartNumpad akan appear
3. Input jumlah desired
4. Press OK/confirm
5. Subtotal otomatis update
```

**Step 4: Apply Discount (Optional)**
```
Option A: Discount Amount
1. Input amount di "Discount Amount" field
2. Auto-calculate jika ada

Option B: Discount Percent
1. Input percent di "Discount %" field
2. Amount auto-calculate (total * percent / 100)

Note: Discount bisa langsung dihitung tanpa extra button
```

**Step 5: Payment**
```
Single Payment:
1. Select 1 payment method (CASH/QRIS/TRANSFER)
2. Amount = Total
3. Click Pay
4. Order processed

Split Bill:
1. Click "Add Payment Method" button
2. Select first method, input amount
3. Click "Add Payment Method" lagi
4. Select second method, input remaining
5. Total must match order total
6. Click Pay
7. Order processed

Note: Multiple payment methods = split bill indicator di invoice
```

**Step 6: Order Complete**
```
- Receipt generated
- Stock auto-deducted
- Invoice created
- Order status = COMPLETED
- CartSidebar reset

Tampil Invoice Number, dapat di-print atau save
```

#### Void Order

```
Requirement: Own order atau role = ADMIN/SUPERADMIN
1. Go to Invoices
2. Find order yang ingin di-void
3. Click Void button
4. Order status = VOID
5. Stock di-restore
6. Order tidak appear di reports
```

### B. Inventory Module

#### Create Product

```
1. Click [Inventory] → [Products] → [Add Product]
2. Fill form:
   - Category: Select dari dropdown
   - SKU: Optional (untuk barcode)
   - Name: Product name
   - Price: Jual price
   - Cost Price: HPP (untuk profit calculation)
   - Is Menu Item: Centang jika tampil di POS menu
3. Click Save
4. Product muncul di grid dan POS
```

#### Edit Product

```
1. Click [Inventory] → [Products]
2. Find product dalam list
3. Click product atau click Edit button
4. Modify fields yang diperlukan
5. Click Save
6. Changes applied immediately
```

#### Stock Adjustment

```
Saat ada physical count atau damage:
1. Click [Inventory] → [Stock Adjustment]
2. Select product
3. Input adjustment value:
   - Positive = add stock
   - Negative = reduce stock
4. Add notes (reason)
5. Click Apply
6. Stock updated
7. Adjustment logged untuk audit

Formula:
New Stock = Current Stock ± Adjustment Value
```

#### Archive Product

```
Soft-delete (tidak tampil di POS lagi):
1. Click [Inventory] → [Products]
2. Find product
3. Click Archive button
4. Product hidden from menu
5. Historical data preserved

Note: Untuk unarchive, admin bisa edit archived flag di studio
```

### C. Reports Module

#### Daily Sales Report

```
How to Access:
[Reports] → (auto-load today's data)

Shows:
- Total orders count
- Gross revenue (before discount)
- Discount total
- Net sales (after discount)
- COGS total
- Gross profit
- Gross profit margin %
- Revenue by category
- Revenue by payment method
- Top products by quantity
- Top products by revenue
```

#### Profit & Loss Report

```
How to Access:
[Reports] → [P&L Report tab]

Formula:
Gross Profit = Total Revenue - COGS
Total Expenses = Sum of all expenses
Total Additional Income = Sum of all income
Net Profit = Gross Profit - Expenses + Income

Shows:
- Revenue breakdown
- COGS detail
- Gross profit & margin
- Operating expenses by category
- Additional income by category
- Final net profit
- Profit margin %
```

#### Cashflow Report

```
How to Access:
[Reports] → [Cashflow tab]

Shows:
┌─────────────────────────────────────────────┐
│ CASH Flow:                                  │
│ - Opening balance                   + XXX   │
│ - Cash sales                        + XXX   │
│ - Cash additional income            + XXX   │
│ - Cash expenses                     - XXX   │
│ = Closing cash balance              = XXX   │
│                                             │
│ QRIS Flow:                                  │
│ - Opening balance                   + XXX   │
│ - QRIS sales                        + XXX   │
│ - QRIS additional income            + XXX   │
│ - QRIS expenses                     - XXX   │
│ = Closing QRIS balance              = XXX   │
│                                             │
│ TOTAL NET:                                  │
│ = (Cash closing + QRIS closing)     = XXX   │
└─────────────────────────────────────────────┘
```

#### Trend Analysis

```
How to Access:
[Reports] → [Trend tab]

Features:
- Line chart untuk daily/weekly/monthly trends
- Multi-series:
  * Revenue trend
  * Expense trend
  * Profit trend
- Date range filter
- Hover untuk detail values
- Helps identify seasonal patterns & growth
```

### D. Expense Management

#### Add Expense

```
1. Go to [Reports] → [Expense Management]
2. Click [Add Expense]
3. Fill form:
   - Category: SUPPLIES, UTILITIES, MAINTENANCE, OTHER
   - Amount: nilai pengeluaran
   - Payment Method: CASH atau QRIS
   - Description: apa yang dibeli/digunakan
   - Date: kapan terjadi
   - Notes: optional memo
4. Click Save
5. Expense recorded dan affect P&L calculation
```

#### View Expense List

```
Features:
- Table dengan semua expenses
- Sortable & filterable
- Date range filter
- Category filter
- Payment method filter
- Edit/delete buttons
- Total amount summary
```

#### Edit/Delete Expense

```
Edit:
1. Find expense di list
2. Click Edit
3. Modify fields
4. Click Save
5. Changes applied

Delete:
1. Find expense
2. Click Delete
3. Confirm
4. Removed from system (SUPERADMIN only)
```

### E. Income Management

#### Add Income

```
1. Go to [Reports] → [Income Management]
2. Click [Add Income]
3. Fill form:
   - Category: SERVICE, REFUND, OTHER
   - Amount: nilai pemasukan
   - Payment Method: CASH atau QRIS
   - Description: sumber/tipe income
   - Date: kapan terjadi
   - Notes: optional memo
4. Click Save
5. Income recorded dan affect P&L calculation
```

#### View Income List

```
Features:
- Table dengan semua income records
- Sortable & filterable
- Date range filter
- Category filter
- Payment method filter
- Edit/delete buttons
- Total summary
- Income vs Expenses comparison
```

### F. Shift Management

#### Open Shift

```
Morning Routine:
1. Go to [Shift] page
2. Click [Open Shift] button
3. Input opening balance (cash di register) → optional tapi disarankan
4. Click Open
5. Shift status = OPEN
6. You ready to process transactions

Note: 1 shift per user, hanya 1 shift yang bisa open per user
```

#### Close Shift

```
End of Day:
1. Go to [Shift] page
2. Click [Close Shift] button
3. System shows shift summary:
   - Opening balance
   - Total orders
   - Total revenue
   - Total expenses
   - Net daily income
4. Input closing balance (count cash di register)
5. System auto-reconcile:
   - Expected Cash = Opening + Daily Net Cash
   - Actual = Input closing balance
   - Difference = Actual - Expected
6. Review reconciliation
7. Add notes jika ada
8. Click Close Shift
9. Shift locked, summary saved untuk record

Note: Closing balance harus match atau ada penjelasan untuk variance
```

#### View Shift Report

```
Untuk ADMIN/SUPERADMIN:
1. Go to [Shift]
2. Filter by date, user, status
3. View all shifts dengan summary
4. Click detail untuk expand
5. See full reconciliation & notes

Info ditampilkan:
- Opening/closing balance
- Revenue total
- Expense total
- Net cash movement
- Reconciliation status
- Discrepancy (jika ada)
```

### G. Invoice Management

#### View Invoice List

```
1. Go to [Invoices]
2. See table dengan semua invoice
3. Default status filter: COMPLETED

Available Columns:
- Invoice number
- Date/time
- Cashier name
- Status (COMPLETED/VOID)
- Payment methods (dengan badges)
- Discount
- Total amount
- Actions (View/Print/Void)

Features:
- Sort by any column
- Filter by date range
- Filter by payment method
- Filter by status
- Filter by cashier
- Search by invoice number
- Expand row untuk lihat payment breakdown
```

#### View Invoice Detail

```
1. Click invoice number atau [View] button
2. Detail page opens showing:

   Order Info:
   - Invoice number
   - Date/time
   - Cashier
   - Status

   Items Table:
   - Product name
   - SKU
   - Quantity
   - Unit price
   - Line total

   Summary:
   - Subtotal
   - Discount (amount & %)
   - Total

   Payment Methods Card:
   - List setiap payment method dengan amount
   - Split bill indicator (jika multiple methods)
   - Total reconciliation

   Actions:
   - Print button
   - Back button
   - Void button (jika authorized)
```

#### Print Invoice

```
1. Open invoice detail
2. Click [Print] button
3. Browser print dialog appears
4. Select printer atau save as PDF
5. Receipt generated dengan format terstandar:

   Format:
   ┌──────────────────────┐
   │   KYGOO POS          │
   │   Invoice #INV001    │
   │   2025-01-15 10:30   │
   ├──────────────────────┤
   │ Product A       2x50K│
   │ Product B       3x75K│
   ├──────────────────────┤
   │ Subtotal        350K │
   │ Discount  -   10% -35K│
   │ TOTAL           315K │
   ├──────────────────────┤
   │ CASH         315K    │
   │                      │
   │ Thank you!           │
   └──────────────────────┘
```

---

## API Endpoints

### Authentication Endpoints

```
POST /api/auth/login
- Body: { email, password }
- Response: { success, token, user }

POST /api/auth/logout
- Response: { success }

GET /api/auth/me
- Response: { user }
```

### Inventory APIs

```
GET /api/inventory/categories
- Get all categories
- Response: { categories: [] }

POST /api/inventory/categories
- Create category
- Body: { name, type }
- Response: { category }

GET /api/inventory/products
- Get all products (non-archived)
- Query: ?categoryId=1&skip=0&take=50
- Response: { products: [], total }

POST /api/inventory/products
- Create product
- Body: { categoryId, name, price, costPrice, sku }
- Response: { product }

PUT /api/inventory/products/[id]
- Update product
- Body: { name, price, costPrice, ... }
- Response: { product }

DELETE /api/inventory/products/[id]
- Archive product (soft-delete)
- Response: { success }

POST /api/inventory/adjustments
- Stock adjustment
- Body: { productId, adjustment, notes }
- Response: { adjustment }

GET /api/inventory/adjustments
- Get stock adjustment history
- Response: { adjustments: [] }
```

### POS APIs

```
POST /api/pos/orders
- Create order
- Body: {
    items: [{ productId, quantity, priceAtSale }],
    discountAmount,
    discountPercent,
    payments: [{ method, amount }]
  }
- Response: { order, invoiceNumber }

GET /api/pos/orders/[invoiceNumber]
- Get order detail
- Response: { order, items, payments }

PUT /api/pos/orders/[id]/void
- Void order
- Response: { success }

POST /api/pos/open-bills
- Create open bill (suspended transaction)
- Body: { items, customerName, note }
- Response: { openBill }

GET /api/pos/open-bills
- Get all open bills
- Response: { openBills: [] }

PUT /api/pos/open-bills/[id]
- Update open bill
- Body: { items, discountAmount, customerName }
- Response: { openBill }

DELETE /api/pos/open-bills/[id]
- Dismiss open bill
- Response: { success }
```

### Reports APIs

```
GET /api/reports/daily-sales
- Daily sales summary
- Query: ?date=2025-01-15
- Response: {
    totalOrders,
    grossRevenue,
    discountTotal,
    netSales,
    cogsTotal,
    grossProfit,
    profitMargin,
    byCategory: [],
    byPaymentMethod: []
  }

GET /api/reports/profit-loss
- P&L report
- Query: ?startDate=2025-01-01&endDate=2025-01-31
- Response: {
    revenue,
    cogs,
    grossProfit,
    expenses: { byCategory },
    additionalIncome: { byCategory },
    netProfit
  }

GET /api/reports/cashflow
- Cashflow report
- Query: ?date=2025-01-15
- Response: {
    cash: { income, additionalIncome, expenses, closingBalance },
    qris: { income, additionalIncome, expenses, closingBalance },
    totalNet
  }

GET /api/reports/trends
- Trend data untuk charts
- Query: ?metric=revenue&interval=daily&startDate=...&endDate=...
- Response: { data: [{ date, value }] }
```

### Expense APIs

```
GET /api/expenses
- Get all expenses
- Query: ?startDate=...&endDate=...&category=SUPPLIES
- Response: { expenses: [] }

POST /api/expenses
- Create expense
- Body: { description, amount, category, paymentMethod, date, notes }
- Response: { expense }

PUT /api/expenses/[id]
- Update expense
- Body: { description, amount, category, ... }
- Response: { expense }

DELETE /api/expenses/[id]
- Delete expense (SUPERADMIN only)
- Response: { success }
```

### Income APIs

```
GET /api/incomes
- Get all income
- Query: ?startDate=...&endDate=...&category=SERVICE
- Response: { incomes: [] }

POST /api/incomes
- Create income
- Body: { description, amount, category, paymentMethod, date, notes }
- Response: { income }

PUT /api/incomes/[id]
- Update income
- Body: { description, amount, category, ... }
- Response: { income }

DELETE /api/incomes/[id]
- Delete income (SUPERADMIN only)
- Response: { success }
```

### Shift APIs

```
POST /api/shifts/open
- Open shift
- Body: { openingBalance }
- Response: { shift }

GET /api/shifts/current
- Get current open shift
- Response: { shift }

POST /api/shifts/[id]/close
- Close shift
- Body: { closingBalance, notes }
- Response: { shift, reconciliation }

GET /api/shifts
- Get shift history
- Query: ?startDate=...&endDate=...&userId=1
- Response: { shifts: [] }
```

### Invoice APIs

```
GET /api/invoices
- Get all invoice
- Query: ?status=COMPLETED&paymentMethod=CASH
- Response: { invoices: [] }

GET /api/invoices/[invoiceNumber]
- Get invoice detail dengan payment breakdown
- Response: { order, items, payments, splitBill }
```

---

## Development Guide

### Setup Development Environment

#### 1. Prerequisites
- Node.js 18+ (check: `node --version`)
- PostgreSQL 12+ (local or remote)
- Git
- VS Code atau editor favorit

#### 2. Clone & Install

```bash
git clone https://github.com/lintangrafi/POS-Kygoo.git
cd POS-Kygo-V2
npm ci
```

#### 3. Environment Setup

```bash
# Create .env file
cp .env.example .env  # atau buat manual

# Edit .env dengan:
DATABASE_URL="postgresql://postgres:password@localhost:5432/kygodb"
AUTH_SECRET="$(openssl rand -base64 32)"
NODE_ENV="development"
```

#### 4. Database Setup

```bash
# Create database
createdb kygodb

# Apply migrations
npm run db:push

# Seed data
npx ts-node -r dotenv/config src/db/seed.ts
```

#### 5. Start Development Server

```bash
npm run dev
```

Akses http://localhost:3000 dan login dengan:
- Email: `admin@kygoo.studio`
- Password: `admin123`

### Project Structure & Conventions

#### Component Organization

```typescript
// src/components/pos/ProductGrid.tsx
import { useCallback } from 'react';
import { Button } from '@/components/ui/button';

export function ProductGrid({ 
  products,
  onSelectProduct 
}: { 
  products: IProduct[];
  onSelectProduct: (product: IProduct) => void;
}) {
  return (
    // JSX
  );
}
```

**Pattern:**
- Function components dengan TypeScript
- Props dengan interface/type
- Reusable logic dalam custom hooks

#### Server Actions

```typescript
// src/actions/inventory-actions.ts
'use server';

import { db } from '@/db';
import { products } from '@/db/schema';
import { auth } from '@/lib/auth';

export async function addProduct(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  
  const name = formData.get('name') as string;
  
  const product = await db.insert(products).values({
    name,
    // ...
  }).returning();
  
  return product[0];
}
```

**Pattern:**
- Prefix dengan `'use server'`
- Always check auth
- Use Drizzle ORM untuk queries
- Return data atau throw error

#### Database Queries

```typescript
// Using Drizzle ORM
import { db } from '@/db';
import { orders, orderItems, products } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

// Simple select
const allOrders = await db.select().from(orders);

// With filter
const todayOrders = await db
  .select()
  .from(orders)
  .where(eq(orders.status, 'COMPLETED'));

// With join
const ordersWithItems = await db
  .select()
  .from(orders)
  .leftJoin(orderItems, eq(orders.id, orderItems.orderId))
  .leftJoin(products, eq(orderItems.productId, products.id));

// Aggregation
const totalRevenue = await db
  .select({ total: sum(orders.totalAmount) })
  .from(orders);
```

**Reference:** [Drizzle Docs](https://orm.drizzle.team)

### Code Style Guide

#### Naming Conventions

```typescript
// Components: PascalCase
export function ProductGrid() {}
export function OrderForm() {}

// Functions: camelCase
export const calculateDiscount = () => {};
export const formatPrice = () => {};

// Constants: UPPER_SNAKE_CASE
export const MAX_DISCOUNT_PERCENT = 50;
export const PAYMENT_METHODS = ['CASH', 'QRIS'] as const;

// Types/Interfaces: PascalCase
interface IProduct {
  id: number;
  name: string;
}

type OrderStatus = 'COMPLETED' | 'VOID';
```

#### Dates & Times

```typescript
// Always use ISO format dalam database
const date = new Date().toISOString();

// Format untuk display menggunakan date-fns
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

const formatted = format(new Date(), 'dd MMM yyyy HH:mm', { locale: id });
// 15 Jan 2025 10:30
```

#### Price/Money

```typescript
// Database: DECIMAL(12, 2)
// Always Rp(Rupiah) atau keep consistency

// Display
const formatPrice = (price: number | string) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(Number(price));
};

// Usage: formatPrice(50000) → Rp50.000
```

### Adding New Features

#### Example: Adding New Report Type

**Step 1: Create Server Action**

```typescript
// src/actions/report-actions.ts
'use server';

export async function getCustomReport(filters: ReportFilters) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  
  // Query database
  // Calculate metrics
  // Return data
}
```

**Step 2: Create Component**

```typescript
// src/components/reports/CustomReport.tsx
import { useEffect, useState } from 'react';
import { getCustomReport } from '@/actions/report-actions';

export function CustomReport() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    const fetchData = async () => {
      const result = await getCustomReport({});
      setData(result);
    };
    fetchData();
  }, []);
  
  return (
    // Display data
  );
}
```

**Step 3: Add Route**

```typescript
// src/app/(dashboard)/reports/page.tsx
import { CustomReport } from '@/components/reports/CustomReport';

export default function ReportsPage() {
  return (
    <div>
      <CustomReport />
    </div>
  );
}
```

**Step 4: Add Navigation**

```typescript
// src/components/layout/Sidebar.tsx
// Add link ke reports section
```

### Testing Tips

#### Manual Testing Checklist

- [ ] Feature works pada user yang authorized
- [ ] Feature denied untuk unauthorized user
- [ ] Data saved ke database correctly
- [ ] Calculations correct (profit, discount, etc)
- [ ] UI responsive pada mobile
- [ ] No console errors
- [ ] Performance acceptable (queries fast)

#### Common Testing Scenarios

```typescript
// POS Test
1. Add 2 different products
2. Adjust quantity untuk masing-masing
3. Apply discount 10%
4. Select split payment (CASH 200k + QRIS 300k)
5. Click Pay
6. Verify:
   - Order created
   - Invoice number generated
   - Stock deducted
   - NO payments recorded correctly

// Shift Test
1. Open shift dengan opening balance 500k
2. Process beberapa order
3. Close shift dengan closing balance 1.2M
4. Verify:
   - Reconciliation: 1.2M - 500k = 700k net
   - Matches dengan total net dari transactions
   - Shift locked
```

### Debugging Tips

#### View Database

```bash
# Open Drizzle Studio
npm run db:studio
```

#### Check Logs

```bash
# Server logs (terminal running npm run dev)
# Look untuk red errors dan warnings

# Browser console
# Press F12 → Console tab
```

#### Debug Server Actions

```typescript
// Add console.log di action
export async function addProduct(data) {
  console.log('Incoming data:', data);
  
  const result = await db.insert(products).values(data);
  console.log('DB result:', result);
  
  return result;
}

// Check terminal running npm run dev
```

#### Common Issues

| Issue | Solution |
|-------|----------|
| "DATABASE_URL not set" | Check .env file, restart dev server |
| "NEXTAUTH_SECRET" error | Generate dengan `openssl rand -base64 32` |
| Vercel deployment fails | Check env vars di Vercel dashboard |
| Pagination not working | Verify skip/take parameters |
| Images not loading | Check public/ folder, use next/image |

---

## Troubleshooting

### Login Issues

**Problem**: Cannot login
```
Solutions:
1. Check .env AUTH_SECRET is set
2. Verify user exists di database (npm run db:studio)
3. Clear browser cookies (F12 → Application → Cookies)
4. Try incognito window
5. Check PostgreSQL connection
```

**Problem**: "Invalid credentials" but password is correct
```
Solutions:
1. Password hashed dengan bcrypt - verify dengan seed.ts
2. Check email case sensitivity
3. Reseed database jika needed: npx ts-node -r dotenv/config src/db/seed.ts
```

### Database Issues

**Problem**: `connect ECONNREFUSED 127.0.0.1:5432`
```
PostgreSQL not running:
1. Start PostgreSQL service
   - Windows: Services → PostgreSQL → Start
   - Mac: brew services start postgresql
   - Linux: sudo systemctl start postgresql

2. Check if running:
   - psql -U postgres -c "SELECT version();"

3. Verify DATABASE_URL:
   - localhost:5432 hanya works jika PostgreSQL di local
   - Untuk remote, use host properly
```

**Problem**: `ERROR: database "kygodb" does not exist`
```
Solutions:
1. Create database:
   createdb kygodb

2. Or via Drizzle:
   npm run db:push
   (Will auto-create if not exist)

3. Verify dengan:
   psql -l | grep kygodb
```

**Problem**: Migration fails
```
Solutions:
1. Check schema.ts syntax
2. Try: npm run db:generate (generate migration first)
3. Check drizzle.config.ts paths correct
4. Verify DATABASE_URL again
5. Try: npm run db:push --force (careful!)
```

### Performance Issues

**Problem**: Slow queries
```
Solutions:
1. Check indexes di schema.ts
2. Use EXPLAIN ANALYZE dalam psql untuk bottleneck
3. Avoid SELECT * - spesifik columns needed
4. Use pagination (skip/take) untuk large datasets
5. Consider database optimization course
```

**Problem**: High memory usage
```
Solutions:
1. Avoid loading all data at once
2. Implement pagination
3. Close unused database connections
4. Check untuk memory leaks di client-side
```

### UI/UX Issues

**Problem**: Styling looks broken
```
Solutions:
1. Browser cache: Ctrl+Shift+R (hard refresh)
2. Check tailwind.config.js
3. npm run build (compile CSS)
4. Check console untuk TailwindCSS warnings
```

**Problem**: Component not updating
```
Solutions:
1. Check state management (Zustand)
2. Missing dependency dalam useEffect?
3. Try hard refresh
4. Check React DevTools para debug state
```

### Development Issues

**Problem**: "Cannot find module" error
```
Solutions:
1. npm ci (reinstall dependencies)
2. Check tsconfig.json paths
3. Verify file exists dan correct casing
4. TypeScript might be confused - restart dev server
```

**Problem**: TypeScript compilation errors
```
Solutions:
1. Check types syntax
2. npm run build (siehe all errors at once)
3. Disable strict mode di tsconfig.json (temporary only)
4. Run tsc --version untuk check TS version
```

---

## Deployment Guide

### Before Deployment

#### Checklist

- [ ] Semua secrets di .env.production untuk deployment platform
- [ ] Database backup created
- [ ] Test semua fitur di production-like environment
- [ ] Change default passwords
- [ ] Setup error monitoring (Sentry, LogRocket, etc)
- [ ] Setup CDN/static assets caching
- [ ] Database replicated jika critical
- [ ] Backup strategy planned
- [ ] Load testing done jika expected high traffic

#### Production Environment Variables

```env
# .env.production
DATABASE_URL="postgresql://prod-user:strong-password@prod-host:5432/prod-db"
AUTH_SECRET="very-long-random-string-minimum-32-chars"
NODE_ENV="production"
```

**Important:**
- Use strong passwords untuk database
- Never commit .env.production
- Rotate AUTH_SECRET regularly
- Use environment management tools (1Password, Vault, etc)

### Deployment Options

#### Option 1: Vercel (Recommended for Next.js)

**Advantages:**
- Optimized untuk Next.js
- Deploy hanya click button
- Automatic preview deployments
- CDN built-in
- Serverless functions

**Steps:**

1. **Connect Repository**
   - Go to vercel.com
   - Click "New Project"
   - Connect GitHub account
   - Select POS-Kygo repository

2. **Configure Environment**
   - Di Vercel Settings → Environment Variables
   - Add DATABASE_URL
   - Add AUTH_SECRET
   - Verify NODE_ENV=production

3. **Setup Database**
   - Use Neon, PlanetScale, atau Supabase untuk managed PostgreSQL
   - Get connection string
   - Add ke Vercel env vars

4. **Deploy**
   - Push ke main branch
   - Vercel auto-deploy
   - Or click "Deploy" di dashboard

5. **Run Migrations**
   - Connect ke prod database
   - Run: npm run db:push (ensure correct DATABASE_URL)

**Cost:** Free tier available, paid sesuai usage

#### Option 2: Railway

**Advantages:**
- Easy PostgreSQL setup
- Good untuk side projects
- Affordable pricing
- Built-in monitoring

**Steps:**

1. Go to railway.app
2. Create new project
3. Add PostgreSQL plugin
4. Import GitHub repo
5. Set environment variables
6. Deploy

#### Option 3: Self-Hosted (VPS)

**Advantages:**
- Full control
- Cost-effective untuk high traffic
- Can customize everything

**Requirements:**
- VPS (AWS, DigitalOcean, Linode, etc)
- PostgreSQL installed
- Node.js installed
- Domain name
- SSL certificate (Let's Encrypt)

**Basic Steps:**

```bash
# 1. Connect ke VPS via SSH
ssh user@your-server-ip

# 2. Clone repository
git clone https://github.com/lintangrafi/POS-Kygoo.git
cd POS-Kygo-V2

# 3. Install dependencies
npm ci

# 4. Setup .env
nano .env
# (Add production env vars)

# 5. Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# 6. Create database
sudo -u postgres createdb kygodb

# 7. Run migrations
npm run db:push

# 8. Build aplikasi
npm run build

# 9. Start dengan process manager (PM2)
npm install -g pm2
pm2 start npm --name "pos-kygo" -- start
pm2 save
pm2 startup

# 10. Setup reverse proxy (Nginx)
sudo apt install nginx
# Configure Nginx untuk forward request ke :3000

# 11. Setup SSL
sudo apt install certbot python3-certbot-nginx
sudo certbot certonly -d yourdomain.com
```

### Post-Deployment Checklist

- [ ] Test login pada production URL
- [ ] Process test transaction
- [ ] Verify database connection
- [ ] Check error logs
- [ ] Setup automated backups
- [ ] Monitor performance
- [ ] Setup alerts untuk errors
- [ ] Document deployment process
- [ ] Train team untuk production support

### Monitoring & Maintenance

#### Regular Tasks

```
Daily:
- Check error logs
- Monitor system health
- Backup verification

Weekly:
- Database maintenance
- Security updates review
- Performance analysis

Monthly:
- User access audit
- Database optimization
- Feature usage analysis
- Cost review
```

#### Key Metrics to Monitor

```
- Response time (target < 500ms)
- Error rate (target < 0.1%)
- Database query time
- Active users
- Transaction volume
- Disk usage
```

#### Backup Strategy

```
Recommended:
- Daily full backup
- Hourly incremental backup
- Test restore monthly
- Keep 30+ days history
- Geo-redundant storage jika critical
- Document recovery procedure
```

### Scaling Considerations

**When to scale:**
- Response time > 1 second
- Error rate > 1%
- Database connections maxed
- CPU/Memory consistently high

**Scaling strategies:**
1. **Database:** Add read replicas, optimize queries
2. **Application:** Load balancer, multiple instances
3. **Caching:** Redis untuk frequently accessed data
4. **CDN:** Static assets hosting

---

## Best Practices & Tips

### Security

1. **Authentication**
   - Always validate session di server actions
   - Never trust client-side auth checks
   - Use HTTPS di production
   - Rotate AUTH_SECRET regularly

2. **Database**
   - Use parameterized queries (Drizzle handles this)
   - Never SELECT * hapuskan sensitive columns
   - Encrypt sensitive data jika needed
   - Regular backups

3. **API**
   - Validate input data
   - Implement rate limiting
   - Log sensitive operations
   - Never expose error details ke client

### Performance

1. **Database Queries**
   - Use indexes untuk frequently filtered columns
   - Avoid N+1 queries (use joins)
   - Paginate large result sets
   - Cache calculated metrics

2. **Frontend**
   - Lazy load components jika tidak immediate visible
   - Memoize expensive calculations
   - Optimize images
   - Bundle size analysis: `npm run build`

3. **Caching Strategy**
   ```typescript
   // Cache calculated reports (refresh every hour)
   const cachedReport = await cache(() => calculateReport(), 3600);
   
   // Invalidate cache saat data changes
   revalidatePath('/reports');
   ```

### Code Quality

1. **Type Safety**
   - Use TypeScript strict mode
   - Avoid `any` type
   - Use discriminated unions untuk conditional types

2. **Testing**
   - Unit test untuk calculations
   - Integration test untuk workflows
   - Manual testing untuk UI

3. **Documentation**
   - Comment kompleks logic
   - Document API contracts
   - Maintain README updated

### Daily Operations

1. **Shift Closing**
   ```
   Setiap hari di akhir hari:
   1. Close semua open shifts
   2. Reconcile cash
   3. Review exceptions
   4. Generate daily report
   5. Backup database
   ```

2. **Data Cleanup**
   ```
   Periodically:
   1. Archive old invoices (> 1 year)
   2. Delete temporary open bills
   3. Optimize database
   4. Review user access permissions
   ```

3. **Regular Review**
   ```
   Weekly:
   1. Review financial reports
   2. Check inventory discrepancies
   3. User activity audit
   4. Performance metrics
   ```

---

## Additional Resources

### Documentation Links

- [Next.js Docs](https://nextjs.org/docs)
- [Drizzle ORM Docs](https://orm.drizzle.team)
- [NextAuth.js Docs](https://authjs.dev)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [React Docs](https://react.dev)
- [PostgreSQL Docs](https://www.postgresql.org/docs)

### Helpful Tools

```
Development:
- VS Code extensions: 
  * Drizzle Kit (ORM helper)
  * TypeScript Vue Plugin
  * Tailwind CSS IntelliSense
  * Prettier (formatter)
  * ESLint (linter)

Database Management:
- DBeaver Community (SQL IDE)
- pgAdmin (PostgreSQL UI)
- Drizzle Studio (built-in)

API Testing:
- Postman
- Insomnia
- Thunder Client (VS Code extension)

Monitoring:
- Sentry (error tracking)
- LogRocket (session replay)
- Datadog (monitoring)
```

### Community & Support

```
For Questions:
1. Check documentation first
2. Search existing issues di GitHub
3. Create new issue dengan details
4. Join community Slack/Discord jika available
5. Stack Overflow tagged dengan next.js, drizzle, etc
```

---

## Changelog & Versioning

### Version 2.0 (Current)
- ✅ Complete POS System
- ✅ Inventory Management
- ✅ Financial Reports
- ✅ Expense Tracking
- ✅ Income Tracking
- ✅ User Management
- ✅ Shift Management
- ✅ Invoice Payment Method Tracking
- ✅ Split Bill Support
- ✅ Cashflow Analysis

### Planned Features (V2.1+)
- 📋 Barcode scanning support
- 📱 Mobile app
- 🔄 Multi-store management
- 🌐 Multi-language support
- 📊 Advanced analytics & predictions
- 🔌 Third-party integrations (accounting, logistics)
- 💳 Loyalty program

---

## Kontak & Support

Untuk pertanyaan, bug report, atau feature request:

**GitHub**: https://github.com/lintangrafi/POS-Kygoo  
**Email**: developer@kygoo.studio  
**Issues**: https://github.com/lintangrafi/POS-Kygoo/issues  

---

**Last Updated**: Maret 2026  
**Version**: 2.0  
**Maintained By**: POS Kygoo Development Team

---

## License & Credits

Aplikasi POS Kygoo dikembangkan dengan passion untuk membantu bisnis kecil dan menengah mengelola operasi penjualan dengan lebih efisien.

**Tech Stack**: Next.js, React, TypeScript, Tailwind CSS, Drizzle ORM, PostgreSQL, NextAuth.js

**Made with ❤️ for small businesses**

