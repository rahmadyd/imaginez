import Link from "next/link";
import { notFound } from "next/navigation";
import { getShareRecord } from "@/lib/share-store";

export const dynamic = "force-dynamic";

export default async function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-f0-9]{16,64}$/i.test(id)) notFound();
  const rec = await getShareRecord(id);
  if (!rec) notFound();
  // eslint-disable-next-line react-hooks/purity
  const expired = new Date(rec.expires_at).getTime() <= Date.now();
  const expiresLabel = new Date(rec.expires_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  return (
    <main className="min-h-[100dvh] bg-paper text-ink flex items-center justify-center p-6">
      <div className="w-full max-w-[420px] border border-brass/60 bg-paper-2/40 p-6 flex flex-col gap-4 text-center">
        <h1 className="font-display text-2xl text-gold">Photo Keepsake</h1>
        {expired ? (
          <p className="font-body text-sm text-ink-2">Tautan ini sudah kedaluwarsa.</p>
        ) : (
          <>
            <p className="font-body text-sm text-ink-2">Unduh foto Anda. Tautan berlaku sampai {expiresLabel} (sekitar 5 menit).</p>
            <a href={`/api/share/${id}`} className="inline-flex items-center justify-center min-h-[44px] px-5 font-body font-semibold text-sm uppercase tracking-[0.14em] border border-gold bg-booth-red text-ink hover:bg-curtain transition-colors">Download Foto</a>
          </>
        )}
        <Link href="/" className="font-body text-xs uppercase tracking-[0.14em] text-ink-2 underline underline-offset-4 hover:text-ink">Kembali ke imaginez</Link>
      </div>
    </main>
  );
}