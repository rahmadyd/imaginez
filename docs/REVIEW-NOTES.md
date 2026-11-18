# Review Notes — Anti-Slop Audit

Catatan audit dan verifikasi visual untuk setiap layar dan komponen UI sesuai aturan `AI-SLOP.md`.

## Halaman Uji Token & Tipografi (T0.2) — 2026-11-16
- Konsep: Lembar spesimen cetak bilik analog untuk memverifikasi palet warna kertas-tinta-merah dan ketiga font tipografi fisik.
- Lolos: swap / squint / palette / font / copy / ritme / konkret / state
  - **swap:** Lolos. Karakter visual khas kertas fisik, tinta tebal, bayangan offset 4px, tidak generik seperti SaaS.
  - **squint:** Lolos. Hirarki visual tegas: judul utama Fraunces sangat kontras, diikuti blok spesimen dan tombol CTA merah.
  - **palette:** Lolos. Audit regex `grep -rE "(indigo|violet|purple|slate|zinc|gray|neutral)-[0-9]"` dan hex di `src/` menghasilkan 0 temuan. Hanya token resmi (`--paper`, `--paper-2`, `--ink`, `--ink-2`, `--booth-red`, `--curtain`, `--flash`).
  - **font:** Lolos. Hanya memuat Fraunces (display), Archivo (body), dan IBM Plex Mono (mono) via `next/font`.
  - **copy:** Lolos. Bebas jargon pemasaran atau kata terlarang (tidak ada "unleash", "seamless", "selamat datang", dll).
  - **ritme:** Lolos. Terdapat variasi skala jarak (`gap-8`, `gap-4`, `gap-3`, `gap-2`) serta penempatan nomor seri asimetris di header.
  - **konkret:** Lolos. Semua elemen visual merepresentasikan instrumen cetak analog fisik: nomor seri stempel, pemisah garis putus-putus/perforasi, bayangan offset tanpa blur.
  - **state:** Lolos. Menampilkan spesimen tombol dengan state aktif dan tekan (`translate 2px` + penyusutan bayangan).
- Catatan atau perbaikan: Palet Tailwind default telah di-reset pada `@theme` (`--color-*: initial`) dan dipetakan penuh ke token desain.

## S0/S3/S4 + Editor Admin — progres (2026-11-16)
- **Konsep:** Tirai panggung & bilik foto analog (1920s theatre/cabaret) dengan frame template di atas foto; panel admin Backstage Box Office.
- **Gerak (T5.1 parsial):** tirai buka (S0) dan tirai samping capture (S3) `motion-reduce:transition-none`; countdown pop `--ease-snap` + strip preview “tercetak” (`anim-strip-print` 900ms) dengan fallback `prefers-reduced-motion: reduce` → fade 150ms (`src/app/globals.css`, `src/app/page.tsx`, `src/app/booth/page.tsx`). Tombol: transisi + `active:translate-y` (reduce-safe) di `Button`. Flash capture tetap singkat.
- **Compositor:** render `background → foto per slot → overlay` utuh (tanpa auto-punch) agar lubang manual/transparan overlay menampakkan foto; bleed slot dinonaktifkan agar tidak menimpa frame (`src/features/compositor/render.ts`, tes `tests/unit/compositor.test.ts`).
- **Editor admin:** bounding box slot high-contrast (border/outline/label/handle), kontrol bleed & radius, deteksi otomatis, “Lihat tanpa foto” (checkerboard), preview dummy, simpan `slots/bleed/radius`; tanpa fitur lubang/hapus-lubang otomatis (frame dibolongi manual) (`src/app/admin/templates/[id]/page.tsx`).
- **Verifikasi:** `pnpm lint`, `pnpm typecheck`, `pnpm test -- --run` lulus (16 file, 116 tes). Screenshot mobile 390px/desktop 1280px & audit anti-slop menyeluruh per layar (T5.5), suara/haptic (T5.2), a11y audit (T5.3), matriks perangkat (T5.6), dan verifikasi privasi produksi (T6.3) belum dilakukan/dibuktikan di sini.

