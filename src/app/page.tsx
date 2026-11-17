"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { copy } from "@/lib/copy";
import { Button } from "@/components/Button";
import { Sunburst, SpotlightBeams, GrainOverlay, MarqueeStrip, TheatreDivider, FiligreeCorners, ScallopedValance } from "@/components/ornaments/TheatreOrnaments";
import { trackEvent } from "@/lib/track-client";

const PAGE_VIEW_KEY = "pb_page_view_tracked";

export default function Home() {
  const router = useRouter();
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(PAGE_VIEW_KEY)) return;
      sessionStorage.setItem(PAGE_VIEW_KEY, "1");
      trackEvent({ event_type: "page_view" });
    } catch {
      trackEvent({ event_type: "page_view" });
    }
  }, []);

  const enter = () => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      router.push("/booth");
      return;
    }
    setOpening(true);
    window.setTimeout(() => router.push("/booth"), 600);
  };

  const pleats =
    "repeating-linear-gradient(90deg, #3a0e16 0px, #781D2B 22px, #5C1622 46px, #4a121c 58px, #6a1926 72px, #3a0e16 92px)";

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-paper text-ink flex items-center justify-center">
      <div className="absolute inset-0 pointer-events-none" style={{ background: pleats }} />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, rgba(18,13,16,0.55) 0%, rgba(18,13,16,0.15) 30%, rgba(18,13,16,0.35) 100%)",
        }}
      />
      <Sunburst className="opacity-50" />
      <SpotlightBeams />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 45% at 50% 42%, rgba(212,175,55,0.12) 0%, rgba(18,13,16,0) 70%)",
        }}
      />
      <GrainOverlay />
      <div className="absolute top-0 left-0 right-0 z-0 pointer-events-none opacity-90">
        <ScallopedValance />
      </div>

      <div
        className={`absolute inset-y-0 left-0 w-1/2 transition-transform duration-[600ms] ease-[var(--ease-out)] motion-reduce:transition-none z-0 ${
          opening ? "-translate-x-full" : "translate-x-0"
        }`}
        style={{ background: pleats, boxShadow: "inset -22px 0 40px rgba(0,0,0,0.55), inset 8px 0 18px rgba(212,175,55,0.05)" }}
      />
      <div
        className={`absolute inset-y-0 right-0 w-1/2 transition-transform duration-[600ms] ease-[var(--ease-out)] motion-reduce:transition-none z-0 ${
          opening ? "translate-x-full" : "translate-x-0"
        }`}
        style={{ background: pleats, boxShadow: "inset 22px 0 40px rgba(0,0,0,0.55), inset -8px 0 18px rgba(212,175,55,0.05)" }}
      />

      <div className={`relative z-10 max-w-[580px] px-6 text-center flex flex-col items-center gap-5 transition-opacity duration-[300ms] motion-reduce:transition-none ${opening ? "opacity-0" : "opacity-100"}`}>
        <p className="font-body text-xs uppercase tracking-[0.3em] text-gold/80">{copy.brand}</p>
        <div className="w-full border border-brass/70 p-[2px] bg-paper-2/30 relative">
          <FiligreeCorners size={34} inset="inset-1" />
          <div className="border border-brass/40 px-8 py-10 flex flex-col items-center gap-4 bg-paper-2/70 relative">
            <MarqueeStrip count={14} className="w-full mb-1" />
            <h1 className="font-display text-[clamp(2.4rem,7vw,3.8rem)] font-semibold leading-tight text-ink">
              {copy.s0.title}
            </h1>
            <TheatreDivider className="max-w-[260px]" />
            <p className="font-body text-sm text-ink-2 max-w-[36ch] leading-relaxed">{copy.s0.subtitle}</p>
            <Button onClick={enter} className="mt-2 w-full max-w-[280px]">
              {copy.s0.cta}
            </Button>
            <MarqueeStrip count={14} className="w-full mt-1" />
          </div>
        </div>
        <p className="font-mono text-[11px] text-ink-2 tracking-wide">{copy.s0.note}</p>
        <Link href="/privasi" className="font-body text-xs uppercase tracking-[0.18em] underline underline-offset-4 text-ink-2 hover:text-ink">Privacy</Link>
      </div>
    </main>
  );
}

