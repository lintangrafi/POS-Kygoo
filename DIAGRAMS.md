# 📊 Diagram UML - POS Kygoo V2

---

## 1. Use Case Diagram

```mermaid
flowchart LR
    Cashier(("🧍 Cashier"))
    Admin(("🧍 Admin"))
    SuperAdmin(("🧍 SuperAdmin"))

    subgraph System["<<system>> POS Kygoo V2"]
        direction TB

        subgraph Row1["Operasional Harian"]
            direction LR

            subgraph Auth["Autentikasi"]
                direction LR
                UC1(["Login"])
                UC2(["Logout"])
            end

            subgraph Shift["Shift"]
                direction LR
                UC3(["Buka Shift"])
                UC4(["Tutup Shift"])
            end

            subgraph Pos["POS & Open Bill"]
                direction LR
                UC5(["Lihat Menu POS"])
                UC6(["Tambah Item ke Cart"])
                UC7(["Proses Checkout"])
                UC8(["Buat Open Bill"])
                UC9(["Lihat Open Bills"])
                UC10(["Tutup Open Bill & Checkout"])
                UC11(["Void Open Bill"])
            end
        end

        subgraph Row2["Manajemen"]
            direction LR

            subgraph Inventory["Inventori"]
                direction LR
                UC12(["Lihat Inventori"])
                UC13(["Tambah Produk"])
                UC14(["Edit Produk"])
                UC15(["Arsip / Hapus Produk"])
                UC16(["Adjust Stok"])
                UC17(["Toggle Menu Item"])
            end

            subgraph Reporting["Dashboard & Laporan"]
                direction LR
                UC18(["Lihat Dashboard Stats"])
                UC19(["Lihat Laporan Keuangan"])
                UC20(["Lihat Top Products"])
                UC21(["Lihat Revenue Aggregated"])
                UC22(["Lihat Daily Cashflow"])
                UC28(["Lihat Invoices"])
                UC29(["Lihat Detail Invoice"])
            end

            subgraph Finance["Keuangan"]
                direction LR
                UC23(["Kelola Expense"])
                UC24(["Kelola Income"])
            end

            subgraph Control["Kontrol Admin"]
                direction LR
                UC25(["Lihat Audit Log"])
                UC26(["Void Order"])
                UC27(["Delete Order"])
            end
        end
    end

    Cashier --- UC1
    Cashier --- UC2
    Cashier --- UC3
    Cashier --- UC4
    Cashier --- UC5
    Cashier --- UC6
    Cashier --- UC7
    Cashier --- UC8
    Cashier --- UC9
    Cashier --- UC10
    Cashier --- UC11

    Admin --- UC12
    Admin --- UC13
    Admin --- UC14
    Admin --- UC15
    Admin --- UC16
    Admin --- UC17
    Admin --- UC18
    Admin --- UC19
    Admin --- UC20
    Admin --- UC21
    Admin --- UC22
    Admin --- UC23
    Admin --- UC24
    Admin --- UC25
    Admin --- UC26
    Admin --- UC27
    Admin --- UC28
    Admin --- UC29

    SuperAdmin -. "extends" .-> Admin
    Admin -. "extends" .-> Cashier

    classDef actor fill:#ffffff,stroke:#333,stroke-width:1.5px,color:#111;
    classDef usecase fill:#fdfdfd,stroke:#333,stroke-width:1px,color:#111;
    class Cashier,Admin,SuperAdmin actor;
    class UC1,UC2,UC3,UC4,UC5,UC6,UC7,UC8,UC9,UC10,UC11,UC12,UC13,UC14,UC15,UC16,UC17,UC18,UC19,UC20,UC21,UC22,UC23,UC24,UC25,UC26,UC27,UC28,UC29 usecase;
```

---

