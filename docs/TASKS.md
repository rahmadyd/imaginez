# TASKS â€” Web Photobooth

> Kerjakan berurutan, satu tugas per giliran. Centang `[x]` setelah **AC** terpenuhi dan terbukti. Aturan kerja ada di `AGENTS.md`.

Legenda: **AC** = acceptance criteria.

---

## Fase 0 â€” Fondasi

- [x] **T0.1 Inisialisasi proyek**
  Next.js (App Router), TypeScript strict, Tailwind, ESLint, Prettier, pnpm, Vitest, Playwright.
  **AC:** `pnpm dev`, `build`, `lint`, `typecheck`, `test` semuanya jalan tanpa error.

- [x] **T0.2 Design tokens dan font**
  Buat `src/styles/tokens.css` sesuai `DESIGN.md` Â§2. Muat Fraunces, Archivo, IBM Plex Mono lewat `next/font`. Petakan token ke tema Tailwind dan nonaktifkan palet bawaan.
  **AC:** halaman uji menampilkan ketiga font dan kelima warna. `grep` palet Tailwind bawaan di `src/` kosong.

- [x] **T0.3 Template seed**
  Skrip `scripts/make-seed.ts` yang menghasilkan 2 PNG transparan + JSON: strip 1Ã—6 (1200Ã—3600) dan grid 2Ã—3 (1200Ã—1800), di `public/seed/`.
  **AC:** kedua JSON lolos validasi Zod (dibuat di T2.1) dan semua slot berada dalam canvas.

- [x] **T0.4 Header keamanan**
  Terapkan CSP, Permissions-Policy, Referrer-Policy sesuai `ARCHITECTURE.md` Â§8.
  **AC:** respons memuat semua header. Halaman tetap berfungsi (font, gambar, kamera) dengan CSP aktif.

---

## Fase 1 â€” Kamera dan capture

- [x] **T1.1 `useCamera`**
  Start/stop, `facingMode`, ganti kamera, status, dan error bertipe (`denied`, `not-found`, `in-use`, `insecure-context`, `unknown`).
  **AC:** `stop()` menghentikan semua track. Setiap tipe error menghasilkan state yang bisa dibedakan. Dites dengan mock `getUserMedia`.

- [x] **T1.2 `captureFrame`**
  `captureFrame(video, targetAspect, maxSide=1920)` mengembalikan `ImageBitmap` hasil center-crop.
  **AC:** unit test untuk beberapa kombinasi rasio (video 16:9, 4:3, 9:16 terhadap slot 2:1, 1:1, 3:4). Sisi terpanjang tidak melebihi `maxSide`.

- [x] **T1.3 Fallback galeri**
  Input file â†’ `ImageBitmap` dipotong sesuai rasio slot. File dibaca lokal.
  **AC:** tidak ada request jaringan saat memilih file (dibuktikan di e2e nanti).

---

## Fase 2 â€” Compositor

- [x] **T2.1 Tipe dan skema template**
  `Template`, `Slot`, skema Zod, helper `slotAspect`.
  **AC:** skema menolak slot di luar canvas, `w/h â‰¤ 0`, dan template tanpa slot.

- [x] **T2.2 `renderStrip`**
  Urutan layer: background â†’ foto per slot (rotasi, clip, cover-crop) â†’ overlay.
  **AC:** pembanding piksel pada template seed dengan foto warna solid menghasilkan hasil sesuai (toleransi kecil). Slot kosong tampil sebagai area background.

- [x] **T2.3 Ekspor dan unduh**
  `exportBlob` PNG/JPEG, helper unduh, helper Web Share (file), penanganan iOS Safari.
  **AC:** blob PNG berukuran = canvas template. Di perangkat tanpa Web Share, unduh tetap berjalan.

- [x] **T2.4 Pemuatan overlay same-origin**
  Klien memuat overlay lewat `/api/templates/:id/overlay` (sementara menunjuk `public/seed`).
  **AC:** `canvas.toBlob()` berhasil, tidak ada error *tainted canvas*.

---

## Fase 3 - Alur user

- [x] **T3.1 State machine sesi**
  idle -> choosing -> permission -> capturing -> reviewing -> done, store hanya di memori.
  **AC:** transisi ilegal ditolak. Unit test pada semua transisi. (	ests/unit/session-machine.test.ts)

- [x] **T3.2 wipe() dan idle timer**
  Lepas semua ImageBitmap, blob URL, canvas, stream, dan reset store. Pemicu: Selesai, idle (default 3 menit), pagehide, mulai ulang.
  **AC:** unit test memverifikasi close() dan 
