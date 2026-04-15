# Product Specification Doc

## POS Kygoo V2 - Blackbox and Whitebox Testing with TestSprite

Document Version: 1.0  
Date: 23 March 2026  
Project: POS Kygo V2  
Document Type: Product Specification for Testing (Blackbox + Whitebox)

---

## 1. Purpose

Dokumen ini mendefinisikan spesifikasi produk dari sudut pandang kualitas dan pengujian untuk memastikan seluruh fitur kritikal POS Kygo V2 tervalidasi dengan pendekatan:
- Blackbox testing (behavior-driven, requirement-based)
- Whitebox testing (code-structure, branch-flow, authorization, transaction integrity)
- Orkestrasi test planning dan eksekusi melalui TestSprite

Tujuan utama:
- Menjamin flow bisnis utama POS berjalan benar, aman, dan konsisten.
- Memastikan kontrol role dan integritas data finansial tidak regress.
- Menyediakan baseline pengujian yang repeatable untuk release berikutnya.

---

## 2. Product Context

POS Kygo V2 adalah aplikasi Point-of-Sale berbasis Next.js + TypeScript dengan PostgreSQL (Drizzle ORM) untuk operasi:
- Auth dan session management
- POS transaction + split payment
- Inventory management + stock adjustment
- Shift opening/closing
- Expense dan income management
- Financial reporting
- Admin actions (void/delete order)

Environment dan endpoint lokal yang terdeteksi untuk TestSprite:
- App URL: http://localhost:3000/
- TestSprite type: frontend
- Test scope default: codebase
- Config file: testsprite_tests/tmp/config.json

---

## 3. Testing Scope

### 3.1 In Scope

Modul prioritas:
- Authentication
- Shift
- POS Checkout
- Inventory
- Expenses
- Incomes
- Reports
- Admin API actions
- Invoices (list/filter/detail behavior)

### 3.2 Out of Scope

- Performance benchmarking skala besar (load/stress test)
- Penetration testing mendalam di luar skenario authz dasar
- Integrasi pihak ketiga yang belum aktif di codebase

---

## 4. User Roles and Access Expectations

Role yang harus tervalidasi dalam pengujian:
- CASHIER: akses operasional kasir, tidak boleh menjalankan aksi admin.
- ADMIN: akses operasi manajerial termasuk expense/income dan inventory management.
- SUPERADMIN: akses penuh termasuk endpoint administratif kritikal.

Kriteria utama:
- Semua aksi sensitif wajib melewati guard session dan role check.
- Aksi admin harus gagal dengan respons jelas saat dipanggil oleh CASHIER atau user tanpa session.

---

## 5. Functional Requirements for Testing

### 5.1 Authentication
- Login valid membawa user ke dashboard sesuai role.
- Login invalid menampilkan error autentikasi.
- Session invalid atau tidak ada harus diarahkan ke login.

### 5.2 Shift Operations
- Open shift berhasil jika tidak ada shift OPEN.
- Open shift kedua saat masih OPEN harus ditolak.
- Close shift gagal jika tidak ada shift OPEN.

### 5.3 POS Transaction
- Checkout normal membuat order, items, payment records, audit log, dan update stok.
- Split payment harus sama dengan total order.
- Checkout tanpa shift OPEN harus ditolak.
- Discount amount/percent harus dihitung akurat dengan boundary validation.

### 5.4 Inventory
- Add/update/archive/delete produk sesuai role.
- Stock adjustment:
  - OUT mengurangi stok.
  - IN/ADJUSTMENT menambah stok.
  - Nilai change tidak valid (0, negatif, non-integer) harus ditolak.

### 5.5 Expenses and Incomes
- Tambah/edit/hapus data finansial hanya untuk role admin.
- Operasi pada id yang tidak ada harus menghasilkan error eksplisit.

### 5.6 Reports
- Financial report menampilkan nilai agregat yang konsisten.
- Grouping period (daily/weekly/monthly/yearly) harus sesuai parameter.
- Date range invalid (from > to) harus ditangani.

### 5.7 Admin Actions
- Void order pada order valid mengubah status sesuai aturan.
- Delete order valid menghapus relasi order secara aman (payments -> items -> order) + audit log.
- Order yang tidak ditemukan mengembalikan error yang sesuai.

---

## 6. Non-Functional Requirements for Testing

- Data integrity: tidak ada partial write pada transaksi finansial ketika error terjadi.
- Authorization consistency: endpoint/action sensitif tidak boleh bypass guard.
- Traceability: setiap transaksi penting tercatat pada audit log.
- Reliability: skenario utama dapat dijalankan berulang tanpa hasil inkonsisten.

---

## 7. Test Design Strategy

## 7.1 Blackbox Strategy (TestSprite-first)

Fokus:
- Validasi input-output dari perspektif user/API consumer.
- Validasi acceptance criteria tiap fitur tanpa asumsi implementasi internal.
- Boundary value dan negative test pada nominal, quantity, discount, date range.

Teknik:
- Equivalence partitioning
- Boundary value analysis
- Role-based access scenarios
- End-to-end business workflow testing

Contoh flow kritikal blackbox:
1. Login sebagai cashier
2. Open shift
3. Checkout (single payment dan split payment)
4. Verifikasi invoice dan update stok
5. Login sebagai admin
6. Cek laporan dan validasi agregasi
7. Close shift

## 7.2 Whitebox Strategy (Code-aware)

Fokus:
- Branch coverage untuk server actions kritikal.
- Verifikasi jalur error, throw path, dan rollback transaction.
- Verifikasi behavior guard: verifySession dan requireAdmin.

