# imaginez — Web Photobooth

Photobooth berbasis web: pilih template, ambil foto, unduh strip. Foto user diproses sepenuhnya di perangkat (canvas) dan **tidak pernah** dikirim atau disimpan di server.

## Fitur

- Pilih template photo strip dari template yang dipublish admin.
- Ambil foto lewat kamera, atau isi slot dari galeri tanpa menyalakan kamera.
- Preview live dengan rasio dan area crop yang identik dengan hasil akhir strip.
- Review, retake per slot, unduh PNG/JPG, dan bagikan lewat Web Share API.
- Dashboard admin: unggah template PNG, atur slot, publish, dan lihat analytics.

## Stack

- Next.js (App Router), TypeScript, Tailwind CSS, Zod
- Vitest (unit test), Playwright (e2e test)
- Backend: Supabase (Postgres, Storage, Auth), deploy via OpenNext ke Cloudflare Workers
- Fallback dev lokal: store filesystem `data/` dan seed `public/seed/` bila env backend belum diisi

## Menjalankan secara lokal

```bash
pnpm install
cp .env.example .env.local   # isi sesuai kebutuhan
pnpm dev
```

Tanpa env backend, aplikasi berjalan memakai data seed di `public/seed/`.

## Environment

Daftar lengkap ada di `.env.example`.

| Variabel | Keterangan |
|---|---|
| `SUPABASE_URL` | URL project backend |
| `SUPABASE_SECRET_KEY` | Kunci server-side untuk API internal |
| `SUPABASE_PUBLISHABLE_KEY` | Kunci publishable untuk autentikasi admin |
| `SUPABASE_STORAGE_BUCKET` | Bucket penyimpanan file template |
| `ADMIN_EMAIL` | Email yang boleh masuk ke dashboard admin (pisahkan dengan koma untuk beberapa email) |

Env kosong berarti semua login admin ditolak dan aplikasi memakai fallback lokal.

## Perintah

```bash
pnpm dev         # server pengembangan
pnpm build       # build produksi
pnpm lint        # ESLint
pnpm typecheck   # tsc --noEmit
pnpm test        # unit test (Vitest)
pnpm e2e         # e2e test (Playwright, kamera palsu)
pnpm preview     # preview build OpenNext secara lokal
pnpm deploy      # deploy ke Cloudflare Workers
```

## Struktur

```
src/
  app/          route App Router (halaman user, admin, API)
  components/   komponen UI bersama
  features/     logika per fitur (camera, sesi, compositor, template, admin)
  lib/          utilitas, copy UI, klien backend
  styles/       token warna, tipografi, dan utilitas
tests/
  unit/         unit test
  e2e/          end-to-end test
docs/           spesifikasi, arsitektur, desain, dan catatan review
```

## Privasi & keamanan

- Tidak ada request jaringan yang membawa data foto user, dan tidak ada persistensi foto di browser.
- Foto dilepas dari memori saat sesi selesai, idle, `pagehide`, atau saat mulai ulang.
- Overlay template disajikan same-origin supaya canvas tidak ter-contaminasi (tainted).
- Admin memakai sesi login server-side; kredensial dan secret tidak disimpan di repo.

## Dokumentasi

- `docs/SPEC.md` — apa yang dibangun dan batasan cakupannya.
- `docs/ARCHITECTURE.md` — struktur sistem dan aturan privasi.
- `docs/DESIGN.md` — konsep visual dan token.
- `docs/AI-SLOP.md` — daftar pantangan UI dan ritual review.
- `docs/TASKS.md` — daftar pekerjaan dan statusnya.
- `docs/REVIEW-NOTES.md` — catatan review tiap perubahan UI.
- `AGENTS.md` — aturan kerja untuk contributor dan agent.