evokeObjectURL dipanggil. Idle timer ter-reset oleh interaksi. (	ests/unit/session-wipe.test.ts, 	ests/unit/session-idle.test.ts)

- [x] **T3.3 S0 Landing + transisi tirai** *(ritual AI-SLOP)*
  **AC:** sesuai DESIGN.md S0. Tirai membuka 600 ms. prefers-reduced-motion memakai fade. (src/app/page.tsx)

- [x] **T3.4 S1 Pilih template** *(ritual AI-SLOP)*
  Sementara membaca dari seed.
  **AC:** keadaan memuat, kosong, error, dan terpilih tersedia. Tombol Lanjut nonaktif tanpa pilihan. (src/app/booth/page.tsx, /api/templates)

- [x] **T3.5 S2 Primer izin + keadaan ditolak** *(ritual AI-SLOP)*
  **AC:** tiga baris penjelasan sesuai copy. Keadaan ditolak menampilkan panduan dan opsi galeri. Kamera device user via getUserMedia dipicu klik "Izinkan kamera". (src/components/PermissionScreen.tsx, src/features/camera/useCamera.ts)

- [x] **T3.6 S3 Capture** *(ritual AI-SLOP)*
  Viewfinder berrasio slot aktif, countdown, flash, progress, mode Otomatis/Manual, batal.
  **AC:** semua slot terisi berurutan di mode Otomatis. Preview mirror, hasil tidak dimirror. Foto ke-N masuk slot ke-N. Fallback galeri lokal per-slot (file dibaca lokal, tidak diunggah). (src/app/booth/page.tsx)

- [x] **T3.7 S4 Review** *(ritual AI-SLOP)*
  Strip hasil, ulang satu slot, ulang semua, unduh, bagikan, animasi tercetak.
  **AC:** mengulang satu slot hanya mengubah slot itu. File unduhan benar berukuran canvas template. (src/features/compositor/render.ts)

- [x] **T3.8 S5 Selesai + e2e privasi**
  **AC:** Playwright (kamera palsu) menjalankan alur penuh dan membuktikan: (a) tidak ada request keluar dengan body gambar, (b) setelah "Selesai", localStorage, sessionStorage, IndexedDB, dan Cache Storage tidak memuat data foto, (c) kamera mati di halaman hasil (0 track video `live`). (	ests/e2e/privacy.spec.ts)

- [x] **T3.9 Alur galeri pra-sesi** *(ritual AI-SLOP)*
  User boleh memilih foto dari galeri di layar izin (kamera tetap mati), mengisi slot satu per satu di layar pengisian, atau alih ke kamera kapan saja. Retake hasil galeri kembali ke layar pengisian.
  **AC:** e2e membuktikan alur galeri mengisi semua slot lalu masuk review dengan **0 panggilan `getUserMedia`**; file dibaca lokal (tidak ada upload). (src/app/booth/page.tsx, src/features/session/machine.ts, src/components/PermissionScreen.tsx, tests/e2e/gallery.spec.ts)
---

## Fase 4 - Admin

- [x] **T4.1 Skema D1 dan repository**
  Migrasi sesuai ARCHITECTURE.md A5, fungsi CRUD bertipe.
  **AC:** migrasi berjalan di lokal. Test repository lulus. (migrations/0001_init.sql, src/lib/cf-types.ts, src/lib/db.ts + local D1/R2 fallback, src/lib/templates-repo.ts, 	ests/unit/templates-repo.test.ts)

- [x] **T4.2 Upload R2 dan rute overlay**
  Validasi MIME, magic bytes PNG, alpha, ukuran, dimensi.
  **AC:** file tidak valid ditolak dengan pesan jelas. Overlay tersaji same-origin dengan cache header. (src/lib/png.ts, src/app/api/admin/templates/route.ts, src/app/api/admin/templates/[id]/route.ts, src/app/api/templates/[id]/overlay/route.ts)