## Dashboard Admin — state kosong tanpa angka karangan — 2026-11-18
- **Konsep:** "Backstage Box Office" menampilkan kotak kosong yang jujur — seperti box office sebelum pertunjukan dimulai: angka nol, tanpa aktivitas, bukan angka pemanis yang dikarang.
- **Lolos:** swap / squint / palette / font / copy / ritme / konkret / state
  - **swap:** Lolos. Kartu bersudut siku bergaris tembaga + angka mono; bukan tampilan dashboard SaaS generik.
  - **squint:** Lolos. Hierarki: judul "Backstage Box Office" → 4 KPI → tren + template/lokasi → studio + frame manager → activity.
  - **palette:** Lolos. Audit `grep -rE "(indigo|violet|purple|slate|zinc|gray|neutral)-[0-9]"` di `src/` → 0 temuan. Hex di luar token hanya di `src/app/page.tsx` (gradasi curtain lama, bukan perubahan ini).
  - **font:** Lolos. Tiga keluarga saja: Playfair Display (display), Plus Jakarta Sans (body), IBM Plex Mono (mono).
  - **copy:** Lolos. Teks state kosong konkret ("Belum ada data", "Belum ada aktivitas. Pencatatan otomatis berjalan setelah migrasi booth_events diterapkan."), tanpa jargon pemasaran atau placeholder.
  - **ritme:** Lolos. Skala jarak bervariasi (`gap-4`, `gap-3`, `gap-2`), header asimetris: stempel "BACKSTAGE" kiri, rentang tanggal + tombol kanan.
  - **konkret:** Lolos. Elemen dekoratif meniru fisik: stempel tiket, garis perforasi pemisah bagian, angka seri mono.
  - **state:** Lolos. Empty state dirancang (nol + pesan + badge tren disembunyikan), bukan spinner atau teks polos.
- **Catatan atau perbaikan:** Angka dashboard kini hanya berasal dari tabel `booth_events` (client tracking via `/api/track`); generator data dummy `getFallbackAnalytics` dihapus. Verifikasi production: KPI 0/0/0/–, kurva tren rata di 0, tabel aktivitas kosong, template milik admin tetap tampil dengan 0 uses. Screenshot: desktop 1280 px & mobile 390 px (dashboard admin, 2026-11-18).

## Kamera - siklus hidup stream (2026-11-18)
- **Konsep:** Stream kamera hanya hidup saat proses mengambil foto; di halaman hasil (Act III) dan penutup (Act IV) kamera wajib mati, sehingga indikator kamera tidak menyala dan halaman hasil tidak memegang sumber gambar.
- **Perubahan:** `src/app/booth/page.tsx` menghentikan stream saat fase `reviewing`/`done`; `src/features/camera/useCamera.ts` menambah `setVideoElement` (callback ref) agar `<video>` yang baru ter-mount tetap menerima stream yang sudah terbuka (preview hitam sebelumnya karena `<video>` mount setelah `getUserMedia` selesai).
- **Lolos:** swap / squint / palette / font / copy / ritme / konkret / state
  - **swap:** Lolos. Tidak ada elemen UI baru; perilaku kamera yang hilang, bukan tambahan visual.
  - **squint:** Lolos. Fokus tetap pada strip hasil, tombol aksi tetap hierarkis.
  - **palette:** Lolos. Tidak ada warna/komponen baru.
  - **font:** Lolos. Tidak ada perubahan tipografi.
  - **copy:** Lolos. Copy lama dipertahankan; tidak ada teks baru.
  - **ritme:** Lolos. Layout halaman hasil tidak berubah.
  - **konkret:** Lolos. Kamera benar-benar berhenti (indikator hardware padam), bukan sekadar disembunyikan.
  - **state:** Lolos. State reviewing/done tampil utuh dengan strip, retake, unduh, dan selesai.
- **Catatan atau perbaikan:** `tests/e2e/privacy.spec.ts` kini merekam `getUserMedia` dan memastikan 0 track video `live` di halaman hasil (desktop 1280 px & mobile 390 px, 2026-11-18). Preview kamera juga ikut diperbaiki (stream tidak lagi hilang saat `<video>` mount belakangan), dan alur unduh template seed kembali terverifikasi end-to-end.
