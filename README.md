# imaginez — Web Photobooth

Photobooth web: pilih template, ambil foto, unduh strip. Foto user diproses di perangkat (canvas) dan **tidak pernah** dikirim/disimpan ke server.

## Stack
- Next.js (App Router), TypeScript, Tailwind, Zod, Vitest, Playwright
- Backend template (admin): **Cloudflare D1 + R2** (via `@opennextjs/cloudflare`). Fallback dev lokal (filesystem `data/`) jika env `USE_LOCAL_FALLBACK=true`.

## Setup
```bash
pnpm install
cp .env.example .env.local   # isi sesuai kebutuhan
pnpm dev
```

### Environment
Lihat `.env.example`.
- `SESSION_SECRET` - tanda tangan sesi admin (min 32 char random).
- `ADMIN_EMAIL` - email admin (fallback dev: `admin@imaginez.local`).
- `ADMIN_PASSWORD_HASH` - sha256 hex kata sandi admin. Jika kosong di non-production, login dev fallback aktif.
- `USE_LOCAL_FALLBACK` - set `true` untuk pakai store lokal `data/` (dev/test tanpa D1/R2).

### Cloudflare D1 + R2
1. Buat database D1: `wrangler d1 create imaginez-templates`
2. Update `wrangler.toml` dengan `database_id` dari output di atas.
3. Buat bucket R2: `wrangler r2 bucket create imaginez-templates`
4. Jalankan migrasi:
   ```bash
   # Local
   wrangler d1 execute imaginez-templates --local --file=./migrations/0001_init.sql
   # Production
   wrangler d1 execute imaginez-templates --remote --file=./migrations/0001_init.sql
   ```
5. Set env vars di Cloudflare Dashboard → Workers/Pages → Settings → Environment Variables:
   - `SESSION_SECRET`
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD_HASH`
6. Deploy:
   ```bash
   pnpm deploy
   ```

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

## Admin
- **Login:** `/login` (butuh email + kata sandi). Dashboard admin (`/admin`) & API admin hanya bisa diakses setelah login.
- **Kredensial lokal (dev, saat `ADMIN_PASSWORD_HASH` kosong & bukan production):**
  - Email: `admin@imaginez.local`
  - Password: `admin`
- **Production:** set `ADMIN_EMAIL` dan `ADMIN_PASSWORD_HASH` (sha256 hex). Contoh hash: `node -e "console.log(require('crypto').createHash('sha256').update('PASSWORD').digest('hex'))"`.
- **Membuat template baru:** di `/admin`, unggah file PNG (punya area transparan/alpha), lalu atur slot/nama/publish di editor dan simpan. Template yang dipublish tampil di halaman pilih template user.