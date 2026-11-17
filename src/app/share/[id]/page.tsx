import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SharePage() {
  return (
    <main className="min-h-[100dvh] bg-paper text-ink flex items-center justify-center p-6">
      <div className="w-full max-w-[420px] border border-brass/60 bg-paper-2/40 p-6 flex flex-col gap-4 text-center">
        <h1 className="font-display text-2xl text-gold">Photo Keepsake</h1>
        <p className="font-body text-sm text-ink-2">Fitur berbagi tidak tersedia di deployment ini.</p>
        <Link href="/" className="font-body text-xs uppercase tracking-[0.14em] text-ink-2 underline underline-offset-4 hover:text-ink">Kembali ke imaginez</Link>
      </div>
    </main>
  );
}