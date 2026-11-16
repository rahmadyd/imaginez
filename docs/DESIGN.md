# DESIGN — Web Photobooth

> Wajib dibaca bersama `AI-SLOP.md` sebelum membuat atau mengubah UI apa pun. Jika keduanya bertentangan dengan insting agent, ikuti dokumen ini.

## 1. Konsep: "Bilik Analog"

Pengalaman masuk ke bilik photobooth fisik: tirai, kilatan lampu, bunyi mekanik, strip foto yang keluar dari celah mesin. Dunia visualnya adalah **kertas, tinta, dan lampu bilik**, bukan "aplikasi SaaS".

Satu kalimat pegangan: **"Hangat, tercetak, sedikit nakal."**

Prinsip turunan:
1. **UI netral, template bintang.** Desain admin yang harus jadi pusat perhatian. UI cukup jadi bingkai kertas dan tinta.
2. **Rasa cetak.** Sudut tegas, garis tebal, bayangan keras (offset), tekstur kertas halus.
3. **Detail kecil yang konkret.** Nomor seri strip, stempel tanggal, tanda crop di viewfinder, perforasi.
4. **Gerak bermakna.** Tirai membuka, countdown berdentum, strip tercetak. Tidak ada animasi hanya karena bisa.

> Arah ini bisa diganti (mis. playful pop atau minimal editorial). Jika diganti, ganti seluruh bagian 2–5 sekaligus, jangan dicampur.

## 2. Design tokens

```css
:root {
  /* Warna */
  --paper:      #F3ECDD;  /* latar utama */
  --paper-2:    #E9E0CC;  /* permukaan kedua, kartu */
  --ink:        #1B1915;  /* teks, garis, latar layar kamera */
  --ink-2:      #4A453C;  /* teks sekunder */
  --booth-red:  #C63A24;  /* aksen utama: CTA, tanda aktif */
  --curtain:    #5B1A17;  /* tirai (landing/transisi saja) */
  --flash:      #FFD93B;  /* HANYA untuk efek flash dan highlight kecil */

  /* Bentuk */
  --radius:     4px;      /* default. Bukan 16px, bukan pill */
  --line:       2px;      /* tebal garis standar */
  --shadow-hard: 4px 4px 0 var(--ink);
  --shadow-hard-sm: 2px 2px 0 var(--ink);

  /* Gerak */
  --t-fast: 120ms;
  --t-base: 240ms;
  --t-slow: 600ms;
  --ease-out: cubic-bezier(.2,.8,.2,1);
  --ease-snap: cubic-bezier(.3,1.6,.5,1);  /* overshoot untuk countdown */
}
```

Aturan warna:
- Hanya warna di atas. Dilarang memakai palet bawaan Tailwind (`indigo-*`, `slate-*`, `gray-*`, dst.) di komponen. Petakan token ke `tailwind.config`.
- `--booth-red` adalah satu-satunya aksen. `--flash` bukan warna tombol.
- Cek kontras: teks di atas `--booth-red` harus ≥ 18 px bold atau ≥ 24 px, dan rasio kontras diverifikasi ≥ 3:1 (teks besar) / 4,5:1 (teks biasa).

## 3. Tipografi

| Peran | Font | Pemakaian |
|---|---|---|
| Display | **Fraunces** (opsz tinggi, bobot 600–900) | Judul, countdown, momen besar |
| UI / body | **Archivo** (400/500/700) | Teks, tombol, label |
| Mono | **IBM Plex Mono** (400/500) | Penghitung `02/06`, nomor seri, tanggal, label mesin |

Muat dengan `next/font`, subset `latin`, `display: swap`.

Skala: `12 / 14 / 16 / 20 / 28 / 40 / 64 / 120`. Countdown memakai `clamp(8rem, 40vmin, 20rem)`.

Dilarang sebagai font utama: Inter, Roboto, Poppins, Space Grotesk, font sistem polos.

## 4. Bahasa visual

- **Garis:** 2 px `--ink` pada kartu, tombol, input.
- **Bayangan:** hanya `--shadow-hard` (offset, tanpa blur). Dilarang `shadow-md/lg/xl` bawaan.
- **Radius:** 4 px. Pengecualian: tombol shutter (lingkaran, karena meniru tombol fisik).
- **Tekstur:** grain kertas dari SVG `feTurbulence` (data URI), opasitas 4–6%, menutupi latar `--paper`. Tidak berlaku di layar kamera.
- **Perforasi:** garis putus-putus `border: 2px dashed` pada tepi strip pratinjau dan pemisah bagian.
- **Ikon:** set kecil gambar-tangan/geometris konsisten (stroke 2 px, ujung persegi) yang dibuat khusus (kamera, tutup, ulang, unduh, balik kamera). Dilarang emoji sebagai ikon dan dilarang ikon dalam lingkaran berwarna.
- **Detail khas:** nomor seri acak (`No. 0427`) dan stempel tanggal mono di UI sekitar strip. Elemen ini dekorasi UI, **tidak** ikut masuk hasil unduhan kecuali opsi diaktifkan.

## 5. Layar

