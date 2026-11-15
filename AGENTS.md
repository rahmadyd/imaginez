# AGENTS.md — Web Photobooth

Kamu adalah engineer sekaligus art director untuk proyek ini. Baca file ini dulu setiap sesi.

## 1. Peta dokumen

Baca sesuai urutan ini sebelum mengerjakan tugas apa pun:

1. `docs/SPEC.md` — apa yang dibangun, dan apa yang **tidak**
2. `docs/ARCHITECTURE.md` — cara membangun, termasuk **aturan privasi**
3. `docs/DESIGN.md` — konsep visual "Bilik Analog", token, layar
4. `docs/AI-SLOP.md` — larangan, tes, dan ritual review UI
5. `docs/TASKS.md` — daftar tugas bertahap

Jika dokumen bertentangan, prioritasnya: **aturan privasi (ARCHITECTURE §2) > SPEC > AI-SLOP > DESIGN > preferensi pribadimu**.

## 2. Ringkasan proyek

Web photobooth. Admin mengunggah template photo strip lewat dashboard. User memilih template, foto, review, unduh. Foto user **tidak pernah** dikirim ke server dan hilang saat sesi selesai.

## 3. Aturan keras (tidak boleh dilanggar)

1. **Jangan pernah** mengirim data foto user ke jaringan (fetch, XHR, beacon, WebSocket).
2. **Jangan pernah** menyimpan foto user atau turunannya di `localStorage`, `sessionStorage`, `IndexedDB`, Cache API, cookie, atau service worker.
3. **Jangan** memasukkan gambar, dataURL, atau blob URL ke log, error report, atau analitik.
4. Setiap kode yang memegang foto harus punya jalur pelepasan lewat `wipe()`.
5. Overlay template disajikan **same-origin** (lihat ARCHITECTURE §6) agar canvas tidak tainted.
6. Jangan pakai warna, font, atau komponen yang dilarang `AI-SLOP.md`.
7. Jangan menambah dependency baru tanpa alasan tertulis di PR/commit (apa masalahnya, kenapa tidak cukup dengan yang ada).

## 4. Stack dan perintah

- Next.js (App Router), TypeScript strict, Tailwind, Zod, Zustand, Vitest, Playwright
- Cloudflare D1 + R2 untuk template

```bash
pnpm install
pnpm dev          # dev server
pnpm build        # build produksi
pnpm lint         # ESLint
pnpm typecheck    # tsc --noEmit
pnpm test         # Vitest
pnpm e2e          # Playwright (kamera palsu)
```

Sebelum menandai tugas selesai, `lint`, `typecheck`, dan `test` harus lulus.

## 5. Konvensi kode

- TypeScript `strict`, tanpa `any` kecuali dengan komentar alasan.
- Struktur folder mengikuti ARCHITECTURE §4. Logika bisnis di `src/features/*`, UI bersama di `src/components`.
- Komponen: fungsi, nama PascalCase, satu komponen utama per file.
- Warna, jarak, radius, bayangan, durasi: **hanya lewat token** (`src/styles/tokens.css` dan tema Tailwind). Tidak ada hex/magic number di komponen.
- Teks UI dikumpulkan di satu tempat (`src/lib/copy.ts`) agar mudah diubah dan diaudit.
- Fungsi murni untuk matematika (crop, deteksi slot) dan beri unit test.
- Komentar menjelaskan **kenapa**, bukan **apa**.

## 6. Cara kerja

1. Ambil **satu tugas** dari `docs/TASKS.md` (urut, jangan loncat fase).
2. Kerjakan hanya cakupan tugas itu. Tidak ada refactor atau fitur di luar tugas.
3. Untuk tugas UI, ikuti ritual di `docs/AI-SLOP.md` §4 (konsep satu kalimat → bangun → tes → catat di `docs/REVIEW-NOTES.md`).
4. Pastikan **acceptance criteria (AC)** tugas terpenuhi, dan buktikan (test, screenshot, atau langkah manual).
5. Centang tugas di `TASKS.md`, lalu commit.
6. Jika ada keputusan yang tidak tercakup dokumen, atau menyentuh "Pertanyaan terbuka" di SPEC §10: **berhenti dan tanyakan**. Jangan menebak.

## 7. Commit

Format: `<tipe>(<area>): <ringkas>`
Contoh: `feat(camera): tambah useCamera dengan penanganan error izin`
Tipe: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`. Satu tugas = satu atau beberapa commit kecil.

## 8. Definition of Done (per tugas)

- [ ] AC terpenuhi dan terbukti
- [ ] `lint`, `typecheck`, `test` lulus
- [ ] Tidak melanggar aturan keras §3
- [ ] Untuk UI: tes `AI-SLOP.md` §3 lulus dan tercatat di `REVIEW-NOTES.md`
- [ ] Tidak ada `TODO` tanpa nomor tugas, tidak ada `console.log` tertinggal, tidak ada placeholder/lorem
- [ ] `TASKS.md` diperbarui

## 9. Jangan lakukan

- Jangan melewati fase atau mengerjakan beberapa fase sekaligus.
- Jangan "memperbaiki" desain dengan gaya bawaan yang terasa aman.
- Jangan menambah fitur dari bagian Non-goals SPEC (akun, upload foto user, QR share, dst.).
- Jangan menyimpan secret di repo. Gunakan environment/binding.
- Jangan menonaktifkan CSP atau header keamanan demi kemudahan debugging.

