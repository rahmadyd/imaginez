"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/Button";
import { Sunburst, GrainOverlay, FiligreeCorners, TheatreDivider } from "@/components/ornaments/TheatreOrnaments";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<main className="min-h-[100dvh] bg-paper" />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Gagal masuk.");
        return;
      }
      const next = sp.get("next") || "/admin";
      router.push(next);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[100dvh] bg-paper text-ink flex items-center justify-center p-6 relative overflow-hidden">
      <Sunburst className="opacity-50" />
      <GrainOverlay />
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 50% 40% at 50% 50%, rgba(212,175,55,0.08) 0%, transparent 70%)" }} />
      <form onSubmit={submit} className="relative w-full max-w-[380px] border border-brass p-[2px] bg-paper-2/50">
        <FiligreeCorners size={28} inset="inset-1" />
        <div className="border border-brass/40 p-5 flex flex-col gap-4 bg-paper-2/60">
          <div className="text-center">
            <p className="font-body text-[10px] uppercase tracking-[0.28em] text-ink-2 mb-1">imaginez</p>
            <h1 className="font-display text-2xl font-semibold text-gold">Admin</h1>
          </div>
          <TheatreDivider />
          <label className="flex flex-col gap-1 font-body text-xs uppercase tracking-[0.14em] text-ink-2">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border border-brass bg-paper px-3 py-2 font-body text-sm text-ink placeholder:text-ink-2/60"
              autoComplete="email"
            />
          </label>
          <label className="flex flex-col gap-1 font-body text-xs uppercase tracking-[0.14em] text-ink-2">
            Kata sandi
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border border-brass bg-paper px-3 py-2 font-body text-sm text-ink placeholder:text-ink-2/60"
              autoComplete="current-password"
            />
          </label>
          {error && <p className="text-gold font-mono text-sm border border-brass/50 bg-paper px-2 py-1">{error}</p>}
          <Button type="submit" disabled={loading || !email || !password}>{loading ? "Memproses..." : "Masuk"}</Button>
          <Link href="/" className="text-center font-body text-xs uppercase tracking-[0.14em] text-ink-2 underline underline-offset-4 hover:text-ink">Kembali ke beranda</Link>
        </div>
      </form>
    </main>
  );
}