Semua layar mobile-first (360–430 px), lalu diperlebar untuk desktop. Di desktop, konten utama dibatasi `max-width: 560px` dan dipusatkan, dengan latar `--paper` yang mengisi sisanya.

### S0 — Landing (tirai)
- Layar penuh `--curtain` dengan lipatan tirai vertikal halus (gradient berulang, samar).
- H1 (Fraunces): **"Foto strip, tanpa jejak."**
- Sub: "Foto beberapa kali, unduh, selesai. Tidak ada yang disimpan."
- CTA: **"Masuk bilik"**.
- Baris mono kecil: "Diproses di perangkatmu. Tidak diunggah."
- Interaksi: tekan CTA → dua sisi tirai bergeser terbuka (600 ms) → S1.

### S1 — Pilih template
- Header kecil: "Pilih strip".
- Grid 2 kolom (mobile) / 3 kolom (desktop) berisi `TemplateCard`: preview strip dengan foto dummy, nama (mono), jumlah foto ("6 foto").
- Terpilih: garis `--ink` 3 px + penanda sudut `--booth-red`.
- Tombol lengket di bawah: **"Lanjut"** (nonaktif sampai ada pilihan).
- Keadaan: skeleton berbentuk strip saat memuat; kosong → "Belum ada strip. Mampir lagi nanti."; error → pesan + tombol "Coba lagi".

### S2 — Izin kamera (primer)
- Ikon kamera khusus.
- Tiga baris pendek, tanpa bullet generik:
  - "Kamera hanya jalan di tab ini."
  - "Fotomu tidak dikirim ke mana pun."
  - "Hilang waktu kamu tekan Selesai."
- CTA: **"Izinkan kamera"**. Tautan kecil: "Pakai foto dari galeri".
- Keadaan ditolak: panduan singkat membuka izin sesuai browser + tombol "Coba lagi" + opsi galeri. Jika kegagalan terkait browser dalam aplikasi (Instagram/Facebook/TikTok/Line dll.), tampilkan petunjuk singkat “Buka di Chrome atau Safari” (deteksi user agent hanya untuk petunjuk ini).

### S3 — Capture
- Latar `--ink` layar penuh.
- **Viewfinder** memiliki rasio sama dengan slot aktif, dengan tanda crop (sudut siku) warna `--paper` di keempat sudut.
- Atas: `SlotProgress` (N bingkai kecil: kosong / aktif / terisi dengan thumbnail) dan penghitung mono `02/06`.
- Countdown: angka Fraunces raksasa di tengah, tiap angka masuk dengan `--ease-snap`.
- Flash: lapisan `--flash`→putih, 120 ms, lalu thumbnail foto "terbang" ke bingkai progress.
- Bawah: tombol **shutter** (cincin `--booth-red`, inti `--ink`, bayangan keras), toggle mode **Otomatis/Manual**, tombol "Batal".
- **Pilihan kamera (wajib ritual AI-SLOP):**
  - **Mobile/tablet** (coarse pointer + maxTouchPoints): tombol **“Balik kamera”** (ikon khusus, bukan emoji/bawaan Lucide tak dikustomisasi; konsisten stroke 2 px, ujung persegi) dekat shutter, mudah dijangkau jempol, target sentuh ≥ 48×48 px. Hanya tampil jika ada >1 kamera. Label mikro bisa “Kamera depan” / “Kamera belakang” sesuai state.
  - **Desktop/laptop:** kontrol **“Kamera”** membuka menu/dialog daftar `videoinput` (nama dari label; jika kosong “Kamera 1”, “Kamera 2”, …), item aktif ditandai jelas. Termasuk webcam eksternal/virtual. Toggle **“Cermin preview”** default **aktif** (tidak memengaruhi unduhan).
- Preview: mobile depan = mirror (`scaleX(-1)`), belakang = tidak mirror. Desktop mengikuti toggle cermin. Hasil unduhan selalu tidak dicerminkan.
- Perubahan/pemilihan kamera **dinonaktifkan** selama countdown dan saat mengambil foto. Foto di nampan boleh dari kamera berbeda.
- Mode Otomatis: sekali tekan mulai, semua slot diambil berurutan.

### S4 — Review
- Strip hasil ditampilkan memenuhi tinggi layar yang tersedia, dengan nomor seri + stempel tanggal mono di sampingnya.
- Ketuk satu slot → panel kecil "Ulang foto ini".
- Aksi (urutan prioritas):
  1. **"Unduh"** (utama, lebar penuh)
  2. "Bagikan" (hanya jika Web Share file didukung)
  3. "Ulang semua" (sekunder)
  4. "Selesai & hapus" (tersier, teks + garis bawah)
- Format: PNG default; tautan kecil "JPG".
- Animasi masuk: strip "tercetak", bergeser turun dari celah mesin (±900 ms, `--ease-out`). Jika `prefers-reduced-motion`: fade 150 ms.

### S5 — Selesai
- Judul: **"Sudah terhapus."**
- Mono kecil: "0 foto tersimpan di server."
- Tombol: **"Foto lagi"**.
- Tidak ada auto-redirect.

