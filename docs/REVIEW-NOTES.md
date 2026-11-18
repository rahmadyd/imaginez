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

## Kamera - auto-start preview tanpa layar hitam (2026-11-18)
- **Konsep:** Layar kamera harus langsung hidup: begitu viewfinder terbuka, preview video sudah memutar - tanpa layar hitam dan tanpa perlu menyentuh tombol ganti kamera.
- **Perubahan:** `useCamera` memasang stream ke elemen `<video>` lewat callback ref `setVideoElement` (stream bisa sudah terbuka sebelum `<video>` mount), memutar ulang preview bila elemen ter-pause, dan menolak `start()` paralel agar tidak ada dua stream bertumpuk. `CaptureScreen` menyalakan kamera otomatis saat status `idle`; `stop()` menutup stream yang tiba terlambat.
- **Lolos:** swap / squint / palette / font / copy / ritme / konkret / state
  - **swap:** Lolos. Tidak ada elemen UI baru; yang hilang adalah layar hitam dan kebutuhan klik tombol kamera.
  - **squint:** Lolos. Fokus langsung ke viewfinder berisi video live.
  - **palette:** Lolos. Tidak ada warna/komponen baru.
  - **font:** Lolos. Tidak ada perubahan tipografi.
  - **copy:** Lolos. Copy lama dipertahankan; tidak ada teks baru.
  - **ritme:** Lolos. Layout viewfinder tidak berubah.
  - **konkret:** Lolos. Kamera benar-benar merekam dan menampilkan frame, bukan placeholder.
  - **state:** Lolos. Preview aktif, status kamera, dan galeri fallback tetap konsisten.
- **Catatan atau perbaikan:** `tests/unit/camera.test.ts` menambah 4 tes (stream yang mount belakangan, `start()` paralel, stream telat datang, tidak ada stream lama yang hidup setelah ganti kamera); `tests/e2e/privacy.spec.ts` memastikan preview `srcObject` terpasang, tidak ter-pause, dan `readyState >= 2` begitu layar kamera terbuka.

## Kamera - auto-mirror dan hasil jepretan mengikuti tampilan (2026-11-18)
- **Konsep:** Selfie dan webcam tampil seperti cermin (seperti yang dilihat user), dan foto yang masuk ke strip terlihat persis sama dengan preview saat jepret ditekan.
- **Perubahan:** `useCamera` mengekspos `mirrored` (sumber tunggal): kamera depan HP dan webcam PC otomatis cermin, kamera belakang HP otomatis tidak, desktop memakai toggle "Cermin preview" (default aktif). `captureFrame` menerima opsi `{ mirror }` dan mencerminkan frame secara horizontal; `CaptureScreen` mengunci nilai mirror saat tombol jepret ditekan lalu meneruskannya ke `onCapture`.
- **Lolos:** swap / squint / palette / font / copy / ritme / konkret / state
  - **swap:** Lolos. Tidak ada elemen UI baru; perilaku preview yang jadi apa adanya.
  - **squint:** Lolos. Preview tetap menjadi fokus; tidak ada kontrol tambahan yang memenuhi layar.
  - **palette:** Lolos. Tidak ada warna/komponen baru.
  - **font:** Lolos. Tidak ada perubahan tipografi.
  - **copy:** Lolos. Copy lama ("Cermin preview") dipakai apa adanya.
  - **ritme:** Lolos. Layout viewfinder tidak berubah.
  - **konkret:** Lolos. Hasil jepretan identik dengan yang tampil di layar, bukan-behavior berbeda.
  - **state:** Lolos. Preview, hasil strip, dan tombol toggle selalu sinkron.
- **Catatan atau perbaikan:** `tests/unit/camera.test.ts` (3 tes aturan mirror), `tests/unit/capture.test.ts` (2 tes flip canvas), `tests/e2e/camera.spec.ts` (2 tes: mirror otomatis webcam + toggle manual, keduanya membuktikan canvas capture memakai `scale(-1, 1)` saat preview cermin dan tidak saat preview normal).

