# TASKS — Web Photobooth

> Kerjakan berurutan, satu tugas per giliran. Centang `[x]` setelah **AC** terpenuhi dan terbukti. Aturan kerja ada di `AGENTS.md`.

Legenda: **AC** = acceptance criteria.

---

## Fase 0 — Fondasi

- [x] **T0.1 Inisialisasi proyek**
  Next.js (App Router), TypeScript strict, Tailwind, ESLint, Prettier, pnpm, Vitest, Playwright.
  **AC:** `pnpm dev`, `build`, `lint`, `typecheck`, `test` semuanya jalan tanpa error.

- [x] **T0.2 Design tokens dan font**
  Buat `src/styles/tokens.css` sesuai `DESIGN.md` §2. Muat Fraunces, Archivo, IBM Plex Mono lewat `next/font`. Petakan token ke tema Tailwind dan nonaktifkan palet bawaan.
  **AC:** halaman uji menampilkan ketiga font dan kelima warna. `grep` palet Tailwind bawaan di `src/` kosong.

- [x] **T0.3 Template seed**
  Skrip `scripts/make-seed.ts` yang menghasilkan 2 PNG transparan + JSON: strip 1×6 (1200×3600) dan grid 2×3 (1200×1800), di `public/seed/`.
  **AC:** kedua JSON lolos validasi Zod (dibuat di T2.1) dan semua slot berada dalam canvas.

- [x] **T0.4 Header keamanan**
  Terapkan CSP, Permissions-Policy, Referrer-Policy sesuai `ARCHITECTURE.md` §8.
  **AC:** respons memuat semua header. Halaman tetap berfungsi (font, gambar, kamera) dengan CSP aktif.

---

## Fase 1 — Kamera dan capture

- [x] **T1.1 `useCamera`**
  Start/stop, `facingMode`, ganti kamera, status, dan error bertipe (`denied`, `not-found`, `in-use`, `insecure-context`, `unknown`).
  **AC:** `stop()` menghentikan semua track. Setiap tipe error menghasilkan state yang bisa dibedakan. Dites dengan mock `getUserMedia`.

- [x] **T1.2 `captureFrame`**
  `captureFrame(video, targetAspect, maxSide=1920)` mengembalikan `ImageBitmap` hasil center-crop.
  **AC:** unit test untuk beberapa kombinasi rasio (video 16:9, 4:3, 9:16 terhadap slot 2:1, 1:1, 3:4). Sisi terpanjang tidak melebihi `maxSide`.

- [x] **T1.3 Fallback galeri**
  Input file → `ImageBitmap` dipotong sesuai rasio slot. File dibaca lokal.
  **AC:** tidak ada request jaringan saat memilih file (dibuktikan di e2e nanti).

---

## Fase 2 — Compositor

- [x] **T2.1 Tipe dan skema template**
  `Template`, `Slot`, skema Zod, helper `slotAspect`.
  **AC:** skema menolak slot di luar canvas, `w/h ≤ 0`, dan template tanpa slot.

- [ ] **T2.2 `renderStrip`**
  Urutan layer: background → foto per slot (rotasi, clip, cover-crop) → overlay.
  **AC:** pembanding piksel pada template seed dengan foto warna solid menghasilkan hasil sesuai (toleransi kecil). Slot kosong tampil sebagai area background.

- [ ] **T2.3 Ekspor dan unduh**
  `exportBlob` PNG/JPEG, helper unduh, helper Web Share (file), penanganan iOS Safari.
  **AC:** blob PNG berukuran = canvas template. Di perangkat tanpa Web Share, unduh tetap berjalan.

- [ ] **T2.4 Pemuatan overlay same-origin**
  Klien memuat overlay lewat `/api/templates/:id/overlay` (sementara menunjuk `public/seed`).
  **AC:** `canvas.toBlob()` berhasil, tidak ada error *tainted canvas*.

---

## Fase 3 — Alur user

- [ ] **T3.1 State machine sesi**
  `idle → choosing → permission → capturing → reviewing → done`, store hanya di memori.
  **AC:** transisi ilegal ditolak. Unit test pada semua transisi.

- [ ] **T3.2 `wipe()` dan idle timer**
  Lepas semua `ImageBitmap`, blob URL, canvas, stream, dan reset store. Pemicu: Selesai, idle (default 3 menit), `pagehide`, mulai ulang.
  **AC:** unit test memverifikasi `close()` dan `revokeObjectURL` dipanggil. Idle timer ter-reset oleh interaksi.

- [ ] **T3.3 S0 Landing + transisi tirai** *(ritual AI-SLOP)*
  **AC:** sesuai `DESIGN.md` S0. Tirai membuka 600 ms. `prefers-reduced-motion` memakai fade.

- [ ] **T3.4 S1 Pilih template** *(ritual AI-SLOP)*
  Sementara membaca dari seed.
  **AC:** keadaan memuat, kosong, error, dan terpilih tersedia. Tombol Lanjut nonaktif tanpa pilihan.

- [ ] **T3.5 S2 Primer izin + keadaan ditolak** *(ritual AI-SLOP)*
  **AC:** tiga baris penjelasan sesuai copy. Keadaan ditolak menampilkan panduan dan opsi galeri.

- [ ] **T3.6 S3 Capture** *(ritual AI-SLOP)*
  Viewfinder berrasio slot aktif, countdown, flash, progress, mode Otomatis/Manual, batal.
  **AC:** semua slot terisi berurutan di mode Otomatis. Preview mirror, hasil tidak dimirror. Foto ke-N masuk slot ke-N.

