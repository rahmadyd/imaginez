# AI-SLOP — Aturan Anti "Desain Buatan AI Generik"

> Dokumen ini adalah **pagar**. `DESIGN.md` berkata apa yang dibangun. Dokumen ini berkata apa yang **tidak boleh** muncul dan bagaimana membuktikannya sebelum mengklaim selesai.

## 0. Definisi

"Slop" = tampilan yang bisa ditempel ke produk apa pun tanpa ada yang sadar. Ia lahir dari default: palet default, font default, komponen default, kalimat default. Tujuan kita: setiap pilihan visual harus bisa dijelaskan dengan "karena konsep Bilik Analog".

## 1. Daftar larangan

### Visual
- Gradien ungu→biru/pink/oranye, termasuk pada teks (`bg-clip-text`).
- Blob/orb bercahaya buram di latar, efek "glow", neon.
- Glassmorphism (`backdrop-blur` + kartu transparan) sebagai gaya umum.
- Kartu `rounded-2xl` + `shadow-lg` lembut di mana-mana.
- Tiga kartu fitur sejajar dengan ikon dalam lingkaran berwarna.
- Bento grid tanpa alasan konten.
- Hero tengah dengan lencana "✨ Baru", judul besar, dua tombol (utama + outline).
- Emoji sebagai ikon, ikon Lucide/Heroicons polos tanpa pertimbangan.
- Mockup perangkat melayang, testimoni palsu, statistik karangan ("10K+ user").
- Mode gelap neon sebagai default "biar keren".

### Warna dan tipografi
- Palet bawaan Tailwind (`indigo-500`, `slate-900`, `gray-100`, `violet-*`, dll).
- Inter / Roboto / Poppins / Space Grotesk sebagai font utama.
- Semua teks satu bobot dan satu ukuran dengan jarak seragam.
- Hitam murni `#000` di atas putih murni `#fff`.

### Layout dan ritme
- Padding dan jarak identik di semua bagian (ritme monoton).
- Semua elemen rata tengah.
- Bagian yang hanya berbeda warna latar tanpa perbedaan struktur.
- Komponen shadcn/ui dipakai apa adanya tanpa disesuaikan ke token.

### Copywriting
- "Unleash", "Seamless", "Elevate", "Supercharge", "Revolutionize", "Next-gen".
- "Abadikan momen berhargamu", "Selamat datang di…", "Pengalaman terbaik".
- Tanda seru beruntun, kalimat pemasaran kosong, atau lorem ipsum yang tertinggal.
- Penjelasan fitur yang tidak mengatakan apa-apa ("Cepat, mudah, dan aman").

### Kode UI
- Hex/warna/ukuran tersebar sebagai magic value (harus lewat token).
- `className` panjang berisi gaya acak tanpa sistem.
- Animasi `animate-pulse`/`animate-bounce` sebagai dekorasi.
- Placeholder gambar abu-abu yang dibiarkan di produksi.

## 2. Penawar (wajib dipakai)

| Gejala slop | Penawar di proyek ini |
|---|---|
| Palet generik | Hanya token `--paper/--ink/--booth-red/--curtain/--flash` |
| Font generik | Fraunces + Archivo + IBM Plex Mono |
| Bayangan lembut | Bayangan keras offset + garis 2 px |
| Kartu bulat | Radius 4 px, sudut tegas |
| Latar datar | Grain kertas halus, perforasi, garis putus |
| Ikon generik | Set ikon khusus, stroke 2 px, ujung persegi |
| Copy hambar | Microcopy konkret di `DESIGN.md` §8 |
| Dekorasi kosong | Detail fungsional: nomor seri, stempel tanggal, tanda crop |
| Animasi acak | Hanya gerak yang meniru bilik: tirai, flash, strip tercetak |

## 3. Tes yang harus dilulus

Jalankan semuanya sebelum menandai tugas UI selesai.

1. **Swap test.** Ganti nama dan logo dengan aplikasi lain. Jika tampilannya masih cocok, itu slop. Ulangi sampai tidak cocok.
2. **Squint test.** Buram-kan screenshot. Hierarki harus tetap jelas: apa yang pertama dilihat, apa kedua, apa aksinya.
3. **Palette audit.** Cari kode: `grep -rE "(indigo|violet|purple|slate|zinc|gray|neutral)-[0-9]"` dan hex di luar token. Hasil harus kosong.
4. **Font audit.** Hanya tiga keluarga font di atas yang boleh termuat.
5. **Copy audit.** Cari frasa terlarang (bagian 1 copywriting). Harus kosong.
6. **Ritme.** Dalam satu layar, minimal ada dua skala jarak berbeda dan satu elemen yang sengaja tidak simetris.
7. **Konkret test.** Setiap elemen dekoratif harus bisa dijawab: "ini meniru apa dari bilik fisik?" Jika jawabannya "biar bagus", hapus.
8. **State test.** Loading, kosong, error, dan izin ditolak semuanya sudah dirancang (bukan teks polos atau spinner bawaan).

## 4. Ritual kerja agent

Untuk **setiap tugas yang menyentuh UI**:

1. **Sebelum** menulis kode: tulis satu kalimat "konsep layar ini" (mis. "S3 adalah bagian dalam bilik, gelap, fokus ke viewfinder").
2. Bangun menggunakan token dan komponen dari `DESIGN.md`. Jika butuh nilai baru, tambahkan ke token dulu, jangan hardcode.
3. **Sesudah** selesai: jalankan tes di bagian 3, ambil screenshot (mobile 390 px dan desktop 1280 px), lalu catat hasil di `docs/REVIEW-NOTES.md` dengan format:

```
## <layar/komponen> — <tanggal>
- Konsep: ...
- Lolos: swap / squint / palette / font / copy / ritme / konkret / state
- Catatan atau perbaikan: ...
```

4. Jika ada tes yang gagal, perbaiki sebelum lanjut. Jangan tulis "akan diperbaiki nanti".

## 5. Saat ragu

- Pilih yang **lebih spesifik** daripada yang lebih aman.
- Pilih yang **lebih sedikit** (elemen, warna, efek) daripada lebih banyak.
- Bila dua opsi sama-sama masuk akal, pilih yang lebih dekat ke metafora bilik fisik.
- Bila masih ragu, tanyakan, jangan tebak.