### Admin
Fungsional, lebih padat, tanpa hiasan tirai. Memakai token yang sama (kertas, tinta, garis, bayangan keras) agar terasa satu keluarga.
- **Login:** satu kartu, dua field, satu tombol.
- **Daftar template:** baris berisi thumbnail, nama, jumlah slot, toggle publish, handle drag untuk urutan, tombol edit/hapus. Hapus memakai dialog konfirmasi.
- **Editor (3 panel di desktop):**
  - Kiri: daftar slot (urutan = urutan capture, bisa drag).
  - Tengah: kanvas dengan overlay + slot. Zoom/pan. Tiap slot diberi badge nomor.
  - Kanan: properti (nama, background, x/y/w/h/rotasi numerik, tombol "Deteksi otomatis", toggle "Preview foto dummy", tombol Simpan, Publish).
- Interaksi slot: drag, resize via handle, rotasi via handle, snap 8 px, panah = geser 1 px (Shift = 10 px), `Delete` menghapus, `Ctrl/Cmd+D` menggandakan.
- Peringatan bila ada perubahan belum tersimpan saat keluar halaman.
- Di mobile: editor hanya baca + toggle publish; edit slot dianjurkan di desktop (tampilkan catatan).

## 6. Komponen inti

| Komponen | Catatan |
|---|---|
| `Button` | Varian: primary (`--booth-red`), secondary (garis ink), tertiary (teks). Tinggi min 48 px. Efek tekan: bayangan menyusut + translate 2 px. |
| `ShutterButton` | Lingkaran 80 px, kondisi: idle, counting, disabled. |
| `CameraViewport` | Mengelola video, mirror, crop guide, tanda sudut. |
| `CountdownOverlay` | `aria-live="assertive"`. |
| `SlotProgress` | Bingkai kecil + thumbnail + penghitung mono. |
| `StripPreview` | Canvas hasil + dekorasi nomor seri/stempel. |
| `TemplateCard` | Preview, nama, jumlah foto, keadaan terpilih. |
| `Dialog` / `Toast` | Sudut tegas, garis tebal, bayangan keras. |

## 7. Gerak dan suara

| Momen | Durasi | Easing |
|---|---|---|
| Tirai membuka | 600 ms | `--ease-out` |
| Angka countdown masuk | 240 ms | `--ease-snap` |
| Flash | 120 ms | linear |
| Thumbnail terbang ke progress | 360 ms | `--ease-out` |
| Strip tercetak | 900 ms | `--ease-out` |
| Tombol tekan | 120 ms | `--ease-out` |

- `prefers-reduced-motion`: ganti pergeseran dan overshoot dengan fade, nonaktifkan guncangan.
- **Suara:** klik rana dan tik countdown dihasilkan dengan WebAudio (tanpa file aset). Aktif secara default setelah gestur pertama user, dengan tombol bisukan yang selalu terlihat di layar capture.
- **Haptic:** `navigator.vibrate(15)` saat rana, jika tersedia.

## 8. Nada bahasa (microcopy)

Santai, singkat, hangat. Tidak lebay, tidak korporat.

| Situasi | Teks |
|---|---|
| Mulai | "Masuk bilik" |
| Siap foto | "Siap? Senyum dulu." |
| Countdown selesai | (tanpa teks, hanya kilatan) |
| Foto ke-N berhasil | "Foto 2 dari 6" |
| Mau ulang satu | "Ulang foto ini" |
| Unduh | "Unduh" |
| Selesai | "Selesai & hapus" |
| Setelah hapus | "Sudah terhapus." |
| Kamera ditolak | "Kameranya belum diizinkan. Ini cara membukanya." |
| Kamera dipakai aplikasi lain | "Kameranya lagi dipakai aplikasi lain. Tutup dulu, lalu coba lagi." |
| Gagal memuat | "Gagal memuat. Coba lagi." |

Aturan: kalimat aktif, kata kerja di depan, satu ide per kalimat. Hindari "Selamat datang di…", "Abadikan momenmu", dan tanda seru beruntun.

## 9. Aksesibilitas

- Kontras WCAG AA di semua teks.
- Target sentuh ≥ 48×48 px.
- Fokus terlihat jelas (outline 3 px `--booth-red` dengan offset).
- Spasi/Enter menjalankan shutter; Esc membatalkan sesi capture.
- Countdown diumumkan via `aria-live`. Perubahan layar mengatur ulang fokus ke judul layar baru.
- Hormati `prefers-reduced-motion` dan `prefers-contrast`.
- Alt text deskriptif pada preview template (nama + jumlah foto).

## 10. Responsif

| Breakpoint | Perilaku |
|---|---|
| < 480 px | Satu kolom, tombol lebar penuh, CTA lengket di bawah |
| 480–1024 px | Konten dibatasi 560 px, dipusatkan |
| > 1024 px | Review: strip di kiri, aksi di kanan. Editor admin 3 panel |

Perhatikan area aman (`env(safe-area-inset-*)`) untuk tombol bawah di iOS, dan pakai `100dvh`, bukan `100vh`.
