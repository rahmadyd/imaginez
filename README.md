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
- `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_STORAGE_BUCKET` - metadata template, share sementara, dan overlay (server-side). Jika kosong, app memakai store lokal `data/` (dev) dan seed `public/seed/`.
- `SUPABASE_PUBLISHABLE_KEY` - publishable key (`sb_publishable_...`) untuk login admin lewat Supabase Auth.
- `ADMIN_EMAIL` - email yang boleh login ke dashboard (pisahkan dengan koma jika lebih dari satu). Wajib diisi; jika kosong semua login ditolak.

### Supabase (production)
1. Buat project & bucket storage (mis. `templates`).
2. Jalankan migrasi di SQL Editor, urut:
   - `migrations/supabase_init.sql` (tabel `templates`)
   - `migrations/supabase_analytics.sql` (`booth_events`, kolom `is_active`/`usage_count`)
   - `migrations/supabase_photo_shares.sql` (tabel `photo_shares` untuk share sementara TTL ~5 menit)
3. Buat user admin di Supabase Dashboard → Authentication → Users, lalu catat emailnya.
4. Set env vars di Cloudflare Dashboard → Workers → Settings → Variables and Secrets:
   - `SUPABASE_URL`
   - `SUPABASE_SECRET_KEY` (new 2026 format `sb_secret_...`; legacy `SUPABASE_SERVICE_ROLE_KEY` juga masih didukung)
   - `SUPABASE_PUBLISHABLE_KEY` (new 2026 format `sb_publishable_...`)
   - `SUPABASE_STORAGE_BUCKET`
   - `ADMIN_EMAIL`
5. Deploy: `pnpm deploy`

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
- **Kredensial:** dikelola di Supabase Auth (`Authentication → Users`). Server memverifikasi lewat `supabase.auth.signInWithPassword`, lalu hanya email yang terdaftar di `ADMIN_EMAIL` yang boleh masuk.
- **Hash password:** Password disimpan di Supabase Auth (bcrypt), bukan di repo ini. Tidak ada `password_hash` di database aplikasi.
- **Membuat template baru:** di `/admin`, unggah file PNG (punya area transparan/alpha), lalu atur slot/nama/publish di editor dan simpan. Template yang dipublish tampil di halaman pilih template user.