## 2. Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    USERS {
        serial id PK
        text name
        text email UK
        user_role role
    }

    CATEGORIES {
        serial id PK
        text name
        category_type type
    }

    PRODUCTS {
        serial id PK
        integer category_id FK
        text name
        decimal price
        integer stock
        boolean is_menu_item
    }

    ORDERS {
        serial id PK
        text invoice_number UK
        integer user_id FK
        decimal total_amount
        order_status status
    }

    ORDER_ITEMS {
        serial id PK
        integer order_id FK
        integer product_id FK
        integer quantity
        decimal price_at_sale
    }

    PAYMENTS {
        serial id PK
        integer order_id FK
        payment_method method
        decimal amount
    }

    OPEN_BILLS {
        serial id PK
        text bill_number UK
        integer user_id FK
        decimal total_amount
        decimal paid_amount
        open_bill_status status
    }

    OPEN_BILL_ITEMS {
        serial id PK
        integer open_bill_id FK
        integer product_id FK
        integer quantity
        decimal price_at_bill
    }

    SHIFTS {
        serial id PK
        integer user_id FK
        timestamp start_time
        timestamp end_time
        shift_status status
    }

    STOCK_ADJUSTMENTS {
        serial id PK
        integer product_id FK
        integer user_id FK
        integer change
        stock_adjustment_type type
    }

    EXPENSES {
        serial id PK
        integer user_id FK
        decimal amount
        expense_category category
        timestamp date
    }

    INCOMES {
        serial id PK
        integer user_id FK
        decimal amount
        income_category category
        timestamp date
    }

    AUDIT_LOGS {
        serial id PK
        integer user_id FK
        text action
        text entity
        timestamp timestamp
    }

    CATEGORIES ||--o{ PRODUCTS : contains
    USERS ||--o{ ORDERS : creates
    ORDERS ||--o{ ORDER_ITEMS : has
    PRODUCTS ||--o{ ORDER_ITEMS : sold_in
    ORDERS ||--o{ PAYMENTS : paid_via

    USERS ||--o{ OPEN_BILLS : creates
    OPEN_BILLS ||--o{ OPEN_BILL_ITEMS : has
    PRODUCTS ||--o{ OPEN_BILL_ITEMS : listed_in

    USERS ||--o{ SHIFTS : has
    USERS ||--o{ STOCK_ADJUSTMENTS : records
    PRODUCTS ||--o{ STOCK_ADJUSTMENTS : adjusted

    USERS ||--o{ EXPENSES : records
    USERS ||--o{ INCOMES : records
    USERS ||--o{ AUDIT_LOGS : performs
```

---

## 3. Flowchart - Alur Utama Aplikasi

### 3a. Flowchart Login & Routing

```mermaid
flowchart TD
    A([Start]) --> B[Buka Aplikasi]
    B --> C{Sudah Login?}
    C -- Tidak --> D[Tampilkan Halaman Login]
    D --> E[Input Email & Password]
    E --> F{Validasi Kredensial}
    F -- Gagal --> G[Tampilkan Error]
    G --> E
    F -- Berhasil --> H{Cek Role User}
    H -- CASHIER --> I[Redirect ke /shift]
    H -- ADMIN/SUPERADMIN --> J[Redirect ke /dashboard]
    C -- Ya --> K{Cek Role User}
    K -- CASHIER --> I
    K -- ADMIN/SUPERADMIN --> J
```

### 3b. Flowchart Shift Management

```mermaid
flowchart TD
    A([Halaman Shift]) --> B{Ada Shift Open?}
    B -- Ya --> C[Tampilkan Info Shift Aktif]
    C --> D[Opsi: Tutup Shift]
    D --> E[Input Data Akhir Shift]
    E --> F[Simpan & Tutup Shift]
    F --> G([Shift Ditutup])

    B -- Tidak --> H[Form Buka Shift Baru]
    H --> I[Input Modal Awal / Initial Cash]
    I --> J[Buka Shift]
    J --> K([Shift Terbuka - Redirect ke POS])
```

### 3c. Flowchart Transaksi POS (Direct Checkout)

```mermaid
flowchart TD
    A([Halaman POS]) --> B{Shift Aktif?}
    B -- Tidak --> C[Redirect ke Shift Page]
    B -- Ya --> D[Tampilkan Grid Produk & Cart]
    D --> E[Pilih Produk dari Grid]
    E --> F[Tambah ke Cart]
    F --> G{Tambah Produk Lagi?}
    G -- Ya --> E
    G -- Tidak --> H{Pilih Aksi}

    H -- Direct Checkout --> I[Pilih Metode Pembayaran]
    I --> I2{Diskon?}
    I2 -- Ya --> I3[Input Diskon % atau Rp]
    I3 --> I4[Hitung Total Setelah Diskon]
    I4 --> J
    I2 -- Tidak --> J[Input Jumlah Bayar]
    J --> K{Pembayaran Valid?}
    K -- Tidak --> L[Tampilkan Error: Kurang Bayar]
    L --> J
    K -- Ya --> M[Proses Transaksi]
    M --> N[Kurangi Stok Produk]
    N --> O[Simpan Order + OrderItems + Payment]
    O --> P[Tampilkan Struk / Kembalian]
    P --> Q([Selesai])

    H -- Simpan Open Bill --> OB[Input Nama Customer & Catatan]
    OB --> OB2{Down Payment?}
    OB2 -- Ya --> OB3[Input DP % atau Rp]
    OB3 --> OB4[Pilih Metode Bayar DP]
    OB4 --> OB5[Simpan Open Bill + Items + DP]
    OB2 -- Tidak --> OB5
    OB5 --> OB6([Open Bill Tersimpan])
```

### 3d. Flowchart Open Bill → Checkout

```mermaid
flowchart TD
    A([Halaman POS]) --> B[Buka Daftar Open Bills]
    B --> C[Pilih Open Bill]
    C --> D[Load Items ke Cart]
    D --> E{Pilih Aksi}

    E -- Checkout / Close Bill --> F[Pilih Metode Pembayaran]
    F --> G[Hitung Sisa Bayar setelah DP]
    G --> H[Input Jumlah Bayar]
    H --> I{Pembayaran Valid?}
    I -- Tidak --> J[Error: Kurang Bayar]
    J --> H
    I -- Ya --> K[Proses Transaksi]
    K --> L[Kurangi Stok]
    L --> M[Simpan Order + Payment]
    M --> N[Update Open Bill Status = CLOSED]
    N --> O[Generate Invoice Number]
    O --> P([Transaksi Selesai])

    E -- Void Bill --> Q[Input Alasan Void]
    Q --> R[Update Status = VOID]
    R --> S[Catat di Audit Log]
    S --> T([Bill Di-void])
```

### 3e. Flowchart Inventory Management

```mermaid
flowchart TD
    A([Halaman Inventory]) --> B[Tampilkan Daftar Produk]
    B --> C{Pilih Aksi}

    C -- Tambah Produk --> D[Form Tambah Produk]
    D --> E[Input: Nama, Harga, HPP, SKU, Kategori, Stok]
    E --> F[Simpan Produk Baru]
    F --> B

    C -- Edit Produk --> G[Form Edit Produk]
    G --> H[Ubah Data Produk]
    H --> I[Simpan Perubahan]
    I --> B

    C -- Adjust Stok --> J[Form Stock Adjustment]
    J --> K[Input: Tipe IN/OUT/ADJUSTMENT, Jumlah, Alasan]
    K --> L[Simpan Adjustment & Update Stok]
    L --> B

    C -- Toggle Menu --> M[Ubah Status is_menu_item]
    M --> B

    C -- Arsip Produk --> N[Set is_archived = true]
    N --> B

    C -- Hapus Produk --> O{Produk Punya Riwayat?}
    O -- Ya --> P[Gagal Hapus - Arsip Saja]
    P --> B
    O -- Tidak --> R[Hapus Permanen]
    R --> B
```

### 3f. Flowchart Laporan & Keuangan

```mermaid
flowchart TD
    A([Halaman Reports]) --> B[Pilih Rentang Tanggal]
    B --> C{Pilih Tab Laporan}

    C -- Financial Report --> D[Ambil Data: Revenue, COGS, Profit]
    D --> D2[Tampilkan Summary Cards]
    D2 --> D3[Tampilkan Breakdown per Payment Method]

    C -- Top Products --> E[Ambil Produk Terlaris]
    E --> E2[Tampilkan Ranking & Chart]

    C -- Revenue Trend --> F[Ambil Aggregated Revenue]
    F --> F2[Tampilkan Trend Chart: Daily/Weekly/Monthly]

    C -- Cashflow --> G[Ambil Daily Cashflow]
    G --> G2[Tampilkan Inflow vs Outflow Chart]

    C -- Expenses --> H[Tampilkan Daftar Expense]
    H --> H2{Aksi}
    H2 -- Tambah --> H3[Form Input Expense]
    H3 --> H4[Simpan Expense]
    H2 -- Edit --> H5[Form Edit Expense]
    H5 --> H6[Update Expense]
    H2 -- Hapus --> H7[Delete Expense]

    C -- Income --> I[Tampilkan Daftar Income]
    I --> I2{Aksi}
    I2 -- Tambah --> I3[Form Input Income]
    I3 --> I4[Simpan Income]
    I2 -- Edit --> I5[Form Edit Income]
    I5 --> I6[Update Income]
    I2 -- Hapus --> I7[Delete Income]
```

### 3g. Flowchart Admin - Order Management

```mermaid
flowchart TD
    A([Dashboard Admin]) --> B[Lihat Daftar Orders]
    B --> C[Pilih Order]
    C --> D[Lihat Detail Order + Items + Payment]
    D --> E{Aksi Admin}

    E -- Void Order --> F[Ubah Status = VOID]
    F --> G[Catat di Audit Log]
    G --> H([Order Di-void])

    E -- Delete Order --> I{Konfirmasi Hapus}
    I -- Ya --> J[Hapus Order + Items + Payment]
    J --> K[Catat di Audit Log]
    K --> L([Order Dihapus])
    I -- Tidak --> D

    A --> M[Lihat Dashboard Stats]
    M --> N[Total Orders, Revenue, Products, Users]

    A --> O[Lihat Audit Logs]
    O --> P[Filter by Date Range]
    P --> Q[Tampilkan Log Aktivitas]
```

---

## 4. Flowchart Keseluruhan Sistem (High-Level)

```mermaid
flowchart TD
    START([User Membuka App]) --> LOGIN{Login}
    LOGIN -- Gagal --> LOGIN
    LOGIN -- Berhasil --> ROLE{Role?}

    ROLE -- CASHIER --> SHIFT[Shift Management]
    ROLE -- ADMIN/SUPERADMIN --> DASHBOARD[Dashboard]

    SHIFT --> SHIFT_CHECK{Shift Open?}
    SHIFT_CHECK -- Tidak --> OPEN_SHIFT[Buka Shift]
    OPEN_SHIFT --> POS
    SHIFT_CHECK -- Ya --> POS[POS / Kasir]

    POS --> POS_ACTION{Aksi POS}
    POS_ACTION -- Checkout --> TRANSACTION[Proses Transaksi]
    POS_ACTION -- Open Bill --> SAVE_BILL[Simpan Open Bill]
    POS_ACTION -- Load Bill --> LOAD_BILL[Muat Open Bill]
    LOAD_BILL --> POS_ACTION
    POS_ACTION -- Tutup Shift --> CLOSE_SHIFT[Tutup Shift]

    TRANSACTION --> DONE_TRX([Transaksi Selesai])
    SAVE_BILL --> DONE_BILL([Bill Tersimpan])
    CLOSE_SHIFT --> SHIFT

    DASHBOARD --> DASH_ACTION{Menu Admin}
    DASH_ACTION -- POS --> POS
    DASH_ACTION -- Inventory --> INVENTORY[Kelola Produk & Stok]
    DASH_ACTION -- Reports --> REPORTS[Laporan Keuangan]
    DASH_ACTION -- Invoices --> INVOICES[Kelola Invoice]
    DASH_ACTION -- Expenses --> EXPENSES[Kelola Pengeluaran]
    DASH_ACTION -- Income --> INCOME[Kelola Pemasukan]
    DASH_ACTION -- Settings --> SETTINGS[Pengaturan]
    DASH_ACTION -- Shift --> SHIFT

    INVENTORY --> DASH_ACTION
    REPORTS --> DASH_ACTION
    INVOICES --> DASH_ACTION
    EXPENSES --> DASH_ACTION
    INCOME --> DASH_ACTION
    SETTINGS --> DASH_ACTION
```
