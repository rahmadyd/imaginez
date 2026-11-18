# ARCHITECTURE — Web Photobooth

> Cara membangun. Aturan privasi di bagian 2 adalah **constraint keras**: tidak boleh dilanggar demi alasan apa pun, termasuk kemudahan implementasi.

## 1. Stack

| Lapisan | Pilihan |
|---|---|
| Framework | Next.js (App Router) + TypeScript `strict` |
| Styling | Tailwind CSS, dipetakan ke design tokens (`DESIGN.md`) |
| State sesi | Zustand atau `useReducer`, **hanya di memori** |
| Validasi | Zod |
| Metadata template | Cloudflare D1 (SQLite) |
| File template | Cloudflare R2 |
| Deploy | Cloudflare (Workers/Pages via `@opennextjs/cloudflare`). Alternatif: Vercel + Supabase jika Cloudflare menyulitkan |
| Test | Vitest (unit), Playwright (e2e, kamera palsu) |

## 2. Aturan privasi (HARD RULES)

1. **Tidak ada request jaringan yang membawa data foto user.** Tidak ada `fetch`/`XHR`/`sendBeacon`/WebSocket dengan body berisi gambar dari kamera atau galeri user.
2. **Tidak ada persistensi foto.** Dilarang menyimpan foto atau turunannya (blob URL, dataURL, ImageBitmap) ke `localStorage`, `sessionStorage`, `IndexedDB`, Cache API, cookie, atau service worker.
3. **Tidak ada kebocoran lewat tooling.** Logging, error reporting, dan analitik dilarang memuat data gambar atau blob URL. Analitik (jika ada) hanya hitungan agregat tanpa identitas, mis. "template X dipilih".
4. **Pelepasan memori eksplisit.** Lihat modul `session/wipe.ts` di bagian 7.
5. **Pembatasan di level browser.** CSP `connect-src 'self'` dan tanpa pihak ketiga yang bisa menerima data.
6. **Terverifikasi.** Test e2e wajib membuktikan poin 1 dan 2 (lihat `TASKS.md` T3.8).

Satu-satunya hal yang boleh disimpan di `localStorage`: preferensi non-foto (mis. suara aktif/mati).

## 3. Diagram

```
                ┌──────────────────────── BROWSER USER ────────────────────────┐
                │  getUserMedia → <video> → captureFrame → ImageBitmap[] (RAM) │
                │                                   │                          │
                │          template JSON + overlay ─┤                          │
                │                                   ▼                          │
                │                          renderStrip (Canvas)                │
                │                                   ▼                          │
                │                       Blob → unduh / Web Share               │
                │                                   ▼                          │
                │                        wipe() — lepas semua                  │
                └───────────────▲──────────────────────────────────────────────┘
                                │ hanya GET template (JSON + PNG overlay)
                      ┌─────────┴──────────┐
                      │  Next.js (Edge)    │──── D1 (metadata)
                      │  /api/*            │──── R2 (PNG overlay)
                      └─────────▲──────────┘
                                │ (cookie sesi, HTTPS)
                         ┌──────┴───────┐
                         │ ADMIN        │ upload PNG, edit slot, publish
                         └──────────────┘
```

## 4. Struktur folder

```
/
├─ AGENTS.md
├─ docs/                      SPEC, ARCHITECTURE, DESIGN, AI-SLOP, TASKS
├─ migrations/                SQL D1
├─ public/seed/               template contoh untuk dev
├─ scripts/                   make-seed.ts, dll
├─ src/
│  ├─ app/
│  │  ├─ page.tsx             landing
│  │  ├─ booth/page.tsx       alur user
│  │  ├─ privasi/page.tsx
│  │  ├─ admin/
│  │  │  ├─ login/page.tsx
│  │  │  ├─ page.tsx          daftar template
│  │  │  └─ templates/[id]/page.tsx   editor
│  │  └─ api/
│  │     ├─ templates/route.ts
│  │     ├─ templates/[id]/overlay/route.ts
│  │     └─ admin/...
│  ├─ features/
│  │  ├─ camera/              useCamera, captureFrame, errors
│  │  ├─ compositor/          cover.ts, render.ts, export.ts
│  │  ├─ session/             store.ts, wipe.ts, idle.ts
│  │  ├─ templates/           types.ts, schema.ts, client.ts
│  │  └─ admin/               slot-editor/, auto-detect.ts
│  ├─ components/             UI bersama
│  ├─ lib/                    db.ts, r2.ts, auth.ts
│  └─ styles/tokens.css
└─ tests/                     unit/, e2e/
```

