# imaginez — Web Photobooth

Photobooth web: pilih template, ambil foto, unduh strip. Foto user diproses di perangkat (canvas) dan **tidak pernah** dikirim/disimpan ke server.

## Stack
- Next.js (App Router), TypeScript, Tailwind, Zod, Vitest, Playwright
- Backend template (admin): **Supabase Postgres + Supabase Storage** (Vercel). Fallback dev lokal (filesystem `data/`) jika env Supabase tidak diset.

## Setup
```bash
pnpm install
cp .env.example .env.local   # isi sesuai kebutuhan
pnpm dev
```

### Environment
Lihat `.env.example`.
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET` - metadata template & overlay (server-side). Jika kosong, app memakai store lokal `data/` (dev) dan seed `public/seed/`.
- `SESSION_SECRET` - tanda tangan sesi admin.
- `ADMIN_EMAIL` - email admin (fallback dev: `admin@imaginez.local`).
- `ADMIN_PASSWORD_HASH` - sha256 hex kata sandi admin. Jika kosong di non-production, login dev fallback aktif.

### Supabase (saat siap)
1. Buat project & bucket storage (mis. `templates`, public read untuk overlay).
2. Jalankan `migrations/supabase_init.sql` di SQL editor.
3. Set env di Vercel/local (termasuk `ADMIN_EMAIL` & `ADMIN_PASSWORD_HASH`).

## Perintah
```bash
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm e2e
```

## Catatan privasi
- Tidak ada request jaringan yang membawa data foto user; tidak ada persistensi foto di storage browser/SW.
- Foto dilepas lewat `wipe()` saat Selesai, idle, `pagehide`, atau mulai ulang.
- Overlay template disajikan same-origin via `/api/templates/:id/overlay`.

## Admin
- **Login:** `/login` (butuh email + kata sandi). Dashboard admin (`/admin`) & API admin hanya bisa diakses setelah login.
- **Kredensial lokal (dev, saat `ADMIN_PASSWORD_HASH` kosong & bukan production):**
  - Email: `admin@imaginez.local`
  - Password: `admin`
- **Production:** set `ADMIN_EMAIL` dan `ADMIN_PASSWORD_HASH` (sha256 hex). Contoh hash: `node -e "console.log(require('crypto').createHash('sha256').update('PASSWORD').digest('hex'))"`.
- **Membuat template baru:** di `/admin`, unggah file PNG (punya area transparan/alpha), lalu atur slot/nama/publish di editor dan simpan. Template yang dipublish tampil di halaman pilih template user.
