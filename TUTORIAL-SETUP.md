# 📘 Tutorial Setup — E-Book SOP Sheriff

Daftar isi:
1. [Buat Project Neon Database](#1-buat-project-neon-database)
2. [Buat Akun Cloudinary](#2-buat-akun-cloudinary)
3. [Setup Environment Variables di Vercel](#3-setup-environment-variables-di-vercel)
4. [Seed Data ke Database](#4-seed-data-ke-database)
5. [Deploy Ulang ke Vercel](#5-deploy-ulang-ke-vercel)
6. [Akses Admin Panel](#6-akses-admin-panel)
7. [Cara Pakai Admin Panel](#7-cara-pakai-admin-panel)

---

## 1. Buat Project Neon Database

Neon adalah database PostgreSQL gratis yang berjalan di cloud.

### Langkah-langkah:

1. **Buka** https://console.neon.tech
2. **Daftar/Login** — bisa pake GitHub atau Google
3. Setelah masuk, klik **"Create a project"**
   - **Name**: `ebook-sheriff` (bebas)
   - **Region**: Pilih **US East** (paling dekat dengan Vercel)
   - **Plan**: Pilih **Free Tier** (cukup untuk project ini)
4. Klik **"Create Project"**
5. Setelah jadi, kamu akan melihat **connection string** seperti ini:
   ```
   postgresql://username:password@ep-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
   ⚠️ **COPY CONNECTION STRING INI** — simpan di notepad dulu.

6. **Buat tabel** — Di dashboard Neon, klik **"SQL Editor"** di menu kiri, paste SQL ini:

```sql
CREATE TABLE IF NOT EXISTS sections (
  slug VARCHAR(50) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  category VARCHAR(50) NOT NULL DEFAULT 'lainnya',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sections_category ON sections(category);
CREATE INDEX IF NOT EXISTS idx_sections_sort_order ON sections(sort_order);
```

Lalu klik **"Run"** — selesai ✅

---

## 2. Buat Akun Cloudinary

Cloudinary dipakai untuk upload & hosting gambar. Gratis 25GB.

### Langkah-langkah:

1. **Buka** https://cloudinary.com
2. **Daftar** (atau login pake Google/GitHub)
3. Setelah masuk, kamu akan lihat **Dashboard** dengan 3 informasi penting:
   - **Cloud Name** — biasanya seperti `dxxxxx`
   - **API Key** — angka panjang
   - **API Secret** — string acak panjang

   ⚠️ **COPY KETIGANYA** — simpan di notepad.

> 💡 **Tips**: Nanti pas setup gambar, tinggal upload di Admin Panel → klik gambar → copy URL → paste di editor konten. Gampang!

---

## 3. Setup Environment Variables di Vercel

### Langkah-langkah:

1. **Buka** https://vercel.com
2. Masuk ke dashboard project **ebooksheriff**
3. Klik **Settings** → **Environment Variables**

Tambahkan 6 variabel berikut:

| Key | Value | Contoh |
|-----|-------|--------|
| `DATABASE_URL` | Connection string dari Neon | `postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require` |
| `ADMIN_PASSWORD` | Password admin kamu | `7725` (atau ganti terserah) |
| `JWT_SECRET` | String acak minimal 32 karakter | `abc123def456...` (minimal 32 karakter) |
| `CLOUDINARY_CLOUD_NAME` | Cloud name dari Cloudinary | `dxxxxx` |
| `CLOUDINARY_API_KEY` | API Key dari Cloudinary | `123456789` |
| `CLOUDINARY_API_SECRET` | API Secret dari Cloudinary | `abc123...` |

> ⚠️ **PENTING**: Pastikan pilih **"Production"** untuk semua variabel.

### Cara generate JWT_SECRET yang aman:
Buka terminal PowerShell, ketik:
```powershell
# Cara 1: Pakai PowerShell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 40 | % {[char]$_})

# Cara 2: Atau copy saja ini (terserah mau pakai apa aja):
```

Contoh JWT_SECRET: `sheriff_roxwood_jwt_secret_key_2026_very_secure!!!`

---

## 4. Seed Data ke Database

Data dari `lib/handbook.json` perlu dimasukkan ke database Neon.

### Cara 1: Via Local (direkomendasikan)

Di komputer kamu, buka terminal di VS Code:

```powershell
# Set dulu environment variable DATABASE_URL
$env:DATABASE_URL="postgresql://username:password@ep-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Jalankan seed script
node scripts/seed.mjs
```

Output yang diharapkan:
```
Seeding 15 sections...
  [1/15] pendahuluan (informasi-dasar)
  [2/15] divisi (informasi-dasar)
  ...
  [15/15] fitur-f1 (referensi)
✅ Seed complete!
```

### Cara 2: Via Vercel One-Click (alternatif)

1. Buka Vercel dashboard → **Deployments**
2. Klik deployment terbaru → **"Trigger Deployment"** → **"Redeploy"**
3. Tunggu sampai selesai
4. Buka URL `https://ebooksheriff.vercel.app/api/sections` di browser
5. Kalau masih kosong (`[]`), ulangi seed via Local (Cara 1)

### Cara 3: Manual via Neon SQL Editor

Buka **Neon Console** → **SQL Editor**, lalu paste script manual:
```sql
INSERT INTO sections (slug, title, content, category, sort_order) VALUES 
('pendahuluan', 'Pendahuluan', '<div>...content html... </div>', 'informasi-dasar', 1);
```
...dan seterusnya untuk 15 section. Tapi **Cara 1 lebih mudah**.

---

## 5. Deploy Ulang ke Vercel

Setelah environment variables diset:

1. Buka **Vercel Dashboard** → project ebooksheriff
2. Klik **"Deployments"**
3. Klik tombol **"Redeploy"** (ikon three dots ⋮ → Redeploy)
4. Tunggu sampai status **Ready** ✅

Atau push dari lokal setelah setup env:
```bash
git add .
git commit -m "update env config"
git push
```
Vercel otomatis deploy ulang.

---

## 6. Akses Admin Panel

Setelah deploy:

1. Buka `https://ebooksheriff.vercel.app/admin`
2. Masukkan password yang diset di `ADMIN_PASSWORD`
3. Klik **"Masuk"**

### Verifikasi:

| Fitur | Cara Cek |
|-------|----------|
| Login | Masuk ke `/admin` pake password |
| Data dari DB | Section muncul di daftar |
| Edit | Klik salah satu section → edit konten → Simpan |
| Gambar | Klik tombol **"Gambar"** → upload file |
| Copy URL | Klik gambar di modal → URL ter-copy |

> **Catatan**: Kalau data masih kosong, seed dulu (langkah 4). Kalau belum di-seed, halaman utama tetap jalan dengan data dari `handbook.json` (fallback otomatis).

---

## 7. Cara Pakai Admin Panel

### Mengedit Konten
1. Login ke `/admin`
2. Klik section yang mau diedit
3. Edit teks langsung di area editor
4. Klik **"Simpan"** (pojok kanan atas)
5. Buka halaman utama → refresh → lihat perubahan

### Upload Gambar Baru
1. Di halaman edit section, klik **"Gambar"**
2. Klik **"Upload Gambar"** → pilih file
3. Setelah upload, **klik gambar** → URL otomatis tercopy
4. Paste URL di editor konten (dimana aja)
   - Contoh: `<img src="paste-url-disini" alt="deskripsi">`
5. Simpan

### Menambah Section Baru
Untuk sekarang, section baru harus ditambahkan via database manual:
1. Buka **Neon Console** → **SQL Editor**
2. Jalankan:
```sql
INSERT INTO sections (slug, title, content, category, sort_order) 
VALUES ('slug-baru', 'Judul Baru', '<p>Konten HTML</p>', 'operasional', 20);
```

---

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| Admin panel error 500 | Cek `DATABASE_URL` di Vercel Settings sudah benar |
| Login gagal | Cek `ADMIN_PASSWORD` di Vercel Settings |
| Gambar gagal upload | Cek `CLOUDINARY_API_KEY` dan `CLOUDINARY_API_SECRET` |
| Data kosong di admin | Jalankan seed script (langkah 4) |
| Perubahan tidak muncul di web | Refresh browser (hard refresh: Ctrl+Shift+R) |
| Error "No database connection" | `.env.local` tidak perlu. Cukup di Vercel Settings |

---

## Ringkasan Akun yang Perlu Dibuat

| Service | Link | Keperluan | Biaya |
|---------|------|-----------|-------|
| **Neon** | https://console.neon.tech | Database PostgreSQL | Gratis |
| **Cloudinary** | https://cloudinary.com | Hosting gambar | Gratis (25GB) |
| **Vercel** | https://vercel.com | Hosting website | Gratis |
| **GitHub** | https://github.com | Source code | Gratis |
