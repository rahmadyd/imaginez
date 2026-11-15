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