Target fungsi prioritas:
- src/actions/pos-actions.ts
- src/actions/shift-actions.ts
- src/actions/inventory-actions.ts
- src/actions/expense-actions.ts
- src/actions/income-actions.ts
- src/actions/report-actions.ts
- src/actions/admin-actions.ts
- src/lib/auth.ts

Minimum whitebox checks:
- Semua branch error kritikal tereksekusi minimal 1x.
- Semua jalur otorisasi kritikal tervalidasi (pass dan fail path).
- Semua jalur transaksi finansial tervalidasi untuk success dan failure path.

---

## 8. Test Data Specification

Data akun uji:
- cashier_test (role CASHIER)
- admin_test (role ADMIN)
- superadmin_test (role SUPERADMIN)

Data produk uji:
- P001: stock 100, price 10000, cost 7000
- P002: stock 5, price 50000, cost 35000

Boundary dataset:
- Quantity: 0, 1, 9999
- Discount percent: 0, 50, 100, >100
- Discount amount: 0, subtotal, >subtotal
- Amount expense/income: 0, 1, 999999999.99
- Date range: same day, from > to, lintas bulan/tahun

---

## 9. Requirement Coverage Matrix (High Priority)

| Coverage ID | Area | Type | Priority | Expected Result |
|---|---|---|---|---|
| COV-01 | Auth login valid/invalid | Blackbox | P0 | Login behavior sesuai requirement |
| COV-02 | Open shift duplicate prevention | Blackbox + Whitebox | P0 | Shift OPEN kedua ditolak |
| COV-03 | Checkout with open shift | Blackbox + Whitebox | P0 | Order/payment/stock/audit konsisten |
| COV-04 | Checkout without open shift | Blackbox + Whitebox | P0 | Request ditolak dengan error tepat |
| COV-05 | Split payment reconciliation | Blackbox + Whitebox | P0 | Total payment match total order |
| COV-06 | Inventory adjust stock OUT/IN | Blackbox + Whitebox | P0 | Delta stok sesuai type |
| COV-07 | Expense/Income role access | Blackbox + Whitebox | P0 | CASHIER ditolak, ADMIN lolos |
| COV-08 | Report aggregation period | Blackbox + Whitebox | P1 | Grouping period benar |
| COV-09 | Admin void/delete order | Blackbox + Whitebox | P0 | Behavior dan relasi data valid |
| COV-10 | Session/authorization guard | Whitebox | P0 | Unauthorized path tertutup |

---

## 10. TestSprite Execution Specification

## 10.1 Preconditions
- Aplikasi dapat dijalankan pada localhost:3000.
- Konfigurasi TestSprite tersedia pada testsprite_tests/tmp/config.json.
- Dataset uji tersedia dan bersih sebelum suite kritikal dijalankan.

## 10.2 Recommended Run Mode
- Gunakan server production mode saat memungkinkan untuk hasil lebih stabil:
  - build lalu start
- Jika hanya dev mode tersedia, prioritaskan skenario P0 dahulu.

## 10.3 Test Plan Split
- Frontend blackbox plan: untuk flow UI dan acceptance behavior.
- Whitebox validations: dipetakan ke fungsi server actions dan authorization branch.
- Regression subset: semua COV-01 sampai COV-07 wajib rerun tiap perubahan besar POS/inventory/report.

## 10.4 Artifacts
Output minimum dari setiap cycle:
- Test plan ID/list
- Execution report (pass/fail per test)
- Bug list dengan severity
- Ringkasan coverage terhadap matrix COV

---

## 11. Entry and Exit Criteria

## 11.1 Entry Criteria
- Build aplikasi sukses.
- Database schema sinkron dengan migration terbaru.
- Akun role-based untuk test sudah tersedia.
- Endpoint utama bisa diakses pada local endpoint.

## 11.2 Exit Criteria
- Seluruh test P0 lulus.
- Minimal 95% test total lulus.
- Tidak ada defect open severity Critical/High.
- Jalur finansial utama tervalidasi ulang setelah bug fix.

---

## 12. Defect Classification

- Critical: transaksi finansial salah, kehilangan data, atau bypass otorisasi.
- High: fitur utama tidak bisa dipakai atau hasil bisnis salah.
- Medium: perilaku tidak sesuai requirement namun ada workaround.
- Low: issue minor UI/copy tanpa dampak data/flow inti.

SLA rekomendasi:
- Critical: fix immediate
- High: fix sebelum release
- Medium: fix sprint berjalan
- Low: backlog terprioritas

---

## 13. Risks and Mitigation

Risiko utama:
- Inkonsistensi stok pada transaksi kompleks.
- Selisih split payment dan total order.
- Ketidaksesuaian agregasi laporan karena rentang tanggal/timezone.
- Endpoint/action baru lupa menambahkan guard otorisasi.

Mitigasi:
- Wajib jalankan regression COV-01 sampai COV-09 pada setiap perubahan modul finansial.
- Gunakan checklist authorization untuk endpoint/action baru.
- Validasi data transaksi dengan cross-check order, payments, audit logs.

---

## 14. Deliverables

Deliverables yang diharapkan dari spesifikasi ini:
- Dokumen Product Specification Testing (dokumen ini)
- TestSprite test plan (frontend blackbox)
- Whitebox checklist per fungsi kritikal
- Laporan eksekusi berkala untuk release gate

---

## 15. Approval

Prepared by: QA/Engineering  
Reviewed by: Tech Lead  
Approved by: Product Owner

## Auth 
admin login 
username: admin@kygoo.studio
password: admin123

cashier login
username: cashier@kygoo.studio
password: cashier123