## 5. Model data

### Tipe

```ts
export type Slot = {
  x: number; y: number;   // pojok kiri-atas sebelum rotasi, dalam piksel canvas template
  w: number; h: number;
  rotate: number;         // derajat, 0 default, searah jarum jam
  radius?: number;        // px, radius sudut clip slot (default 0)
};

export type Template = {
  id: string;
  name: string;
  canvas: { w: number; h: number };
  slots: Slot[];          // urutan array = urutan pengambilan foto
  overlayKey: string;     // kunci objek overlay/layer atas (transparan di area slot)
  baseLayerKey?: string;  // kunci PNG utuh asli (layer bawah), ada jika mode template-di-depan aktif
  bleed?: number;         // px, perluasan foto di bawah bingkai (default 0; efektif hanya jika ada layer atas)
  background: string;     // warna hex di belakang foto, default "#ffffff"
  published: boolean;
  sort: number;
};
```

### D1

```sql
CREATE TABLE templates (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  canvas_w       INTEGER NOT NULL,
  canvas_h       INTEGER NOT NULL,
  slots_json     TEXT NOT NULL,
  overlay_key    TEXT NOT NULL,
  base_layer_key TEXT,
  bleed          INTEGER NOT NULL DEFAULT 0,
  background     TEXT NOT NULL DEFAULT '#ffffff',
  published      INTEGER NOT NULL DEFAULT 0,
  sort           INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
);
CREATE INDEX idx_templates_pub_sort ON templates (published, sort);
```

Kolom `base_layer_key` dan `bleed` ditambahkan untuk mode template-di-depan; migrasi harus backward-compatible (`ALTER TABLE ... ADD COLUMN` / default).

## 6. API

| Method | Path | Auth | Fungsi |
|---|---|---|---|
| GET | `/api/templates` | publik | Daftar template published (tanpa data admin) |
| GET | `/api/templates/:id/overlay` | publik | Stream PNG overlay dari R2, `Cache-Control: public, max-age=3600` |
| POST | `/api/admin/login` | — | Login, set cookie `httpOnly; Secure; SameSite=Lax` |
| POST | `/api/admin/logout` | admin | Hapus sesi |
| GET | `/api/admin/templates` | admin | Semua template termasuk draft |
| POST | `/api/admin/templates` | admin | Buat template (multipart: PNG + JSON) |
| PUT | `/api/admin/templates/:id` | admin | Ubah metadata/slot, atau ganti PNG |
| PATCH | `/api/admin/templates/reorder` | admin | Simpan urutan |
| DELETE | `/api/admin/templates/:id` | admin | Hapus template + objek R2 |

Catatan penting:
- **Overlay wajib disajikan same-origin** lewat rute di atas. Jika PNG dimuat dari domain lain tanpa CORS, canvas menjadi *tainted* dan `toBlob()` gagal. Jangan arahkan klien langsung ke URL R2.
- Semua input admin divalidasi dengan Zod di server. Validasi file: MIME + magic bytes PNG, ada kanal alpha, ukuran ≤ 8 MB, dimensi ≤ 4000×6000.
- Login dibatasi rate (mis. 5 percobaan / 10 menit / IP).

## 7. Modul inti

