# SPEC — Web Photobooth

> Dokumen sumber kebenaran untuk **apa** yang dibangun. Cara membangunnya ada di `ARCHITECTURE.md`, tampilannya di `DESIGN.md` dan `AI-SLOP.md`, urutan kerjanya di `TASKS.md`.

## 1. Ringkasan

Aplikasi web photobooth. **Admin** membuat dan mengunggah template photo strip (mis. 6 kotak) lewat dashboard admin. **User** memilih template, mengambil foto lewat kamera, mengulas hasilnya, lalu mengunduh. **Foto user tidak pernah dikirim ke server** dan hilang saat sesi selesai.

## 2. Prinsip produk

1. **Privasi by design.** Foto hanya hidup di memori browser user. Tidak ada upload, tidak ada penyimpanan. Ini bukan fitur, ini fondasi.
2. **Template adalah bintangnya.** UI bersifat mendukung. Desain admin yang harus paling menonjol di hasil akhir.
3. **Satu layar, satu tugas.** Tidak ada layar yang meminta user memutuskan lebih dari satu hal.
4. **Mobile-first.** Mayoritas user memakai HP. Desktop harus tetap nyaman.
5. **Cepat.** Dari buka halaman sampai berhasil unduh: target < 60 detik.

## 3. Peran

| Peran | Keterangan |
|---|---|
| Admin | Satu orang (pemilik). Login. Mengelola template. |
| User | Publik, anonim, tanpa akun. Hanya foto, review, unduh. |

## 4. Scope MVP

**User**
- Lihat daftar template yang dipublikasikan
- Pilih template
- Ambil foto berurutan sebanyak jumlah slot (countdown otomatis)
- Review hasil, ulang satu slot atau semuanya
- Unduh hasil (PNG)
- Hapus semua dan mulai lagi

**Admin**
- Login
- Upload PNG template (dengan area transparan)
- Tandai slot foto secara visual, atau deteksi otomatis dari area transparan
- Preview dengan foto dummy
- Publish / unpublish, ubah urutan, ganti nama, hapus

## 5. Non-goals (tidak dikerjakan di MVP)

- Akun user, galeri, riwayat foto
- Upload atau penyimpanan foto user dalam bentuk apa pun (termasuk QR/link share)
- Stiker, AR, filter lanjutan, video/GIF
- Multi-admin atau role
- Pembayaran
- Analitik yang mengidentifikasi user

## 6. User flow

```
Landing → Pilih template → Izin kamera → Capture (N foto) → Review → Unduh → Selesai (hapus) → Landing
                                   ↘ (ditolak) → Pakai foto dari galeri ↗
```

## 7. Requirement fungsional

### User
| ID | Requirement |
|---|---|
| FR-U1 | Menampilkan template berstatus published, urut `sort`, dengan preview strip. |
| FR-U2 | Memilih template menentukan jumlah slot dan rasio aspek tiap slot. |
| FR-U3 | Sebelum prompt izin browser, tampilkan penjelasan singkat bahwa foto tidak disimpan. |
| FR-U4 | Capture berurutan: countdown (default 3 detik), flash, jeda A�1,2 detik antar foto, sampai semua slot terisi. |
| FR-U5 | Preview kamera dipotong sesuai rasio slot yang sedang diisi, supaya apa yang terlihat = apa yang masuk strip. |
| FR-U6 | Review menampilkan strip hasil penuh. User bisa mengulang satu slot atau semua slot. |
| FR-U7 | Unduh PNG pada resolusi penuh template. Pakai Web Share jika tersedia (penting untuk iOS). |
| FR-U8 | Jika kamera tidak tersedia/ditolak, tawarkan pilih foto dari galeri (file dibaca lokal, tidak diunggah). |
| FR-U9 | Hapus sesi saat: tombol "Selesai", idle timeout (default 3 menit), `pagehide`. |
| FR-U10 | Ada penjelasan privasi singkat yang bisa dibuka dari layar mana pun. |
| FR-U13 | Pemilihan kamera: di perangkat mobile/tablet (deteksi pointer coarse + maxTouchPoints > 0) default kamera **depan** dengan tombol beralih ke **belakang** dan sebaliknya; di desktop/laptop user dapat memilih kamera dari daftar (`videoinput`) termasuk webcam eksternal/virtual. Pemilihan/pengalihan dinonaktifkan saat countdown atau mengambil foto. Preview kamera depan dicerminkan; kamera belakang tidak dicerminkan. Hasil unduhan tidak dicerminkan (mengikuti ARCHITECTURE §7.1). Preferensi non-foto (mis. kamera terakhir/mode) boleh disimpan di `localStorage` dengan kunci yang tidak memuat data foto. |

### Admin
| ID | Requirement |
|---|---|
| FR-A1 | Login dengan kredensial admin. Semua rute `/admin` dan API admin terlindungi. |
| FR-A2 | Upload PNG template. Validasi: PNG, punya alpha, maks 8 MB, maks 4000×6000 px. |
| FR-A3 | Slot editor visual: tambah, geser, ubah ukuran, rotasi, hapus, urutan pengambilan foto. |
| FR-A4 | Deteksi otomatis slot dari area transparan, lalu bisa dikoreksi manual. |
| FR-A5 | Preview template dengan foto dummy sebelum publish. |
| FR-A6 | Publish/unpublish, reorder, rename, ganti PNG, hapus. |
| FR-A7 | Validasi sebelum simpan: ≥1 slot, semua slot di dalam canvas, nama tidak kosong. |

## 8. Non-fungsional

- **Browser:** iOS Safari 16+, Chrome Android 100+, Chrome/Edge/Firefox/Safari desktop terbaru.
- **Wajib HTTPS** (syarat kamera).
- **Performa:** LCP < 2,5 s di 4G kelas menengah. JS halaman user < 200 KB gzip. Render komposit 6 slot di 1200×3600 < 1,5 s.
- **Memori:** foto hasil capture dibatasi sisi terpanjang 1920 px sebelum disimpan di memori.
- **Aksesibilitas:** WCAG AA, bisa dioperasikan keyboard, hormati `prefers-reduced-motion`.
- **Bahasa UI:** Indonesia. Struktur teks dipisah supaya mudah ditambah bahasa lain nanti.

## 9. Kriteria selesai MVP

- [ ] User bisa menyelesaikan alur penuh di iOS Safari dan Chrome Android
- [ ] Tidak ada request jaringan yang membawa data foto user (diverifikasi test otomatis)
- [ ] Setelah "Selesai", storage browser kosong dan memori foto dilepas
- [ ] Admin bisa membuat template baru dari PNG sampai terbit tanpa menyentuh kode
- [ ] Lolos checklist `AI-SLOP.md`

## 10. Pertanyaan terbuka

Agent **jangan menebak**. Jika menemui salah satu hal ini, berhenti dan tanyakan.

1. Ukuran/rasio template standar apa yang akan admin pakai? (default sementara: 1200×3600 untuk strip 1×6, 1200×1800 untuk 2×3)
2. Apakah hasil unduhan perlu opsi mirror? (default: tidak dimirror)
3. Apakah perlu watermark atau teks tanggal di hasil? (default: tidak)
4. Domain dan nama produk final.
