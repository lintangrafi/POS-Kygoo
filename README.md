# POS Kygoo (V2)

**POS Kygoo** adalah aplikasi Point-of-Sale (POS) berbasis Next.js + TypeScript yang menggunakan Drizzle ORM dan Postgres. Aplikasi ini berisi fitur POS, inventori, laporan, audit log, dan manajemen shift.

---

## 🚀 Quick start

1. Clone repo

   ```bash
   git clone https://github.com/lintangrafi/POS-Kygoo.git
   cd POS-Kygo-V2
   ```

2. Pasang dependensi

   ```bash
   npm ci
   ```

3. Buat file environment `.env` di root dan set nilai penting (contoh):

   ```env
   DATABASE_URL="postgresql://user:pass@host:5432/dbname?sslmode=require"
   AUTH_SECRET="ganti_dengan_secret_acak"
   NODE_ENV=development
   ```

   - `DATABASE_URL`: koneksi ke Postgres/Neon
   - `AUTH_SECRET`: secret untuk penandatanganan session JWT

4. Jalankan development server

   ```bash
   npm run dev
   ```

5. (Opsional) Seed database dengan data dasar (user, kategori, produk):

   ```bash
   npx ts-node -r dotenv/config src/db/seed.ts
   ```

   - Default akun yang dibuat oleh seeder:
     - Superadmin: `admin@kygoo.studio` / password `admin123`
     - Cashier: `cashier@kygoo.studio` / password `admin123`

---

## 🧰 Perintah penting

- `npm run dev` — jalankan dev server (Next.js)
- `npm run build` — build produksi
- `npm run start` — jalankan server produksi
- `npm run lint` — jalankan linter

---

## 🗂️  Database & migrations

Proyek menggunakan Drizzle ORM untuk skema dan migrasi. Folder `drizzle/` berisi snapshot/migration SQL. Untuk operasi migrasi/generasi gunakan `drizzle-kit` (lihat dokumentasi resmi drizzle-kit):

```bash
# contoh (sesuaikan konfigurasi):
# npx drizzle-kit generate:pg --schema src/db/schema.ts --out drizzle
# npx drizzle-kit push:pg --connection="$DATABASE_URL" --driver postgres
```

---

## 🔐 Konfigurasi environment

Minimal variabel environment:

- `DATABASE_URL` — string koneksi Postgres
- `AUTH_SECRET` — secret untuk JWT/session
- `NODE_ENV` — `development` | `production`

Pastikan file `.env` tidak di-commit (sudah di-`.gitignore`).

---

## ℹ️ Struktur penting

- `src/app` — kode Next.js (routes + pages)
- `src/actions` — business logic yang dipanggil dari server
- `src/db` — schema, koneksi, seeder
- `src/components` — UI components

---

## ✅ Catatan tambahan

- Repo ini sudah dikirimkan ke GitHub: `https://github.com/lintangrafi/POS-Kygoo.git`.
- Untuk deployment, gunakan provider yang mendukung Node/Next.js dan Postgres (mis. Vercel + Neon/PlanetScale/Heroku/Render).

---

## 🤝 Contributing

Silakan ajukan issue atau pull request. Ikuti konvensi kode dan tambahkan deskripsi serta langkah reproducible untuk perubahan besar.

---

## 📄 License

Proyek ini belum memiliki penulis/license yang diisi di `package.json`. Tambahkan `LICENSE` jika ingin melisensikan proyek.

---

Jika ingin, saya dapat:
- menambahkan skrip `db:seed` dan `db:migrate` ke `package.json`, atau
- menambahkan GitHub Actions sederhana untuk CI (build + lint)

Pilih salah satu yang ingin ditambahkan. 👇