### 7.1 Kamera (`features/camera`)
- Deteksi mode: **mobile** jika `matchMedia('(pointer: coarse)').matches && navigator.maxTouchPoints > 0`; selain itu **desktop**. **Jangan** menentukan mode dari user agent. Fungsi deteksi dibuat murni dan di-unit-test (mock `matchMedia`/`navigator`). Jika stream aktif namun `track.getSettings().facingMode` kosong, perlakukan sebagai **desktop** (tampilkan pemilih daftar). Tombol depan/belakang hanya muncul jika perangkat benar-benar punya lebih dari satu kamera.
- `useCamera` (API target): memperluas ke `{ videoRef, status, error, start, stop, mode, facing ("user"|"environment"), devices, activeDeviceId, switchFacing(), selectDevice(id), refreshDevices() }` (nama final bisa disesuaikan dengan implementasi, tetap terdokumentasi di kode). `devices` adalah daftar `videoinput` (`enumerateDevices`) setelah izin diberikan (sebelum izin label sering kosong). Jika label kosong, UI menampilkan “Kamera 1”, “Kamera 2”, dst. Dengarkan `devicechange` untuk memperbarui daftar; jika kamera aktif hilang, fallback ke kamera default dan beri tahu pengguna (toast/pesan sesuai UI).
- Constraint: default mobile = `facingMode: "user"` (depan). Saat beralih depan↔belakang coba `{ exact }` dulu, jika `OverconstrainedError` ulangi dengan `{ ideal }`. Desktop memakai `deviceId: { exact: id }` (dari daftar terpilih). Resolusi ideal `1920×1080` (portrait menyesuaikan di mobile). `captureFrame` tetap center-crop ke `layout.captureAspect`.
- Tipe error dibedakan: `denied`, `not-found`, `in-use` (`NotReadableError`/serupa), `insecure-context`, `unknown`. Tambahan konteks browser in-app: deteksi via user agent **hanya** untuk menampilkan petunjuk “Buka di Chrome atau Safari” bila `getUserMedia` gagal, **bukan** untuk menentukan mode kamera.
- `stop()`/pindah/pilih kamera: hentikan semua track lama (`track.stop()`) sebelum membuka stream baru; semua track dihentikan pada `wipe()`. Pindah/pilih **dinonaktifkan** saat countdown atau pengambilan foto berlangsung; foto yang sudah diambil tetap (boleh dari kamera berbeda).
- Preview: mobile – kamera depan dicerminkan dengan CSS `scaleX(-1)`, kamera belakang **tidak** dicerminkan. Desktop – toggle “Cermin preview” default **aktif** (hanya visual; tidak mengubah hasil unduhan). Frame yang disimpan **tidak** dicerminkan pada alur normal (aturan tetap). Preferensi non-foto boleh disimpan di `localStorage` kunci `pb:camera` (hanya mode/facing/deviceId; tanpa data foto). Jika `deviceId` tersimpan tidak ada lagi, abaikan.
- **Siklus hidup kamera:** stream hanya hidup pada fase `permission` (saat izin diminta/diberikan) dan `capturing`. Pada fase `reviewing` dan `done` kamera **wajib** dimatikan (`stop()` → semua track berhenti) supaya indikator kamera mati dan halaman hasil tidak memegang sumber gambar. Memasuki kembali fase `capturing` (mis. retake) membuka stream baru. Elemen `<video>` memasang stream lewat callback ref (`setVideoElement`) agar preview tetap tampil meski `<video>` baru mounts setelah stream terbuka.

### 7.2 Capture
`captureFrame(video, targetAspect, maxSide=1920): Promise<ImageBitmap>`
1. Hitung area potong dari `videoWidth/videoHeight` agar rasionya = `targetAspect` (center crop).
2. Gambar ke canvas, batasi sisi terpanjang ke `maxSide`.
3. Kembalikan `ImageBitmap`. Foto sudah terpotong sesuai slot, jadi memori hemat.

### 7.3 Compositor (`features/compositor`)
```ts
renderStrip({ template, photos, overlay, baseLayer?, options? }): HTMLCanvasElement
```
Urutan layer:
1. Isi `background`.
2. Jika `baseLayer` ada (mode template-di-depan), gambar `baseLayer` di (0,0) seukuran canvas.
3. Untuk tiap slot: `save` → translate ke pusat slot → rotate → clip bentuk slot (persegi/rounded sesuai `slot.radius`) → `drawImage` cover-crop → `restore`. Jika ada layer atas (`baseLayer`/mode lubang) dan `template.bleed > 0`, foto digambar pada area `slot + bleed` (ke semua sisi, ter-clamp agar tidak melewati canvas) dan clip diperluas sesuai `radius + bleed` supaya tepi foto tersembunyi di bawah bingkai. Tanpa layer atas, `bleed` diabaikan.
4. Gambar `overlay` (layer atas/transparan di area slot) di (0,0) seukuran canvas.

