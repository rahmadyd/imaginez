# imaginez — Web Photobooth

Photobooth web: pilih template, ambil foto, unduh strip. Foto user diproses di perangkat (canvas) dan **tidak pernah** dikirim/disimpan ke server.

## Stack
- Next.js (App Router), TypeScript, Tailwind, Zod, Vitest, Playwright
- Backend (admin, template, share sementara, analytics): **Supabase Postgres + Supabase Storage**. Deploy via `@opennextjs/cloudflare` ke Cloudflare Workers. Fallback dev lokal (filesystem `data/`) jika env Supabase tidak diset.

## Setup
```bash
pnpm install
cp .env.example .env.local   # isi sesuai kebutuhan
pnpm dev
```

### Environment
Lihat `.env.example`.
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET` - metadata template, share sementara, dan overlay (server-side). Jika kosong, app memakai store lokal `data/` (dev) dan seed `public/seed/`.
- `SESSION_SECRET` - tanda tangan sesi admin.
- `ADMIN_EMAIL` - email admin (fallback: `admin@imaginez.local`).
- `ADMIN_PASSWORD_HASH` - sha256 hex kata sandi admin. Jika ada kredensial di tabel `admin_accounts`, itu yang dipakai; selainnya fallback ke env ini. Jika kosong di non-production, login dev fallback aktif.

### Supabase (production)
1. Buat project & bucket storage (mis. `templates`).
2. Jalankan migrasi di SQL Editor, urut:
   - `migrations/supabase_init.sql` (tabel `templates`)
   - `migrations/supabase_admin.sql` (tabel `admin_accounts` + seed admin — **ganti email & password_hash sebelum production**)
   - `migrations/supabase_analytics.sql` (`booth_events`, kolom `is_active`/`usage_count`)
   - `migrations/supabase_photo_shares.sql` (tabel `photo_shares` untuk share sementara TTL ~5 menit)
3. Set env vars di Cloudflare Dashboard → Workers → Settings → Variables and Secrets:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_STORAGE_BUCKET`
   - `SESSION_SECRET`
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD_HASH`
4. Deploy: `pnpm deploy`

## Perintah
```bash
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm e2e
pnpm preview    # OpenNext Cloudflare preview lokal
pnpm deploy     # OpenNext Cloudflare deploy ke production
```

## Catatan privasi
- Tidak ada request jaringan yang membawa data foto user; tidak ada persistensi foto di storage browser/SW.
- Foto dilepas lewat `wipe()` saat Selesai, idle, `pagehide`, atau mulai ulang.
- Overlay template disajikan same-origin via `/api/templates/:id/overlay`.
- Share (opsional, opt-in user) menyimpan foto ke Supabase Storage dengan TTL ~5 menit lalu dihapus.

## Admin
- **Login:** `/login` (butuh email + kata sandi). Dashboard admin (`/admin`) & API admin hanya bisa diakses setelah login.
- **Kredensial:** jika tabel `admin_accounts` terisi, login memakai data tersebut (sha256 hex). Jika tidak, pakai env `ADMIN_EMAIL` + `ADMIN_PASSWORD_HASH`.
- **Kredensial lokal (dev, saat Supabase & `ADMIN_PASSWORD_HASH` kosong & bukan production):**
  - Email: `admin@imaginez.local`
  - Password: `admin`
- **Hash password:** `node -e "console.log(require('crypto').createHash('sha256').update('PASSWORD').digest('hex'))"`.
- **Membuat template baru:** di `/admin`, unggah file PNG (punya area transparan/alpha), lalu atur slot/nama/publish di editor dan simpan. Template yang dipublish tampil di halaman pilih template user.