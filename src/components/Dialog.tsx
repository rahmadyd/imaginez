"use client";

import { useEffect } from "react";
import { copy } from "@/lib/copy";
import { FiligreeCorners } from "@/components/ornaments/TheatreOrnaments";

export function Dialog({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="relative w-full max-w-md bg-paper-2 text-ink border border-brass p-[1px]">
        <FiligreeCorners size={28} inset="inset-1" />
        <div className="border border-brass/50 p-4 relative">
          <div className="flex items-center justify-between mb-3 border-b border-brass/40 pb-2">
            <h2 className="font-display text-xl font-semibold tracking-wide text-gold">{title}</h2>
            <button onClick={onClose} className="font-body text-xs uppercase tracking-[0.14em] border border-brass px-2 py-1 text-ink-2 hover:text-ink" aria-label={copy.common.close}>{copy.common.close}</button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
