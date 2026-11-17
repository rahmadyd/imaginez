"use client";

import { copy } from "@/lib/copy";
import { Button } from "./Button";
import { Sunburst, GrainOverlay, TheatreDivider, FiligreeCorners } from "@/components/ornaments/TheatreOrnaments";

type Props = {
  onAllow: () => void;
  onGallery: () => void;
  error: string | null;
  onRetry: () => void;
  hint?: string | null;
  altActionLabel?: string | null;
  onAltAction?: () => void;
};

export function PermissionScreen({ onAllow, onGallery, error, onRetry, hint, altActionLabel, onAltAction }: Props) {
  return (
    <div className="min-h-[100dvh] bg-paper text-ink flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <Sunburst className="opacity-60" />
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 50% 40% at 50% 50%, rgba(212,175,55,0.08) 0%, transparent 70%)" }} />
      <GrainOverlay />
      <div className="relative w-full max-w-[460px] border border-brass p-[2px] bg-paper-2/40">
        <FiligreeCorners size={30} inset="inset-1" />
        <div className="border border-brass/40 p-6 flex flex-col gap-4 relative">
          <div className="flex items-center gap-3 pb-3">
            <div className="w-11 h-11 border border-brass flex items-center justify-center text-gold bg-paper/40">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="6" width="14" height="12"/><path d="M17 9l4-2v10l-4-2"/></svg>
            </div>
            <h1 className="font-display text-2xl font-semibold text-gold">{copy.s2.title}</h1>
          </div>
          <TheatreDivider />
          <div className="font-body text-sm leading-relaxed flex flex-col gap-1 text-ink-2">
            <p>{copy.s2.line1}</p>
            <p>{copy.s2.line2}</p>
            <p>{copy.s2.line3}</p>
          </div>
          {hint && <p className="font-mono text-xs text-ink-2">{hint}</p>}
          {error && (
            <div className="border border-brass/60 bg-paper p-3 text-sm">
              <p className="font-semibold text-gold">{error}</p>
              {error === copy.s2.denied && (
                <p className="mt-1 text-ink-2">{copy.s2.deniedHelp}</p>
              )}
            </div>
          )}
          <div className="flex flex-col gap-2 mt-2">
            {error ? (
              <>
                <Button onClick={onRetry}>{copy.s2.tryAgain}</Button>
                {altActionLabel && onAltAction && <Button variant="secondary" onClick={onAltAction}>{altActionLabel}</Button>}
              </>
            ) : (
              <Button onClick={onAllow}>{copy.s2.allow}</Button>
            )}
            <button onClick={onGallery} className="font-body text-xs uppercase tracking-[0.16em] underline underline-offset-4 py-2 text-ink-2 hover:text-ink">{copy.s2.gallery}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
