import React from "react";

type CornerProps = { className?: string; size?: number };

export function CornerFiligree({ className = "", size = 48 }: CornerProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className} aria-hidden>
      <path d="M2 46V18C2 9.163 9.163 2 18 2H46" stroke="#D4AF37" strokeWidth="1.2" />
      <path d="M6 46V20C6 12.268 12.268 6 20 6H46" stroke="#C5A059" strokeWidth="0.8" opacity="0.8" />
      <path d="M2 30C10 30 14 26 14 18" stroke="#D4AF37" strokeWidth="0.8" opacity="0.7" />
      <path d="M10 2L10 10M2 10L10 10" stroke="#D4AF37" strokeWidth="0.8" opacity="0.6" />
      <circle cx="14" cy="14" r="2" fill="#D4AF37" opacity="0.7" />
      <path d="M20 2C20 8 17 11 11 11" stroke="#C5A059" strokeWidth="0.8" opacity="0.6" />
    </svg>
  );
}

export function FiligreeCorners({ className = "", size = 48, inset = "inset-0" }: { className?: string; size?: number; inset?: string }) {
  return (
    <div className={`pointer-events-none absolute ${inset} ${className}`} aria-hidden>
      <CornerFiligree size={size} className="absolute top-0 left-0" />
      <CornerFiligree size={size} className="absolute top-0 right-0 -scale-x-100" />
      <CornerFiligree size={size} className="absolute bottom-0 left-0 -scale-y-100" />
      <CornerFiligree size={size} className="absolute bottom-0 right-0 scale-x-[-1] scale-y-[-1]" />
    </div>
  );
}

export function TheatreDivider({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 w-full ${className}`} aria-hidden>
      <span className="h-px flex-1 bg-gradient-to-r from-transparent via-brass/60 to-brass/30" />
      <svg width="10" height="10" viewBox="0 0 10 10" className="text-gold shrink-0"><path d="M5 0L6.2 3.8L10 5L6.2 6.2L5 10L3.8 6.2L0 5L3.8 3.8Z" fill="currentColor"/></svg>
      <svg width="6" height="6" viewBox="0 0 10 10" className="text-brass/70 shrink-0"><rect x="1.5" y="1.5" width="7" height="7" transform="rotate(45 5 5)" fill="currentColor"/></svg>
      <svg width="10" height="10" viewBox="0 0 10 10" className="text-gold shrink-0"><path d="M5 0L6.2 3.8L10 5L6.2 6.2L5 10L3.8 6.2L0 5L3.8 3.8Z" fill="currentColor"/></svg>
      <span className="h-px flex-1 bg-gradient-to-l from-transparent via-brass/60 to-brass/30" />
    </div>
  );
}

export function MarqueeStrip({ count = 12, className = "" }: { count?: number; className?: string }) {
  return (
    <div className={`flex items-center justify-between gap-1 ${className}`} aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className="block rounded-full bg-[#FFF3C4]"
          style={{
            width: 8,
            height: 8,
            boxShadow: "0 0 6px 2px rgba(212,175,55,0.55), 0 0 2px 1px rgba(255,243,196,0.8)",
            animation: `${i % 2 === 0 ? "marquee-twinkle" : "marquee-twinkle-alt"} 1.8s ease-in-out infinite`,
            animationDelay: `${(i % 3) * 0.2}s`,
          }}
        />
      ))}
    </div>
  );
}

export function ScallopedValance({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none ${className}`} aria-hidden>
      <svg viewBox="0 0 400 60" preserveAspectRatio="none" className="w-full h-[44px] block">
        <defs>
          <linearGradient id="velvet" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#781D2B" />
            <stop offset="100%" stopColor="#5C1622" />
          </linearGradient>
        </defs>
        <path d="M0,0 H400 V28 Q375,52 350,28 Q325,52 300,28 Q275,52 250,28 Q225,52 200,28 Q175,52 150,28 Q125,52 100,28 Q75,52 50,28 Q25,52 0,28 Z" fill="url(#velvet)" />
        <path d="M0,28 Q25,52 50,28 Q75,52 100,28 Q125,52 150,28 Q175,52 200,28 Q225,52 250,28 Q275,52 300,28 Q325,52 350,28 Q375,52 400,28" stroke="#C5A059" strokeWidth="1.2" fill="none" />
        {Array.from({ length: 40 }).map((_, i) => {
          const x = 5 + i * 10;
          const scallop = Math.floor(i / 5);
          const mid = 25 + scallop * 50;
          const yBase = 28 + 18 * (1 - Math.pow(Math.abs(x - mid) / 25, 2));
          const y = Math.max(28, Math.min(46, yBase));
          return <line key={i} x1={x} y1={y} x2={x} y2={y + 10} stroke="#D4AF37" strokeWidth="1" opacity="0.7" />;
        })}
      </svg>
    </div>
  );
}

