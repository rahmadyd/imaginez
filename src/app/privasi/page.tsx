import Link from "next/link";
import { copy } from "@/lib/copy";

export default function PrivasiPage() {
  return (
    <main className="min-h-[100dvh] bg-paper text-ink p-6 flex justify-center">
      <article className="w-full max-w-[560px] flex flex-col gap-4">
        <Link href="/" className="font-mono text-sm underline underline-offset-4">Kembali</Link>
        <h1 className="font-display text-3xl font-bold">{copy.privasi.title}</h1>
        <div className="border-2 border-ink bg-paper-2 p-4 shadow-[4px_4px_0_var(--ink)] font-body leading-relaxed flex flex-col gap-3">
          <p>{copy.privasi.body}</p>
          <p>Tidak ada akun. Kamera hanya digunakan di tab ini untuk mengambil gambar.</p>
          <p>Secara default foto tidak diunggah. Jika Anda memilih fitur QR Share, hanya foto hasil ekspor yang diunggah ke penyimpanan sementara agar bisa diunduh lewat tautan/QR publik, lalu dihapus otomatis sekitar 5 menit (atau saat kedaluwarsa).</p>
          <p>Data foto lokal dihapus saat Anda menekan &quot;Selesai&quot;, saat sesi tidak aktif, atau saat halaman ditutup.</p>
        </div>
      </article>
    </main>
  );
}