`overlay`/`baseLayer` dimuat same-origin via API. Untuk template biasa (tanpa `baseLayerKey`) perilaku tetap: foto di bawah, overlay di atas.

Cover-crop: `s = max(drawW / srcW, drawH / srcH)`; ukuran gambar = `srcW*s × srcH*s`; pusatkan.
Ekspor: `exportBlob(canvas, "png" | "jpeg", quality = 0.92)`.
Preview di layar boleh memakai `scale` < 1. Unduhan selalu `scale = 1`.

### 7.4 Sesi dan wipe (`features/session`)
State machine eksplisit: `idle → choosing → permission → capturing → reviewing → done`.

`wipe()` harus:
1. Menutup semua `ImageBitmap` (`bitmap.close()`).
2. Me-`revokeObjectURL` semua blob URL.
3. Mengosongkan canvas (`width = height = 0`).
4. Menghentikan stream kamera.
5. Mereset store ke state awal.

Pemicu: tombol Selesai, idle timeout (`idle.ts`), `pagehide`, dan ganti template/mulai ulang.

### 7.5 Deteksi slot otomatis (`features/admin/auto-detect.ts`)
1. Muat overlay ke canvas, perkecil agar sisi terpanjang ≤ 800 px.
2. Buat mask piksel dengan `alpha ≤ 16`.
3. Labeli komponen terhubung (4-neighbour).
4. Ambil bounding box tiap komponen. Buang yang luasnya < 1,5% luas canvas.
5. Urutkan *reading order* (atas→bawah, kiri→kanan, toleransi baris ±2% tinggi).
6. Skalakan kembali ke koordinat canvas asli.
7. Jika komponen tidak persegi (rasio isi < 0,9), tetap pakai bounding box dan beri peringatan di UI. Admin mengoreksi manual.

### 7.6 Autentikasi admin
- Kredensial dikelola di Supabase Auth; server memverifikasi lewat `supabase.auth.signInWithPassword` (tanpa menyimpan hash di aplikasi).
- Otorisasi: email hasil login harus terdaftar di `ADMIN_EMAIL` (kosong = semua login ditolak).
- Sesi: dimiliki Supabase Auth — `@supabase/ssr` menyimpan access/refresh token di cookie `httpOnly`, `Secure`, `SameSite=Lax`. Masa berlaku sesi mengikuti Supabase Auth (access token 1 jam, refresh token diperpanjang server); tombol "Keluar" mencabut refresh token di Supabase. Tidak ada secret sesi lokal.
- Middleware melindungi `/admin/*` dan `/api/admin/*` (validasi `auth.getUser()` + allowlist email).
- Alternatif yang lebih ringan: Cloudflare Access di depan `/admin`.

## 8. Header keamanan

```
Content-Security-Policy:
  default-src 'self';
  img-src 'self' blob: data:;
  media-src 'self' blob:;
  connect-src 'self';
  script-src 'self';          (tambahkan nonce sesuai kebutuhan Next.js)
  style-src 'self' 'unsafe-inline';
  font-src 'self';
  frame-ancestors 'none';
Permissions-Policy: camera=(self), microphone=(), geolocation=()
Referrer-Policy: same-origin
X-Content-Type-Options: nosniff
```

## 9. Environment

```
SUPABASE_URL=
SUPABASE_SECRET_KEY=
SUPABASE_PUBLISHABLE_KEY=
ADMIN_EMAIL=
# Binding Cloudflare (wrangler.toml): DB (D1), TEMPLATES_BUCKET (R2)
```

## 10. Strategi test

- **Unit:** matematika cover-crop, auto-detect pada gambar sintetis, validasi Zod, state machine sesi.
- **Compositor:** pembanding piksel (toleransi kecil) untuk template seed.
- **E2E (Playwright, Chromium dengan `--use-fake-device-for-media-stream --use-fake-ui-for-media-stream`):**
  - Alur penuh sampai unduh.
  - Selama alur, tidak ada request dengan body gambar.
  - Setelah "Selesai": `localStorage`, `sessionStorage`, IndexedDB, Cache Storage kosong dari data foto.
- **Manual:** matriks perangkat di `TASKS.md` T5.6.