export function SideDrape({ side }: { side: "left" | "right" }) {
  const flip = side === "right";
  return (
    <div className={`pointer-events-none absolute inset-y-0 ${side === "left" ? "left-0" : "right-0"} w-[56px] sm:w-[72px] hidden sm:block`} aria-hidden style={{ transform: flip ? "scaleX(-1)" : undefined }}>
      <svg viewBox="0 0 80 400" preserveAspectRatio="none" className="w-full h-full">
        <defs>
          <linearGradient id={`drape-${side}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3a0e16" />
            <stop offset="40%" stopColor="#781D2B" />
            <stop offset="70%" stopColor="#5C1622" />
            <stop offset="100%" stopColor="rgba(18,13,16,0)" />
          </linearGradient>
        </defs>
        <path d="M0,0 H70 Q55,50 65,100 Q50,150 62,200 Q48,250 60,300 Q50,350 58,400 H0 Z" fill={`url(#drape-${side})`} />
        <path d="M18,0 Q8,50 16,100 Q6,150 14,200 Q4,250 12,300 Q6,350 10,400" stroke="rgba(0,0,0,0.25)" strokeWidth="6" fill="none" />
        <path d="M38,0 Q28,50 36,100 Q26,150 34,200 Q24,250 32,300 Q26,350 30,400" stroke="rgba(0,0,0,0.18)" strokeWidth="5" fill="none" />
        <path d="M10,140 Q40,150 55,135" stroke="#C5A059" strokeWidth="2.5" fill="none" />
        <circle cx="40" cy="150" r="5" fill="#D4AF37" />
        <path d="M40,155 L36,175 M40,155 L40,178 M40,155 L44,175" stroke="#D4AF37" strokeWidth="1.2" />
      </svg>
    </div>
  );
}

export function Sunburst({ className = "" }: { className?: string }) {
  const fmt = (n: number) => Math.round(n * 1000) / 1000;
  const rays = Array.from({ length: 36 }).map((_, i) => {
    const a = (i * 360) / 36;
    const a2 = a + 4;
    const r = 900;
    const x1 = fmt(500 + r * Math.cos((Math.PI * a) / 180));
    const y1 = fmt(200 + r * Math.sin((Math.PI * a) / 180));
    const x2 = fmt(500 + r * Math.cos((Math.PI * a2) / 180));
    const y2 = fmt(200 + r * Math.sin((Math.PI * a2) / 180));
    return <path key={i} d={`M500,200 L${x1},${y1} L${x2},${y2} Z`} fill="#D4AF37" opacity={i % 2 === 0 ? 0.08 : 0.03} />;
  });
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      <svg viewBox="0 0 1000 600" preserveAspectRatio="xMidYMin slice" className="w-full h-full">
        {rays}
        <circle cx="500" cy="200" r="120" fill="#D4AF37" opacity="0.04" />
      </svg>
    </div>
  );
}

export function SpotlightBeams({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      <div className="absolute -top-10 left-[10%] w-[40%] h-[70%] rotate-[18deg]" style={{ background: "linear-gradient(to bottom, rgba(244,239,230,0.10), rgba(244,239,230,0))", filter: "blur(12px)" }} />
      <div className="absolute -top-10 right-[10%] w-[40%] h-[70%] -rotate-[18deg]" style={{ background: "linear-gradient(to bottom, rgba(212,175,55,0.08), rgba(212,175,55,0))", filter: "blur(12px)" }} />
    </div>
  );
}

export function GrainOverlay({ className = "" }: { className?: string }) {
  return <div className={`pointer-events-none absolute inset-0 theatre-grain opacity-[0.07] mix-blend-soft-light ${className}`} aria-hidden />;
}

export function RibbonBadge({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`inline-flex items-center ${className}`} aria-label={typeof children === "string" ? children : undefined}>
      <svg width="14" height="28" viewBox="0 0 14 28" className="text-curtain shrink-0"><path d="M14,0 L0,0 L6,14 L0,28 L14,28 Z" fill="currentColor" stroke="#C5A059" strokeWidth="0.8"/></svg>
      <span className="bg-curtain border-y border-brass/70 px-3 py-1 font-body text-[10px] uppercase tracking-[0.22em] text-gold">{children}</span>
      <svg width="14" height="28" viewBox="0 0 14 28" className="text-curtain shrink-0 -scale-x-100"><path d="M14,0 L0,0 L6,14 L0,28 L14,28 Z" fill="currentColor" stroke="#C5A059" strokeWidth="0.8"/></svg>
    </div>
  );
}
