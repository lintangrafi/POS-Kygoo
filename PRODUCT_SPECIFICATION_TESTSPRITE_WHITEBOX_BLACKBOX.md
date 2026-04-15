# Product Specification Document

## POS Kygo V2 - Whitebox and Blackbox Testing

Document Version: 1.1  
Date: 23 March 2026  
Project: POS Kygo V2  
Owner: QA and Engineering

---

## 1. Tujuan Dokumen

Dokumen ini mendefinisikan spesifikasi produk dari sisi quality assurance untuk memastikan POS Kygo V2 tervalidasi melalui:
- Blackbox testing (validasi perilaku fitur berdasarkan requirement)
- Whitebox testing (validasi logika internal, branch, authorization, dan integritas transaksi)
- Eksekusi plan secara terstruktur menggunakan TestSprite untuk skenario frontend/API utama

Target akhirnya adalah kualitas rilis yang stabil, aman, dan minim regresi pada fitur finansial inti.

---

## 2. Ringkasan Produk

POS Kygo V2 adalah aplikasi Point-of-Sale berbasis Next.js 16 + TypeScript dengan PostgreSQL (Drizzle ORM), mencakup:
- Authentication dan session management
- POS checkout (single dan split payment)
- Inventory management dan stock adjustment
- Shift management (open/close)
- Expense dan income tracking
- Reporting dan cashflow
- Admin actions (void/delete order)
- Invoice listing dan detail

Target platform:
- Web app (desktop-first, responsive)
- Local test endpoint default: `http://localhost:3000`

---

## 3. Ruang Lingkup Pengujian

### 3.1 In Scope

Modul prioritas:
- Auth
- Shift
- POS
- Inventory
- Expense
- Income
- Reports
- Invoices
- Admin API

### 3.2 Out of Scope

- Load/performance test skala besar
- Penetration test mendalam (di luar authz/guard dasar)
- Integrasi pihak ketiga yang belum aktif di codebase

---

## 4. Role dan Aturan Akses

Role yang harus dipastikan perilakunya:
- CASHIER: operasi kasir, tidak boleh akses operasi admin sensitif
- ADMIN: operasi manajerial (inventory control, expense/income, report)
- SUPERADMIN: akses penuh termasuk aksi administrasi kritikal

Kriteria akses:
- Semua aksi sensitif wajib melewati guard session dan role
- User tanpa session atau role tidak valid harus ditolak dengan pesan/response yang jelas

---

## 5. Requirement Fungsional yang Wajib Lulus

### 5.1 Authentication
- Login valid mengarahkan user ke dashboard
- Login invalid menampilkan error autentikasi
- Session tidak valid harus diarahkan ke `/login`

### 5.2 Shift
- Open shift berhasil jika belum ada shift OPEN
- Open shift kedua saat masih OPEN harus gagal
- Close shift tanpa shift aktif harus gagal

### 5.3 POS Checkout
- Checkout berhasil membuat order, items, payments, audit log, dan update stok
- Split payment harus rekonsiliasi tepat dengan total transaksi
- Checkout tanpa shift OPEN harus ditolak
- Discount amount/percent harus dihitung benar pada boundary value

### 5.4 Inventory
- Tambah/edit/archive produk sesuai role
- Stock adjustment:
  - `OUT` mengurangi stok
  - `IN`/`ADJUSTMENT` menambah stok
  - `change` tidak valid (0, negatif, non-integer) harus ditolak

### 5.5 Expense dan Income
- Tambah/edit/hapus hanya untuk role admin/superadmin
- Operasi terhadap id yang tidak ada harus error eksplisit

### 5.6 Reports
- Nilai agregasi finansial konsisten dengan data transaksi
- Period grouping `daily/weekly/monthly/yearly` benar
- Date range invalid (`from > to`) ditangani dengan benar

### 5.7 Admin Actions
- Void order valid mengubah status sesuai aturan
- Delete order valid menghapus relasi data secara aman
- Order tidak ditemukan harus menghasilkan error yang tepat

---

## 6. Non-Functional Quality Requirements

- Data integrity: tidak ada partial write pada transaksi gagal
- Authorization consistency: tidak ada bypass role/guard
- Auditability: transaksi penting tercatat pada audit log
- Reliability: skenario kritikal dapat diulang dengan hasil konsisten

---

## 7. Strategi Blackbox Testing

Pendekatan:
- Requirement-based dan behavior-based
- Equivalence partitioning
- Boundary value analysis
- Negative testing (invalid payload, unauthorized, bad state)
- End-to-end skenario bisnis lintas modul

Contoh alur E2E prioritas tinggi:
1. Login sebagai cashier
2. Open shift
3. Checkout single payment
4. Checkout split payment
5. Verifikasi invoice dan stok
6. Login admin
7. Verifikasi report dan cashflow
8. Close shift

---

## 8. Strategi Whitebox Testing

Pendekatan:
- Branch/path coverage untuk server actions kritikal
- Verifikasi success path dan error path
- Verifikasi rollback behavior untuk transaksi database
- Verifikasi guard (`verifySession`, role checks) di seluruh action sensitif