- [ ] **T3.7 S4 Review** *(ritual AI-SLOP)*
  Strip hasil, ulang satu slot, ulang semua, unduh, bagikan, animasi tercetak.
  **AC:** mengulang satu slot hanya mengubah slot itu. File unduhan benar berukuran canvas template.

- [ ] **T3.8 S5 Selesai + e2e privasi**
  **AC:** Playwright (kamera palsu) menjalankan alur penuh dan membuktikan:
  (a) tidak ada request keluar dengan body gambar,
  (b) setelah "Selesai", `localStorage`, `sessionStorage`, IndexedDB, dan Cache Storage tidak memuat data foto.

---

## Fase 4 — Admin

- [ ] **T4.1 Skema D1 dan repository**
  Migrasi sesuai `ARCHITECTURE.md` §5, fungsi CRUD bertipe.
  **AC:** migrasi berjalan di lokal. Test repository lulus.

- [ ] **T4.2 Upload R2 dan rute overlay**
  Validasi MIME, magic bytes PNG, alpha, ukuran, dimensi.
  **AC:** file tidak valid ditolak dengan pesan jelas. Overlay tersaji same-origin dengan cache header.

- [ ] **T4.3 Autentikasi admin**
  Login, cookie sesi, middleware, rate limit.
  **AC:** `/admin/*` dan `/api/admin/*` mengembalikan 401/redirect tanpa sesi. Percobaan ke-6 dalam 10 menit ditolak.

- [ ] **T4.4 Daftar template admin** *(ritual AI-SLOP)*
  Toggle publish, drag reorder, hapus dengan konfirmasi.
  **AC:** urutan dan status tersimpan dan tercermin di `/api/templates`.

- [ ] **T4.5 Alur unggah template** *(ritual AI-SLOP)*
  **AC:** PNG valid membuat draft dan membuka editor.

- [ ] **T4.6 Slot editor manual** *(ritual AI-SLOP)*
  Tambah, geser, resize, rotasi, hapus, gandakan, urutan, snap 8 px, nudge keyboard, zoom/pan.
  **AC:** semua interaksi di `DESIGN.md` bagian Admin berfungsi. Validasi mencegah slot di luar canvas.

- [ ] **T4.7 Deteksi slot otomatis**
  Sesuai `ARCHITECTURE.md` §7.5.
  **AC:** unit test pada gambar sintetis (strip 1×6, grid 2×3, satu lubang miring). Bintik kecil diabaikan. Hasil terurut reading order.

- [ ] **T4.8 Preview dummy, simpan, peringatan perubahan**
  **AC:** toggle preview menampilkan foto dummy di semua slot. Keluar halaman dengan perubahan belum tersimpan memunculkan peringatan.

- [ ] **T4.9 Ganti seed dengan data nyata**
  Sisi user membaca `/api/templates` dari D1.
  **AC:** template yang dipublish admin muncul di S1 tanpa deploy ulang. Draft tidak muncul.

---

## Fase 5 — Polish

- [ ] **T5.1 Gerak** — tirai, countdown, thumbnail terbang, strip tercetak, tombol tekan. Semua punya varian reduced-motion.
- [ ] **T5.2 Suara dan haptic** — klik rana dan tik countdown via WebAudio, tombol bisu, `vibrate(15)`.
- [ ] **T5.3 Audit aksesibilitas** — kontras AA, fokus terlihat, keyboard (Spasi/Enter/Esc), `aria-live` countdown, pengelolaan fokus antar layar.
- [ ] **T5.4 Microcopy dan state** — seluruh teks lewat `copy.ts`, semua loading/kosong/error terisi sesuai `DESIGN.md` §8.
- [ ] **T5.5 Review anti-slop menyeluruh** — jalankan semua tes `AI-SLOP.md` §3 pada semua layar. **AC:** `docs/REVIEW-NOTES.md` terisi untuk setiap layar, dengan screenshot mobile 390 px dan desktop 1280 px.
- [ ] **T5.6 Matriks perangkat** — uji alur penuh dan catat hasil:

| Perangkat | Kamera | Unduh | Share | Catatan |
|---|---|---|---|---|
| iOS Safari | | | | |
| Chrome Android | | | | |
| Chrome desktop | | | | |
| Safari desktop | | | | |
| Firefox desktop | | | | |

---

## Fase 6 — Rilis

- [ ] **T6.1 Deploy** — Cloudflare, binding D1/R2, environment, domain. **AC:** alur penuh jalan di HTTPS produksi.
- [ ] **T6.2 Halaman privasi** — `/privasi`, bahasa sederhana: apa yang diproses, di mana, kapan dihapus.
- [ ] **T6.3 Verifikasi privasi akhir** — jalankan e2e privasi di URL produksi, cek tab Network manual, pastikan CSP `connect-src 'self'` aktif.
- [ ] **T6.4 README** — cara menjalankan, cara membuat template baru (untuk admin), cara menambah admin credential.

---

## Backlog (jangan dikerjakan sebelum MVP selesai)

- Filter sederhana (Normal, B&W, Hangat)
- Link/QR berbagi dengan penyimpanan sementara ber-TTL pendek (butuh keputusan privasi baru)
- Mode kiosk (layar penuh, tanpa navigasi, auto-reset)
- Kategori template
- Statistik agregat tanpa identitas (template terpopuler)