- [x] **T4.3 Autentikasi admin**
  Login, cookie sesi, middleware, rate limit.
  **AC:** /admin/* dan /api/admin/* mengembalikan 401/redirect tanpa sesi. Percobaan ke-6 dalam 10 menit ditolak. (src/lib/auth.ts, src/lib/rate-limit.ts, src/proxy.ts, src/app/api/admin/login|logout, 	ests/unit/admin-auth.test.ts)

- [x] **T4.4 Daftar template admin** *(ritual AI-SLOP)*
  Toggle publish, drag reorder, hapus dengan konfirmasi.
  **AC:** urutan dan status tersimpan dan tercermin di /api/templates. (src/app/admin/page.tsx, PATCH /api/admin/templates/reorder)

- [x] **T4.5 Alur unggah template** *(ritual AI-SLOP)*
  **AC:** PNG valid membuat draft dan membuka editor. (POST /api/admin/templates, UI unggah di /admin -> redirect ke editor)

- [x] **T4.6 Slot editor manual** *(ritual AI-SLOP)*
  Tambah, geser, resize, rotasi, hapus, gandakan, urutan, snap 8 px, nudge keyboard, zoom/pan.
  **AC:** semua interaksi di DESIGN.md bagian Admin berfungsi. Validasi mencegah slot di luar canvas. (src/app/admin/templates/[id]/page.tsx)

- [x] **T4.7 Deteksi slot otomatis**
  Sesuai ARCHITECTURE.md A7.5.
  **AC:** unit test pada gambar sintetis (strip 1A-6, grid 2A-3, satu lubang miring). Bintik kecil diabaikan. Hasil terurut reading order. (src/features/admin/auto-detect.ts, 	ests/unit/auto-detect.test.ts)

- [x] **T4.8 Preview dummy, simpan, peringatan perubahan**
  **AC:** toggle preview menampilkan foto dummy di semua slot. Keluar halaman dengan perubahan belum tersimpan memunculkan peringatan. (/admin/templates/[id]: eforeunload, dirty flag)

- [x] **T4.10 Posisi layer foto (belakang / depan frame)**
  Panel editor: dropdown POSISI FOTO (Di Belakang Frame / Di Depan Frame) di bawah BLEED, disimpan bersama template. Preview editor dan hasil user memakai urutan layer yang sama.
  **AC:** unit test compositor membuktikan urutan gambar foto vs overlay untuk kedua mode; template lama default 'behind'; nilai tersimpan di database dan dipakai saat render hasil user. (src/features/compositor/render.ts, src/features/templates/schema.ts, src/lib/templates-repo.ts, src/app/admin/templates/[id]/page.tsx)

- [x] **T4.11 Audit proteksi rute admin**
  Proxy (Edge) + server layout + logout harus menutup akses /admin tanpa sesi.
  **AC:** e2e membuktikan /admin dan sub-rute dialihkan ke /login tanpa sesi, prefetch tidak membocorkan isi dashboard, /api/admin/* menjawab 401, dan siklus login → logout menutup akses kembali. (src/proxy.ts, src/app/admin/layout.tsx, tests/e2e/admin-auth.spec.ts)

- [x] **T4.9 Ganti seed dengan data nyata**
  Sisi user membaca /api/templates dari D1.
  **AC:** template yang dipublish admin muncul di S1 tanpa deploy ulang. Draft tidak muncul. (GET /api/templates prioritas DB published, fallback seed bila kosong; overlay route DB/R2 lalu seed)
---

## Fase 5 â€” Polish

- [ ] **T5.1 Gerak** â€” tirai, countdown, thumbnail terbang, strip tercetak, tombol tekan. Semua punya varian reduced-motion.
- [ ] **T5.2 Suara dan haptic** â€” klik rana dan tik countdown via WebAudio, tombol bisu, `vibrate(15)`.
- [ ] **T5.3 Audit aksesibilitas** â€” kontras AA, fokus terlihat, keyboard (Spasi/Enter/Esc), `aria-live` countdown, pengelolaan fokus antar layar.
- [ ] **T5.4 Microcopy dan state** â€” seluruh teks lewat `copy.ts`, semua loading/kosong/error terisi sesuai `DESIGN.md` Â§8.
- [ ] **T5.5 Review anti-slop menyeluruh** â€” jalankan semua tes `AI-SLOP.md` Â§3 pada semua layar. **AC:** `docs/REVIEW-NOTES.md` terisi untuk setiap layar, dengan screenshot mobile 390 px dan desktop 1280 px.
- [ ] **T5.6 Matriks perangkat** â€” uji alur penuh dan catat hasil:

| Perangkat | Kamera | Unduh | Share | Catatan |
|---|---|---|---|---|
| iOS Safari | | | | depan/belakang (T10) |
| Chrome Android | | | | depan/belakang (T10) |
| Chrome desktop | | | | dua kamera bawaan + USB/virtual (T10) |
| Safari desktop | | | | |
| Firefox desktop | | | | |

---

## Fase 6 â€” Rilis

- [ ] **T6.1 Deploy** — Vercel + Supabase (env/binding/domain). **AC:** alur penuh jalan di HTTPS produksi. *(butuh kredensial/env dari Anda)*
- [x] **T6.2 Halaman privasi** — `/privasi`, bahasa sederhana: apa yang diproses, di mana, kapan dihapus. (`src/app/privasi/page.tsx`)
- [ ] **T6.3 Verifikasi privasi akhir** â€” jalankan e2e privasi di URL produksi, cek tab Network manual, pastikan CSP `connect-src 'self'` aktif.
- [x] **T6.4 README** — cara menjalankan, cara membuat template baru (untuk admin), cara menambah admin credential. (`README.md`)

---

## Fase 10 — Pilihan kamera

- [x] **T10.1 Deteksi mode dan daftar kamera** (`features/camera`)
  Mode "mobile" jika `matchMedia('(pointer: coarse)').matches && navigator.maxTouchPoints > 0`, selain itu "desktop" (bukan user agent). Fungsi murni + unit test. Jika stream aktif tapi `track.getSettings().facingMode` kosong, perlakukan sebagai "desktop" (pemilih daftar). Tombol depan/belakang hanya jika >1 kamera. Perluas `useCamera`: `mode`, `facing` ("user"|"environment"), `devices` (videoinput), `activeDeviceId`, `switchFacing()`, `selectDevice(id)`, `refreshDevices()`. `enumerateDevices` setelah izin; label kosong → "Kamera 1", "Kamera 2", dst. Dengarkan `devicechange`; jika kamera aktif hilang fallback ke default + toast.
  **AC:** unit test mode, label kosong, dan devicechange lulus.

- [x] **T10.2 Mobile: depan / belakang**
  Constraint `facingMode`: coba `{ exact }` dulu, jika `OverconstrainedError` ulangi `{ ideal }`. Tanpa daftar lensa (wide/ultra/tele). Preview depan dicerminkan (`scaleX(-1)`), belakang tidak; hasil capture mengikuti kondisi mirror preview saat jepret ditekan (ARCHITECTURE §7.1). Pindah kamera: hentikan semua track lama (`track.stop()`) dulu, baru buka baru; tampilkan keadaan "memuat" singkat.
  **AC:** pindah depan↔belakang melepas track lama (test). Preview cermin hanya kamera depan.

- [x] **T10.3 Desktop: pemilih kamera**
  Kontrol "Kamera" di Capture membuka menu/dialog daftar kamera dengan penanda aktif. Pemilihan `deviceId: { exact: id }`. Toggle "Cermin preview" (default aktif), berlaku pada preview dan hasil jepretan. Pilihan terakhir boleh disimpan di `localStorage` (`pb:camera`, hanya mode/facing/deviceId/mirror, tanpa data foto); jika `deviceId` tak ada, abaikan.
  **AC:** memilih kamera lain mengganti stream dan menghentikan stream lama.

- [x] **T10.4 Aturan umum**
  Pindah/pilih dinonaktifkan selama countdown dan saat pengambilan foto. Foto di nampan tetap (boleh dari kamera berbeda). Resolusi ideal 1920×1080 (portrait menyesuaikan); `captureFrame` tetap center-crop ke `layout.captureAspect`. `NotReadableError` → pesan DESIGN §8 + "Pilih kamera lain" (desktop)/"Coba kamera lain" (mobile). Deteksi browser dalam aplikasi (UA) hanya untuk petunjuk "Buka di Chrome atau Safari" saat `getUserMedia` gagal. Privasi ARCHITECTURE §2; semua track dihentikan saat `wipe()`.
  **AC:** e2e privasi tetap lulus.

- [ ] **T10.5 UI (ritual docs/AI-SLOP.md §4)**
  S3: tombol "Balik kamera" (mobile) / "Kamera" (desktop) ikon khusus (bukan emoji/ikon bawaan tak dikustomisasi), target sentuh ≥ 48px, bayangan keras. Mobile dekat shutter, mudah dijangkau jempol. Teks baru di `copy.ts`: "Kamera depan", "Kamera belakang", "Pilih kamera", "Cermin preview", dan pesan kamera dipakai aplikasi lain.
  **AC:** screenshot mobile 390px dan desktop 1280px, catatan di `docs/REVIEW-NOTES.md`.

---

## Backlog (jangan dikerjakan sebelum MVP selesai)

- Filter sederhana (Normal, B&W, Hangat)
- Link/QR berbagi dengan penyimpanan sementara ber-TTL pendek (butuh keputusan privasi baru)
- Mode kiosk (layar penuh, tanpa navigasi, auto-reset)
- Kategori template
- Statistik agregat tanpa identitas (template terpopuler)