## Viewfinder - rasio slot dan area crop identik (2026-11-18)
- **Konsep:** Kotak preview adalah "jendela" yang jujur: rasio dan area yang terlihat persis sama dengan foto yang akan masuk ke slot, di HP portrait maupun PC landscape.
- **Perubahan:** `aspect-ratio` dipindah ke elemen yang langsung membungkus `<video>` (bingkai dekoratif keluar dari area preview) dan viewfinder dibatasi `52vh` agar slot portrait tidak membuat tombol jepret terdorong keluar layar. `coverCropRect(sourceW, sourceH, targetAspect)` menjadi fungsi murni yang dipakai capture, padanan `object-fit: cover` + `object-position: center` milik preview. Rasio preview diambil dari slot yang akan diisi (slot kosong pertama), bukan slot sembarang.
- **Lolos:** swap / squint / palette / font / copy / ritme / konkret / state
  - **swap:** Lolos. Tidak ada elemen UI baru; hanya koreksi proporsi dan area.
  - **squint:** Lolos. Preview tetap menjadi fokus dan tanda crop tetap menempel di sudut area video.
  - **palette:** Lolos. Tidak ada warna/komponen baru.
  - **font:** Lolos. Tidak ada perubahan tipografi.
  - **copy:** Lolos. Copy lama dipertahankan; tidak ada teks baru.
  - **ritme:** Lolos. Margin dan jarak tetap; hanya ukuran viewfinder yang mengikuti rasio slot.
  - **konkret:** Lolos. Crop center proporsional, bukan pemotongan asal potong.
  - **state:** Lolos. Preview, countdown, dan flash tetap berada di area yang sama.
- **Catatan atau perbaikan:** `tests/unit/capture.test.ts` menambah 5 tes `coverCropRect` (landscape/portrait, target landscape/portrait, rasio dan titik tengah); `tests/e2e/camera.spec.ts` membuktikan rasio preview = rasio slot template dan crop canvas identik dengan area yang terlihat (HP 390 px & PC 1280 px, slot portrait 500x800 diuji manual dengan viewfinder 268x429 tanpa tombol terpotong, 2026-11-18).

## Galeri - isi slot tanpa menyalakan kamera (2026-11-19)
- **Konsep:** User yang tidak mau memakai kamera tetap bisa punya strip: foto dari galeri masuk ke slot satu per satu di layar ''Fill the Frames'', dan kamera tetap gelap sampai user sendiri yang menekan ''Use the camera instead''.
- **Perubahan:** State machine sesi punya fase baru ''filling'' dengan mode ''gallery'' (''START_GALLERY''). Layar izin membuka pemilih file asli (bukan tombol palsu), file dibaca lokal menjadi ImageBitmap lalu langsung masuk ke slot kosong berikutnya. Layar ''Fill the Frames'' menampilkan strip yang terisi bertahap, progres ''N of M frames filled'', tombol tambah foto, tombol alih ke kamera, dan ''Leave the Stage''. Retake pada hasil galeri kembali ke layar pengisian slot.
- **Lolos:** swap / squint / palette / font / copy / ritme / konkret / state
  - **swap:** Lolos. Layar baru memakai komponen panggung yang sudah ada (bingkai, filigree, MarqueeStrip, tipografi display/body/mono).
  - **squint:** Lolos. Fokus ke strip yang sedang terisi; progres hanya satu baris di bawah bingkai.
  - **palette:** Lolos. Tidak ada warna/komponen baru, hanya token yang sudah dipakai.
  - **font:** Lolos. Tidak ada perubahan tipografi.
  - **copy:** Lolos. Teks baru dikumpulkan di copy.s3g (''Fill the Frames'', ''N of M frames filled'', ''Add portrait from gallery'', ''Use the camera instead'', ''Leave the Stage'').
  - **ritme:** Lolos. Jarak mengikuti pola layar izin dan review (bingkai luar, isi, baris bawah).
  - **konkret:** Lolos. Foto asli user masuk strip sesuai slot, bukan placeholder.
  - **state:** Lolos. Fase ''filling'' punya state sibuk (reading/error), progres terisi, dan jalur retake kembali ke pengisian.
- **Catatan atau perbaikan:** 	ests/unit/session-machine.test.ts menambah 5 tes (transisi galeri, retake ke ''filling'', alih ke kamera, transisi ilegal); 	ests/e2e/gallery.spec.ts membuktikan alur galeri sampai review dengan **0 panggilan getUserMedia** (2026-11-19).