Target file/fungsi:
- `src/actions/pos-actions.ts`
- `src/actions/shift-actions.ts`
- `src/actions/inventory-actions.ts`
- `src/actions/expense-actions.ts`
- `src/actions/income-actions.ts`
- `src/actions/report-actions.ts`
- `src/actions/admin-actions.ts`
- `src/lib/auth.ts`

Kriteria minimal whitebox:
- Semua branch error kritikal dieksekusi minimal 1 kali
- Semua jalur authorization memiliki test pass dan fail
- Semua transaksi finansial punya test success + failure path

---

## 9. Matriks Cakupan Prioritas

| ID | Area | Type | Priority | Expected Result |
|---|---|---|---|---|
| COV-01 | Auth login valid/invalid | Blackbox | P0 | Alur login sesuai requirement |
| COV-02 | Open shift duplicate prevention | Blackbox + Whitebox | P0 | Shift kedua ditolak |
| COV-03 | Checkout with open shift | Blackbox + Whitebox | P0 | Order/payment/stock/audit konsisten |
| COV-04 | Checkout without open shift | Blackbox + Whitebox | P0 | Ditolak dengan error tepat |
| COV-05 | Split payment reconciliation | Blackbox + Whitebox | P0 | Total payment sama dengan total order |
| COV-06 | Inventory adjust stock OUT/IN | Blackbox + Whitebox | P0 | Delta stok benar |
| COV-07 | Expense/Income role access | Blackbox + Whitebox | P0 | CASHIER ditolak, ADMIN/SUPERADMIN lolos |
| COV-08 | Report aggregation period | Blackbox + Whitebox | P1 | Grouping period benar |
| COV-09 | Admin void/delete order | Blackbox + Whitebox | P0 | Perilaku dan data relasi valid |
| COV-10 | Session/authorization guard | Whitebox | P0 | Unauthorized path tertutup |

---

## 10. Spesifikasi Data Uji

Akun uji:
- cashier_test (role CASHIER)
- admin_test (role ADMIN)
- superadmin_test (role SUPERADMIN)

Data produk:
- P001: stock 100, price 10000, cost 7000
- P002: stock 5, price 50000, cost 35000

Boundary dataset:
- Quantity: 0, 1, 9999
- Discount percent: 0, 50, 100, >100
- Discount amount: 0, subtotal, >subtotal
- Amount expense/income: 0, 1, 999999999.99
- Date range: same day, `from > to`, lintas bulan/tahun

---

## 11. Spesifikasi Eksekusi dengan TestSprite

### 11.1 Prasyarat

- Aplikasi berjalan di `localhost:3000`
- Database dan migration sudah sinkron
- Data uji role-based tersedia
- `.testsprite/config.json` tersedia (hasil bootstrap)

### 11.2 Run Mode

Disarankan production mode untuk stabilitas test frontend:
1. `npm run build`
2. `npm run start`

Catatan:
- Jika hanya dev mode yang tersedia (`npm run dev`), jalankan subset prioritas P0 terlebih dahulu.

### 11.3 Alur TestSprite yang Disarankan

1. Generate code summary
2. Generate frontend test plan
3. Review test plan (fokus COV-01 s.d. COV-10)
4. Execute tests
5. Simpan report markdown dan defect list
6. Rerun regression setelah fix

### 11.4 Artefak Wajib per Siklus

- Daftar test case yang dieksekusi
- Hasil pass/fail per test
- Daftar bug + severity
- Ringkasan coverage terhadap COV matrix

---

## 12. Entry dan Exit Criteria

### 12.1 Entry Criteria

- Build aplikasi sukses
- Environment test siap
- Endpoint utama bisa diakses
- Akun role-based siap dipakai

### 12.2 Exit Criteria

- Semua test P0 lulus
- Minimal 95% total test pass
- Tidak ada defect open severity Critical/High
- Jalur finansial inti tervalidasi ulang pasca bugfix

---

## 13. Defect Severity dan SLA

- Critical: salah hitung finansial, kehilangan data, bypass authorization
- High: fitur utama gagal atau hasil bisnis salah
- Medium: ketidaksesuaian requirement dengan workaround
- Low: issue minor UI/copy tanpa dampak data

SLA rekomendasi:
- Critical: immediate fix
- High: fix sebelum release
- Medium: fix di sprint berjalan
- Low: masuk backlog prioritas

---

## 14. Risiko dan Mitigasi

Risiko:
- Inkonsistensi stok pada transaksi kompleks
- Selisih split payment vs total order
- Salah agregasi report karena period/date range
- Endpoint/action baru tanpa guard otorisasi

Mitigasi:
- Regression wajib untuk COV-01 s.d. COV-09 setiap perubahan finansial
- Checklist authz wajib untuk endpoint/action baru
- Cross-check order, payments, audit logs untuk validasi transaksi

---

## 15. Deliverables

Deliverables yang dihasilkan dari spesifikasi ini:
- Dokumen Product Specification Testing (dokumen ini)
- Test plan blackbox (TestSprite)
- Whitebox checklist branch/function kritikal
- Laporan eksekusi berkala sebagai release gate

---

## 16. Approval

Prepared by: QA/Engineering  
Reviewed by: Tech Lead  
Approved by: Product Owner
