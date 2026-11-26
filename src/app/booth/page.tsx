"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { copy } from "@/lib/copy";
import { Button } from "@/components/Button";
import { Dialog } from "@/components/Dialog";
import { PermissionScreen } from "@/components/PermissionScreen";
import { useSession } from "@/features/session/store";
import type { ClientTemplate } from "@/features/templates/schema";
import { useCamera } from "@/features/camera/useCamera";
import { captureFrame, readImageFile } from "@/features/camera/capture";
import { deviceLabel } from "@/features/camera/mode";
import { isInAppBrowser } from "@/features/camera/errors";
import { renderStrip, exportBlob, downloadBlob, shareFile } from "@/features/compositor/render";
import { loadOverlay } from "@/features/compositor/load";
import { Sunburst, SpotlightBeams, GrainOverlay, FiligreeCorners, TheatreDivider, MarqueeStrip, ScallopedValance, SideDrape, RibbonBadge } from "@/components/ornaments/TheatreOrnaments";
import { trackEvent } from "@/lib/track-client";

type LoadState = "loading" | "ready" | "empty" | "error";
const PAGE_VIEW_KEY = "pb_page_view_tracked";
const VIEWFINDER_MAX_HEIGHT_VH = 52;

function createSessionCode() {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  } catch { /* ignore */ }
  return `sess-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function BoothPage() {
  const router = useRouter();
  const session = useSession();
  const camera = useCamera({ initialFacing: "user" });
  const [templates, setTemplates] = useState<ClientTemplate[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hintDismissed, setHintDismissed] = useState(false);
  const [sessionCode, setSessionCode] = useState(() => createSessionCode());
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const [galleryBusy, setGalleryBusy] = useState(false);
  const sessionCompletedTrackedFor = useRef<string | null>(null);

  useEffect(() => {
    try {
      if (!sessionStorage.getItem(PAGE_VIEW_KEY)) {
        sessionStorage.setItem(PAGE_VIEW_KEY, "1");
        trackEvent({ event_type: "page_view" });
      }
    } catch {
      trackEvent({ event_type: "page_view" });
    }
  }, []);

  useEffect(() => {
    session.enterChoosing();
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/templates", { cache: "no-store" });
        if (!res.ok) throw new Error("fail");
        const data = (await res.json()) as { templates: ClientTemplate[] };
        if (cancelled) return;
        setTemplates(data.templates ?? []);
        setLoadState((data.templates ?? []).length ? "ready" : "empty");
      } catch {
        if (!cancelled) setLoadState("error");
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => { camera.stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const phase = session.state.phase;
    if (phase === "reviewing" || phase === "done") camera.stop();
  }, [session.state.phase, camera]);

  const selected = useMemo(() => templates.find(t => t.id === selectedId) ?? null, [templates, selectedId]);

  const goPermission = () => {
    if (!selected) return;
    const nextCode = createSessionCode();
    setSessionCode(nextCode);
    sessionCompletedTrackedFor.current = null;
    session.selectTemplate(selected);
    session.grantPermission();
  };

  const onAllowCamera = async () => {
    setHintDismissed(false);
    setGalleryError(null);
    await camera.start();
  };

  const readGalleryFile = async (file: File, slotIndex: number) => {
    const template = session.state.template;
    if (!template) return false;
    const slotDef = template.slots[slotIndex];
    if (!slotDef) return false;
    const bmp = await readImageFile(file, slotDef.w / slotDef.h, 1920);
    session.capturePhoto(slotIndex, bmp);
    return true;
  };

  const startGallery = async (files: File[]) => {
    const template = session.state.template;
    if (!template) return;
    const list = files.filter((f) => f.type.startsWith("image/"));
    if (!list.length) {
      setGalleryError(copy.s3g.failed);
      return;
    }
    setGalleryBusy(true);
    setGalleryError(null);
    try {
      session.startGallery();
      for (let i = 0; i < list.length; i++) {
        const ok = await readGalleryFile(list[i], i);
        if (!ok) break;
      }
    } catch {
      setGalleryError(copy.s3g.failed);
    } finally {
      setGalleryBusy(false);
    }
  };

  const addGalleryFiles = async (files: File[]) => {
    const photos = session.state.photos;
    let slotIndex = photos.findIndex((p) => p === null);
    if (slotIndex === -1) return;
    setGalleryBusy(true);
    setGalleryError(null);
    try {
      for (const file of files.filter((f) => f.type.startsWith("image/"))) {
        if (slotIndex === -1) break;
        const ok = await readGalleryFile(file, slotIndex);
        if (!ok) break;
        slotIndex += 1;
      }
    } catch {
      setGalleryError(copy.s3g.failed);
    } finally {
      setGalleryBusy(false);
    }
  };

  useEffect(() => {
    if (session.state.phase === "filling" && session.state.photos.length > 0 && session.state.photos.every((p) => p !== null)) {
      session.captureComplete();
    }
  }, [session.state.phase, session.state.photos, session]);

  useEffect(() => {
    if (session.state.phase === "permission" && camera.status === "active") {
      session.startCapture();
    }
  }, [session.state.phase, camera.status, session]);

  useEffect(() => {
    if (session.state.phase === "reviewing" && session.state.template && sessionCompletedTrackedFor.current !== sessionCode) {
      sessionCompletedTrackedFor.current = sessionCode;
      trackEvent({
        event_type: "session_completed",
        template_id: session.state.template.id,
        session_code: sessionCode,
      });
    }
  }, [session.state.phase, session.state.template, sessionCode]);

  const inAppHint = !hintDismissed && session.state.phase === "permission" && camera.status === "error" && isInAppBrowser() ? copy.s2.inAppHint : null;

  const cameraErrorMsg = (err: typeof camera.error) => {
    if (!err) return null;
    switch (err) {
      case "denied": return copy.s2.denied;
      case "in-use": return copy.s3.cameraInUse;
      case "not-found": return copy.s2.notFound;
      case "insecure-context": return copy.s2.insecure;
      default: return copy.s2.unknown;
    }
  };

  let screen: ReactNode;
  if (session.state.phase === "done") {
    screen = <DoneScreen onAgain={() => { session.reset(); router.push("/"); }} />;
  } else if (session.state.phase === "choosing") {
    screen = (
      <ChooseScreen
        loadState={loadState}
        templates={templates}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onNext={goPermission}
        onRetry={() => window.location.reload()}
      />
    );
  } else if (session.state.phase === "permission" && camera.status !== "active") {
    const inUse = camera.error === "in-use";
    const altLabel = inUse ? (camera.mode === "desktop" ? copy.s3.chooseOtherCamera : copy.s3.tryOtherCamera) : null;
    screen = (
      <PermissionScreen
        onAllow={onAllowCamera}
        onGalleryFiles={(files) => { void startGallery(files); }}
        error={cameraErrorMsg(camera.error)}
        onRetry={onAllowCamera}
        hint={inAppHint}
        galleryError={galleryError}
        altActionLabel={altLabel}
        onAltAction={altLabel ? async () => {
          if (camera.mode === "desktop") {
            await camera.refreshDevices();
            session.startCapture();
          } else {
            await camera.switchFacing();
          }
        } : undefined}
      />
    );
  } else if (session.state.phase === "filling" && session.state.template) {
    screen = (
      <GalleryFillScreen
        template={session.state.template}
        photos={session.state.photos}
        busy={galleryBusy}
        error={galleryError}
        onAddFiles={(files) => { void addGalleryFiles(files); }}
        onUseCamera={() => { session.startCapture(); }}
        onCancel={() => { session.finish(); router.push("/"); }}
      />
    );
  } else if (session.state.phase === "capturing" && session.state.template) {
    screen = (
      <CaptureScreen
        template={session.state.template}
        photos={session.state.photos}
        activeSlot={session.state.activeSlot}
        camera={camera}
        onCapture={async (slot, mirror, flawless) => {
          const video = camera.videoRef.current
          if (!video) return;
          const slotDef = session.state.template!.slots[slot];
          const aspect = slotDef.w / slotDef.h;
          const bmp = await captureFrame(video, aspect, 1920, { mirror, flawless });
          session.capturePhoto(slot, bmp);
        }}
        onCaptureFile={async (slot, file, flawless) => {
          const slotDef = session.state.template!.slots[slot];
          const aspect = slotDef.w / slotDef.h;
          const bmp = await readImageFile(file, aspect, 1920, flawless);
          session.capturePhoto(slot, bmp);
        }}
        onComplete={() => session.captureComplete()}
        onCancel={() => { camera.stop(); session.finish(); router.push("/"); }}
      />
    );
  } else if (session.state.phase === "reviewing" && session.state.template) {
    screen = (
      <ReviewScreen
        template={session.state.template}
        photos={session.state.photos as ImageBitmap[]}
        sessionCode={sessionCode}
        onRetakeSlot={(slot) => session.retakeSlot(slot)}
        onRetakeAll={() => session.retakeAll()}
        onDone={() => { camera.stop(); session.finish(); }}
      />
    );
  } else {
    screen = <main className="min-h-[100dvh] bg-paper flex items-center justify-center"><p className="font-mono text-ink-2">{copy.common.loading}</p></main>;
  }

  return (
    <>
      {screen}
      <Dialog open={session.idleWarning} title={copy.idle.title} onClose={session.dismissIdleWarning}>
        <div className="flex flex-col gap-4">
          <p className="font-body text-sm text-ink-2">{copy.idle.body}</p>
          <Button onClick={session.dismissIdleWarning}>{copy.idle.continue}</Button>
        </div>
      </Dialog>
    </>
  );
}

function ChooseScreen({ loadState, templates, selectedId, onSelect, onNext, onRetry }: {
  loadState: LoadState; templates: ClientTemplate[]; selectedId: string | null;
  onSelect: (id: string) => void; onNext: () => void; onRetry: () => void;
}) {
  const slotOptions = useMemo(() => {
    const set = new Set(templates.map((t) => t.slots.length));
    return Array.from(set).sort((a, b) => a - b);
  }, [templates]);
  const [slotFilter, setSlotFilter] = useState<string>("all");
  const filtered = useMemo(() => {
    if (slotFilter === "all") return templates;
    const n = Number(slotFilter);
    return templates.filter((t) => t.slots.length === n);
  }, [templates, slotFilter]);

  return (
    <main className="min-h-[100dvh] bg-paper text-ink p-4 pb-28 flex justify-center relative overflow-hidden">
      <Sunburst className="opacity-70" />
      <SpotlightBeams />
      <GrainOverlay />
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 60% 35% at 50% 20%, rgba(212,175,55,0.10) 0%, transparent 70%)" }} />
      <SideDrape side="left" />
      <SideDrape side="right" />
      <div className="relative w-full max-w-[560px] z-10">
        <ScallopedValance className="mb-2" />
        <header className="relative mb-4 p-[1px] border border-brass/60 bg-paper-2/30">
          <FiligreeCorners size={28} inset="inset-1" />
          <div className="border border-brass/30 px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex flex-col gap-2">
              <RibbonBadge>Act I</RibbonBadge>
              <h1 className="font-display text-2xl font-semibold text-gold tracking-wide">{copy.s1.header}</h1>
            </div>
            <div className="hidden sm:flex flex-col items-end gap-2">
              <MarqueeStrip count={5} className="w-[90px]" />
              <span className="font-body text-[10px] uppercase tracking-[0.2em] text-ink-2">{copy.s1.gallery}</span>
            </div>
          </div>
        </header>
        <MarqueeStrip count={12} className="mb-2 px-1" />
        <TheatreDivider className="mb-4" />
        {loadState === "ready" && slotOptions.length > 1 && (
          <label className="mb-4 flex items-center gap-3 font-body text-xs uppercase tracking-[0.14em] text-ink-2">
            <span>{copy.s1.slotFilter}</span>
            <select
              value={slotFilter}
              onChange={(e) => setSlotFilter(e.target.value)}
              className="border border-brass/60 bg-paper-2 text-ink px-2 py-2 min-h-[40px]"
            >
              <option value="all">{copy.s1.allFrames}</option>
              {slotOptions.map((n) => (
                <option key={n} value={String(n)}>{copy.s1.photoCount(n)}</option>
              ))}
            </select>
          </label>
        )}
        {loadState === "loading" && (
          <div className="grid grid-cols-2 gap-3">
            {[0,1,2,3].map(i => <div key={i} className="aspect-[3/4] bg-paper-2 border border-brass/30 animate-pulse" />)}
          </div>
        )}
        {loadState === "empty" && <p className="font-body text-ink-2">{copy.s1.empty}</p>}
        {loadState === "error" && (
          <div className="flex flex-col gap-3">
            <p className="text-ink-2">{copy.s1.error}</p>
            <Button variant="secondary" onClick={onRetry}>{copy.s1.retry}</Button>
          </div>
        )}
            {loadState === "ready" && filtered.length === 0 && <p className="font-body text-ink-2">{copy.s1.noMatch}</p>}
        {loadState === "ready" && filtered.length > 0 && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {filtered.map(t => {
                const isSelected = t.id === selectedId;
                return (
                  <button key={t.id} onClick={() => onSelect(t.id)}
                    className={`relative text-left p-[1px] bg-paper-2 flex flex-col transition-colors ${isSelected ? "border border-gold" : "border border-brass/40 hover:border-brass/70"}`}>
                    <FiligreeCorners size={22} inset="inset-1" />
                    <div className={`relative flex flex-col gap-2 p-2 pb-7 border ${isSelected ? "border-gold/50" : "border-brass/20"}`}>
                      <div className="w-full bg-paper border border-brass/30 flex items-center justify-center overflow-hidden aspect-[3/4]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`/api/templates/${t.id}/overlay`} alt={`${t.name}, ${copy.s1.photoCount(t.slots.length)}`} className="w-full h-full object-contain" width={t.canvas?.w ?? 1200} height={t.canvas?.h ?? 3600} decoding="async" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-display text-sm text-ink truncate">{t.name}</p>
                        <p className="font-body text-[11px] uppercase tracking-[0.14em] text-ink-2">{copy.s1.photoCount(t.slots.length)}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <TheatreDivider className="mt-5 mb-2" />
            <MarqueeStrip count={10} className="px-2 opacity-80" />
          </>
        )}
      </div>
      <div className="fixed bottom-0 left-0 right-0 z-20 p-4 bg-paper border-t border-brass/40 flex justify-center" style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}>
        <div className="w-full max-w-[560px]"><Button className="w-full" disabled={!selectedId} onClick={onNext}>{copy.s1.next}</Button></div>
      </div>
    </main>
  );
}

type CameraApi = ReturnType<typeof useCamera>;

function CaptureScreen({ template, photos, activeSlot, camera, onCapture, onCaptureFile, onComplete, onCancel }: {
  template: ClientTemplate; photos: (ImageBitmap | null)[]; activeSlot: number;
  camera: CameraApi;
  onCapture: (slot: number, mirror: boolean, flawless?: boolean) => Promise<void>;
  onCaptureFile: (slot: number, file: File, flawless?: boolean) => Promise<void>;
  onComplete: () => void; onCancel: () => void;
}) {
  const [count, setCount] = useState<number | null>(null);
  const [auto, setAuto] = useState(true);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [lowLight, setLowLight] = useState(false);
  const [flawless, setFlawless] = useState(false);
  const audioRef = useRef<AudioContext | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const nextEmptySlot = photos.findIndex((p) => p === null);
  const viewSlot = template.slots[nextEmptySlot === -1 ? activeSlot : nextEmptySlot];
  const aspect = viewSlot ? viewSlot.w / viewSlot.h : 2 / 3;
  const ensureAudio = () => {
    if (muted) return null;
    if (typeof window === "undefined") return null;
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    if (!audioRef.current) audioRef.current = new Ctx();
    if (audioRef.current.state === "suspended") void audioRef.current.resume();
    return audioRef.current;
  };

  const beep = (freq: number, dur = 0.06, type: OscillatorType = "sine", gain = 0.04) => {
    const ctx = ensureAudio();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      g.gain.value = gain;
      osc.connect(g);
      g.connect(ctx.destination);
      const t = ctx.currentTime;
      osc.start(t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.stop(t + dur);
    } catch { /* ignore */ }
  };

  const playTick = () => beep(880, 0.05, "square", 0.03);
  const playShutter = () => { beep(220, 0.03, "triangle", 0.05); beep(140, 0.06, "sine", 0.04); };

  useEffect(() => {
    if (camera.status === "idle") {
      void camera.start(undefined, { lowLight, flawless });
    } else if (camera.status === "active") {
      // Restart stream when lowLight changes (torch requires new getUserMedia)
      void camera.start(undefined, { lowLight, flawless });
    }
  }, [camera.status, camera.start, lowLight, flawless]);

  useEffect(() => {
    if (camera.status !== "active") return;
    const video = camera.videoRef.current;
    if (video && video.paused) void video.play().catch(() => { /* autoplay may be blocked */ });
  }, [camera.status, camera.videoRef]);

  useEffect(() => {
    if (camera.notice) {
      const t = setTimeout(() => camera.clearNotice(), 3000);
      return () => clearTimeout(t);
    }
  }, [camera, camera.notice]);

  const take = async (idx: number) => {
    if (camera.status !== "active" || !camera.videoRef.current) return;
    const mirrorAtShot = camera.mirrored;
    setBusy(true);
    try {
      ensureAudio();
      setCount(3);
      playTick();
      for (let c = 3; c >= 1; c--) {
        setCount(c);
        playTick();
        await wait(1000);
      }
      setCount(null);
      setFlash(true);
      playShutter();
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try { navigator.vibrate(15); } catch { /* ignore */ }
      }
      try {
        await onCapture(idx, mirrorAtShot, flawless);
      } catch {
        // capture failed (e.g. video not ready); allow retry
      }
      await wait(120);
    } finally {
      setFlash(false);
      setCount(null);
      await wait(400);
      setBusy(false);
    }
  };

  const runAuto = async () => {
    if (busy || camera.status !== "active") return;
    let idx = photos.findIndex(p => p === null);
    if (idx === -1) idx = 0;
    for (let i = idx; i < template.slots.length; i++) {
      if (photos[i]) continue;
      await take(i);
    }
  };

  useEffect(() => {
    if (photos.length > 0 && photos.every(p => p !== null)) {
      onComplete();
    }
  }, [photos, onComplete]);

  const onShutter = async () => {
    if (busy) return;
    if (auto) await runAuto();
    else {
      const idx = photos.findIndex(p => p === null);
      if (idx === -1) { onComplete(); return; }
      await take(idx);
    }
  };

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const idx = photos.findIndex(p => p === null);
    if (idx === -1) return;
    setBusy(true);
    try { await onCaptureFile(idx, file, flawless); } finally { setBusy(false); }
  };

  const cameraStatus = camera.status;
  const cameraMode = camera.mode;
  const cameraFacing = camera.facing;
  const cameraDevices = camera.devices;
  const cameraActiveDeviceId = camera.activeDeviceId;
  const cameraPreviewMirrored = camera.previewMirrored;
  const cameraNotice = camera.notice;
  const cameraError = camera.error;
  const nextIdx = photos.findIndex(p => p === null);
  const canSwitch = !busy && cameraStatus === "active";
  const mirrored = camera.mirrored;
  const showFlip = cameraMode === "mobile" && cameraDevices.length > 1;
  const showPickerBtn = cameraMode === "desktop";

  const inUseAction = cameraError === "in-use" ? (cameraMode === "desktop" ? copy.s3.chooseOtherCamera : copy.s3.tryOtherCamera) : null;

  const isCounting = count !== null;

  return (
    <main className="min-h-[100dvh] bg-paper text-ink flex flex-col relative overflow-hidden">
      <Sunburst className="opacity-60" />
      <SpotlightBeams />
      <GrainOverlay />
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 55% 40% at 50% 38%, rgba(212,175,55,0.10) 0%, transparent 70%)" }} />
      <div className={`pointer-events-none absolute inset-y-0 left-0 w-[10%] max-w-[70px] bg-curtain transition-transform duration-[500ms] ease-[var(--ease-out)] motion-reduce:transition-none z-20 ${isCounting ? "-translate-x-full" : "translate-x-0"}`} style={{ boxShadow: "inset -12px 0 24px rgba(0,0,0,0.5)" }} />
      <div className={`pointer-events-none absolute inset-y-0 right-0 w-[10%] max-w-[70px] bg-curtain transition-transform duration-[500ms] ease-[var(--ease-out)] motion-reduce:transition-none z-20 ${isCounting ? "translate-x-full" : "translate-x-0"}`} style={{ boxShadow: "inset 12px 0 24px rgba(0,0,0,0.5)" }} />

      <div className="relative z-10 pt-3 px-[calc(10%+0.5rem)] sm:px-[88px]">
        <ScallopedValance />
      </div>
      <div className="relative z-10 py-2 flex items-center justify-between gap-2 border-b border-brass/30 px-[calc(10%+0.5rem)] sm:px-[88px]">
        <div className="flex gap-2 items-center flex-wrap">
          <RibbonBadge>Act II</RibbonBadge>
          <div className="flex gap-1 items-center ml-1" role="group" aria-label={copy.s3.progress(Math.min((photos.filter(Boolean).length) + 1, template.slots.length), template.slots.length)}>
            {template.slots.map((_, i) => {
              const filled = Boolean(photos[i]);
              const active = i === (nextIdx === -1 ? template.slots.length - 1 : nextIdx);
              return (
                <div key={i} aria-hidden="true" className={`relative w-5 h-7 border overflow-hidden ${active ? "border-gold bg-gold/10" : "border-brass/40"} ${filled ? "" : "bg-transparent"}`}>
                  {filled && <span className="anim-slot-fill absolute inset-0 bg-gold/50 border border-gold/40" />}
                </div>
              );
            })}
          </div>
        </div>
        <span className="border border-brass/60 bg-paper-2/60 px-2 py-1 font-mono text-xs text-gold tracking-widest" aria-label={copy.s3.progress(Math.min((photos.filter(Boolean).length) + 1, template.slots.length), template.slots.length)}>{String(Math.min((photos.filter(Boolean).length) + 1, template.slots.length)).padStart(2, "0")}/{String(template.slots.length).padStart(2, "0")}</span>
      </div>

      {cameraNotice && (
        <div className="relative z-10 mx-[calc(10%+0.5rem)] sm:mx-[88px] mt-2 border border-gold/60 bg-paper-2 text-ink px-3 py-2 font-mono text-xs">{cameraNotice}</div>
      )}

      {cameraError === "in-use" && (
        <div className="relative z-10 mx-[calc(10%+0.5rem)] sm:mx-[88px] mt-2 border border-brass bg-paper-2 p-3 flex flex-col gap-2">
          <p className="font-mono text-xs text-ink-2">{copy.s3.cameraInUse}</p>
          {inUseAction && (
            <button
              onClick={async () => {
                if (cameraMode === "desktop") { await camera.refreshDevices(); setPickerOpen(true); }
                else { await camera.switchFacing(); }
              }}
              className="self-start border border-brass px-3 py-2 font-body text-[11px] uppercase tracking-[0.14em] min-h-[48px] text-ink"
            >{inUseAction}</button>
          )}
        </div>
      )}

      <div className="relative z-10 flex-1 flex items-center justify-center py-4 px-[calc(10%+0.75rem)] sm:px-[96px]">
        <div className="relative w-full max-w-[440px]">
          <SideDrape side="left" />
          <SideDrape side="right" />
          <div className="mx-0 sm:mx-10">
            <MarqueeStrip count={10} className="mb-2 px-2" />
            <div className="relative mx-auto border border-gold/70 bg-paper-2/20 p-[2px]" style={{ width: `min(100%, calc(${VIEWFINDER_MAX_HEIGHT_VH}vh * ${aspect}))` }}>
              <FiligreeCorners size={30} inset="inset-1" />
              <div className="relative bg-black overflow-hidden" style={{ aspectRatio: `${aspect}` }}>
                <video ref={camera.setVideoElement} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" style={{ transform: mirrored ? "scaleX(-1)" : "none" }} />
                {cameraStatus === "starting" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-paper/80">
                    <span className="font-body text-xs uppercase tracking-[0.2em] text-ink-2">{copy.s3.switching}</span>
                  </div>
                )}
                <div className="absolute inset-0 pointer-events-none">
                  <Corner pos="tl" /><Corner pos="tr" /><Corner pos="bl" /><Corner pos="br" />
                </div>
                {count !== null && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-live="assertive">
                    <span key={count} className="anim-count font-display font-semibold text-gold leading-none tabular-nums" style={{ fontSize: "clamp(4rem,22vmin,8rem)", textShadow: "0 0 24px rgba(18,13,16,0.8)" }}>{count}</span>
                  </div>
                )}
                {flash && <div className="absolute inset-0 bg-flash/90" />}
              </div>
            </div>
            <MarqueeStrip count={10} className="mt-2 px-2" />
          </div>
        </div>
      </div>

      <div className="relative z-10 py-4 flex flex-col items-center gap-3 border-t border-brass/20 px-[calc(10%+0.5rem)] sm:px-[88px]" style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}>
        <div className="flex gap-2 flex-wrap justify-center">
          <button onClick={() => setAuto(true)} className={`px-3 py-2 border font-body text-[11px] uppercase tracking-[0.14em] min-h-[40px] ${auto ? "bg-booth-red text-ink border-gold" : "border-brass/50 text-ink-2"}`}>{copy.s3.auto}</button>
          <button onClick={() => setAuto(false)} className={`px-3 py-2 border font-body text-[11px] uppercase tracking-[0.14em] min-h-[40px] ${!auto ? "bg-booth-red text-ink border-gold" : "border-brass/50 text-ink-2"}`}>{copy.s3.manual}</button>
          <button onClick={() => setLowLight(l => !l)} aria-pressed={lowLight} aria-label={copy.s3.lowLight} className={`px-3 py-2 border font-body text-[11px] uppercase tracking-[0.14em] min-h-[40px] flex items-center gap-1 ${lowLight ? "bg-booth-red text-ink border-gold" : "border-brass/50 text-ink-2"}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v6M12 16v6M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M2 12h6M16 12h6M4.93 19.07l4.24-4.24M14.83 9.17l4.24-4.24"/></svg>
            {copy.s3.lowLight}
          </button>
          <button onClick={() => setFlawless(f => !f)} aria-pressed={flawless} aria-label={copy.s3.flawless} className={`px-3 py-2 border font-body text-[11px] uppercase tracking-[0.14em] min-h-[40px] flex items-center gap-1 ${flawless ? "bg-booth-red text-ink border-gold" : "border-brass/50 text-ink-2"}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
            {copy.s3.flawless}
          </button>
          <button onClick={() => { setMuted(m => !m); if (!muted) { try { audioRef.current?.suspend(); } catch { /* ignore */ } } else { ensureAudio(); } }} aria-pressed={muted} aria-label={muted ? copy.s3.soundOff : copy.s3.soundOn} className={`px-3 py-2 border font-body text-[11px] uppercase tracking-[0.14em] min-h-[40px] ${muted ? "border-brass/50 text-ink-2" : "border-gold/60 text-gold"}`}>{muted ? copy.s3.soundOff : copy.s3.soundOn}</button>
          {showPickerBtn && (
            <button onClick={async () => { await camera.refreshDevices(); setPickerOpen(true); }} disabled={!canSwitch} className="px-3 py-2 border border-brass/50 text-ink-2 font-body text-[11px] uppercase tracking-[0.14em] min-h-[48px] disabled:opacity-40">{copy.s3.chooseCamera}</button>
          )}
        </div>
        <div className="flex items-center gap-5">
          {showFlip && (
            <button onClick={() => void camera.switchFacing()} disabled={!canSwitch} aria-label={copy.s3.flipCamera}
              className="w-12 h-12 border border-brass bg-paper-2 flex items-center justify-center text-gold disabled:opacity-40">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square"><path d="M7 7h10v4"/><path d="M17 17H7v-4"/><path d="M17 7l3 3-3 3"/><path d="M7 17l-3-3 3-3"/></svg>
            </button>
          )}
          <button onClick={onShutter} disabled={busy || cameraStatus !== "active"} aria-label={copy.s3.shutter}
            className="w-20 h-20 rounded-full border border-gold bg-paper-2 flex items-center justify-center disabled:opacity-50 p-1">
            <span className="w-full h-full rounded-full bg-booth-red border border-brass block" />
          </button>
          {showFlip && <div className="w-12 h-12" aria-hidden />}
        </div>
        <p className="font-body text-[10px] uppercase tracking-[0.2em] text-ink-2">{cameraMode === "mobile" ? (cameraFacing === "user" ? copy.s3.frontCamera : copy.s3.backCamera) : copy.s3.ready}</p>
        <div className="flex gap-5 items-center">
          <button onClick={() => fileRef.current?.click()} disabled={busy} className="font-body text-[11px] uppercase tracking-[0.14em] underline underline-offset-4 text-ink-2 disabled:opacity-50 min-h-[44px]">{copy.s3.gallery}</button>
          <button onClick={onCancel} className="font-body text-[11px] uppercase tracking-[0.14em] underline underline-offset-4 text-ink-2 min-h-[44px]">{copy.s3.cancel}</button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />
      </div>

      <Dialog open={pickerOpen} title={copy.s3.chooseCamera} onClose={() => setPickerOpen(false)}>
        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-2 font-body text-xs text-ink-2">
            <input type="checkbox" checked={cameraPreviewMirrored} onChange={(e) => camera.setPreviewMirrored(e.target.checked)} />
            {copy.s3.mirrorPreview}
          </label>
          <div className="flex flex-col gap-2 max-h-[50vh] overflow-auto">
            {/* eslint-disable-next-line react-hooks/refs */}
            {cameraDevices.length === 0 && <p className="font-mono text-xs text-ink-2">{copy.s3.noCamera}</p>}
            {/* eslint-disable-next-line react-hooks/refs */}
            {cameraDevices.map((d, i) => {
              const active = d.deviceId === cameraActiveDeviceId;
              return (
                <button key={d.deviceId || i} onClick={async () => { await camera.selectDevice(d.deviceId); setPickerOpen(false); }}
                  className={`text-left border px-3 py-3 font-body text-xs min-h-[48px] ${active ? "border-gold bg-paper text-ink" : "border-brass/40 bg-paper-2 text-ink-2"}`}>
                  {deviceLabel(d, i)}{active ? " (active)" : ""}
                </button>
              );
            })}
          </div>
        </div>
      </Dialog>
    </main>
  );
}

function Corner({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  const base = "absolute w-5 h-5 border-gold/80";
  const cls = pos === "tl" ? "top-2 left-2 border-t border-l"
    : pos === "tr" ? "top-2 right-2 border-t border-r"
    : pos === "bl" ? "bottom-2 left-2 border-b border-l"
    : "bottom-2 right-2 border-b border-r";
  return <span className={`${base} ${cls}`} />;
}

function StripPreview({ template, photos, onCanvas }: {
  template: ClientTemplate; photos: (ImageBitmap | null)[]; onCanvas?: (canvas: HTMLCanvasElement | null) => void;
}) {
  const [overlay, setOverlay] = useState<ImageBitmap | null>(null);
  const [baseLayer, setBaseLayer] = useState<ImageBitmap | null>(null);
  const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let alive = true;
    loadOverlay(`/api/templates/${template.id}/overlay`).then(o => { if (alive) setOverlay(o); }).catch(() => {});
    if (template.baseLayerKey) {
      loadOverlay(`/api/templates/${template.id}/overlay?layer=base`).then(o => { if (alive) setBaseLayer(o); }).catch(() => {});
    }
    return () => {
      alive = false;
      setOverlay((prev) => { if (prev) { try { prev.close(); } catch { /* ignore */ } } return null; });
      setBaseLayer((prev) => { if (prev) { try { prev.close(); } catch { /* ignore */ } } return null; });
    };
  }, [template.id, template.baseLayerKey]);

  useEffect(() => {
    if (!overlay) return;
    if (template.baseLayerKey && !baseLayer) return;
    const c = renderStrip(template, photos, overlay, { scale: 1, baseLayer });
    const frame = requestAnimationFrame(() => {
      setCanvasEl(c);
      onCanvas?.(c);
    });
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlay, baseLayer, template, photos]);

  if (!canvasEl || !overlay) {
    return <div className="bg-paper animate-pulse border border-brass/20" style={{ aspectRatio: `${template.canvas.w} / ${template.canvas.h}` }} />;
  }
  return <Preview canvas={canvasEl} />;
}

function GalleryFillScreen({ template, photos, busy, error, onAddFiles, onUseCamera, onCancel }: {
  template: ClientTemplate; photos: (ImageBitmap | null)[]; busy: boolean; error: string | null;
  onAddFiles: (files: File[]) => void; onUseCamera: () => void; onCancel: () => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const filled = photos.filter((p) => p !== null).length;
  const total = template.slots.length;

  return (
    <main className="min-h-[100dvh] bg-paper text-ink p-4 flex justify-center relative overflow-hidden">
      <Sunburst className="opacity-60" />
      <SpotlightBeams />
      <GrainOverlay />
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 50% 40% at 50% 30%, rgba(212,175,55,0.09) 0%, transparent 70%)" }} />
      <div className="relative w-full max-w-[560px] flex flex-col gap-4">
        <header className="text-center mb-1 flex flex-col items-center gap-2">
          <RibbonBadge>Act II</RibbonBadge>
          <h1 className="font-display text-xl text-gold tracking-wide">{copy.s3g.title}</h1>
          <TheatreDivider className="max-w-[260px]" />
          <p className="font-body text-xs text-ink-2">{copy.s3g.subtitle}</p>
        </header>
        <div className="relative border border-brass p-[2px] bg-paper-2/50">
          <FiligreeCorners size={30} inset="inset-1" />
          <div className="border border-brass/40 p-3 relative">
            <StripPreview template={template} photos={photos} />
            <div className="border-t border-dashed border-brass/50 mt-3 pt-2 flex justify-between font-body text-[10px] uppercase tracking-[0.18em] text-ink-2">
              <span>{copy.brand}</span>
              <span>{copy.s3g.progress(filled, total)}</span>
            </div>
          </div>
        </div>
        {busy && <p className="font-mono text-xs text-ink-2 text-center">{copy.s3g.reading}</p>}
        {error && <p className="font-mono text-xs text-gold text-center">{error}</p>}
        <Button onClick={() => fileRef.current?.click()} disabled={busy || filled >= total} className="w-full">{copy.s3g.add}</Button>
        <Button variant="secondary" onClick={onUseCamera} disabled={busy} className="w-full">{copy.s3g.useCamera}</Button>
        <button onClick={onCancel} disabled={busy} className="font-body text-xs uppercase tracking-[0.16em] underline underline-offset-4 py-2 text-ink-2 hover:text-ink disabled:opacity-50">{copy.s3g.cancel}</button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          aria-label={copy.s3g.add}
          onChange={(e) => {
            const files = e.target.files ? Array.from(e.target.files) : [];
            e.target.value = "";
            if (files.length) onAddFiles(files);
          }}
        />
      </div>
    </main>
  );
}

function ReviewScreen({ template, photos, sessionCode, onRetakeSlot, onRetakeAll, onDone }: {
  template: ClientTemplate; photos: ImageBitmap[]; sessionCode: string; onRetakeSlot: (s: number) => void; onRetakeAll: () => void; onDone: () => void;
}) {
  const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null);
  const setPreviewCanvas = useCallback((c: HTMLCanvasElement | null) => setCanvasEl(c), []);
  const [serial] = useState(() => String(Math.floor(Math.random() * 9000) + 1000));
  const [dateLabel] = useState(() => {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  });
  const [qrOpen, setQrOpen] = useState(false);
  const [qrBusy, setQrBusy] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrExpiresAt, setQrExpiresAt] = useState<string | null>(null);
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const trackDownloadEvent = (exportMethod: "png" | "jpg" | "share" | "qr") => {
    trackEvent({
      event_type: "photo_downloaded",
      template_id: template.id,
      export_method: exportMethod,
      session_code: sessionCode,
    });
  };

  const doDownload = async (fmt: "png" | "jpeg") => {
    if (!canvasEl) return;
    trackDownloadEvent(fmt === "jpeg" ? "jpg" : "png");
    const blob = await exportBlob(canvasEl, fmt, 0.92);
    downloadBlob(blob, `photobooth-${template.id}.${fmt === "jpeg" ? "jpg" : "png"}`);
  };
  const doShare = async () => {
    if (!canvasEl) return;
    trackDownloadEvent("share");
    const blob = await exportBlob(canvasEl, "png");
    await shareFile(blob, `photobooth-${template.id}.png`);
  };
  const doQrShare = async () => {
    if (!canvasEl) return;
    setQrOpen(true);
    setQrBusy(true);
    setQrError(null);
    try {
      trackDownloadEvent("qr");
      const blob = await exportBlob(canvasEl, "png");
      const form = new FormData();
      form.append("file", blob, `photobooth-${template.id}.png`);
      const res = await fetch("/api/share", { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as { url?: string; expiresAt?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error || copy.s4.qrError);
      // Pustaka QR dimuat saat tombol ditekan, bukan di bundel awal halaman.
      const { default: QRCode } = await import("qrcode");
      const qr = await QRCode.toDataURL(data.url, { width: 320, margin: 1, errorCorrectionLevel: "M" });
      setQrUrl(data.url);
      setQrDataUrl(qr);
      setQrExpiresAt(typeof data.expiresAt === "string" ? data.expiresAt : null);
    } catch (e) {
      setQrUrl(null);
      setQrDataUrl(null);
      setQrExpiresAt(null);
      setQrError(e instanceof Error && e.message ? e.message : copy.s4.qrError);
    } finally {
      setQrBusy(false);
    }
  };

  return (
    <main className="min-h-[100dvh] bg-paper text-ink p-4 flex justify-center relative overflow-hidden">
      <Sunburst className="opacity-60" />
      <SpotlightBeams />
      <GrainOverlay />
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 50% 40% at 50% 30%, rgba(212,175,55,0.09) 0%, transparent 70%)" }} />
      <div className="relative w-full max-w-[560px] flex flex-col gap-4">
        <header className="text-center mb-1 flex flex-col items-center gap-2">
          <RibbonBadge>Act III</RibbonBadge>
          <h1 className="font-display text-xl text-gold tracking-wide">{copy.s4.keepsake}</h1>
          <TheatreDivider className="max-w-[260px]" />
        </header>
        <div className="relative border border-brass p-[2px] bg-paper-2/50">
          <FiligreeCorners size={30} inset="inset-1" />
          <div className="border border-brass/40 p-3 relative">
            <div className="flex gap-3">
              <div className="hidden sm:flex items-center justify-center border-r border-dashed border-brass/40 pr-3">
                <span className="font-body text-[10px] uppercase tracking-[0.3em] text-gold/80" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>ADMIT ONE ★ ADMIT ONE</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="border-b border-dashed border-brass/50 pb-2 mb-3 flex justify-between font-mono text-[11px] text-ink-2">
                  <span>ADMIT ONE · No. {serial}</span>
                  <span>{dateLabel}</span>
                </div>
                <MarqueeStrip count={8} className="mb-2 px-1" />
                <StripPreview template={template} photos={photos} onCanvas={setPreviewCanvas} />
                <div className="border-t border-dashed border-brass/50 mt-3 pt-2 flex justify-between font-body text-[10px] uppercase tracking-[0.18em] text-ink-2">
                  <span>{copy.brand}</span>
                  <span>{copy.s4.slots(template.slots.length)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {photos.map((_, i) => (
            <button key={i} onClick={() => onRetakeSlot(i)} className="border border-brass/50 bg-paper-2 py-2 font-body text-[11px] uppercase tracking-[0.12em] text-ink-2 hover:text-ink hover:border-brass">{copy.s4.retakeOne} {i + 1}</button>
          ))}
        </div>
        <Button onClick={() => doDownload("png")} className="w-full">{copy.s4.download}</Button>
        <div className="flex gap-4 justify-center flex-wrap font-body text-xs uppercase tracking-[0.14em] text-ink-2">
          <button onClick={() => doDownload("jpeg")} className="underline underline-offset-4 hover:text-ink">{copy.s4.jpg}</button>
          {canShare && <button onClick={doShare} className="underline underline-offset-4 hover:text-ink">{copy.s4.share}</button>}
          <button onClick={doQrShare} disabled={qrBusy || !canvasEl} className="underline underline-offset-4 hover:text-ink disabled:opacity-50">{copy.s4.qrShare}</button>
        </div>
        <Button variant="secondary" onClick={onRetakeAll} className="w-full">{copy.s4.retakeAll}</Button>
        <button onClick={onDone} className="font-body text-xs uppercase tracking-[0.16em] underline underline-offset-4 py-2 text-ink-2 hover:text-ink">{copy.s4.done}</button>
      </div>
      <Dialog open={qrOpen} title={copy.s4.qrTitle} onClose={() => setQrOpen(false)}>
        <div className="flex flex-col gap-3 items-center text-center">
          {qrBusy && <p className="font-body text-sm text-ink-2">{copy.s4.qrCreating}</p>}
          {!qrBusy && qrError && <p className="font-body text-sm text-gold">{qrError}</p>}
          {!qrBusy && !qrError && qrDataUrl && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt={copy.s4.qrTitle} className="w-[220px] h-[220px] border border-brass/40 bg-paper" width={220} height={220} decoding="async" />
              <p className="font-body text-xs text-ink-2">{copy.s4.qrNote}</p>
              {qrExpiresAt && <p className="font-mono text-[11px] text-ink-2">Expires {new Date(qrExpiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>}
              {qrUrl && <a href={qrUrl} target="_blank" rel="noreferrer" className="font-body text-xs uppercase tracking-[0.14em] underline underline-offset-4 text-gold hover:text-ink">{copy.s4.qrOpenLink}</a>}
            </>
          )}
        </div>
      </Dialog>
    </main>
  );
}

function Preview({ canvas }: { canvas: HTMLCanvasElement }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = "";
    canvas.setAttribute("style", "max-width:100%;height:auto;display:block;");
    el.appendChild(canvas);
  }, [canvas]);
  return <div ref={ref} className="anim-strip-print overflow-hidden" />;
}

function DoneScreen({ onAgain }: { onAgain: () => void }) {
  return (
    <main className="min-h-[100dvh] bg-paper text-ink flex items-center justify-center p-6 relative overflow-hidden">
      <Sunburst className="opacity-50" />
      <GrainOverlay />
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 50% 35% at 50% 50%, rgba(212,175,55,0.07) 0%, transparent 70%)" }} />
      <div className="relative text-center flex flex-col items-center gap-4 max-w-[420px] border border-brass/50 p-[2px] bg-paper-2/30">
        <FiligreeCorners size={30} inset="inset-1" />
        <div className="border border-brass/30 px-8 py-10 flex flex-col items-center gap-4 bg-paper-2/50 relative">
          <MarqueeStrip count={8} className="w-full" />
          <h1 className="font-display text-3xl font-semibold text-gold">{copy.s5.title}</h1>
          <TheatreDivider className="w-full max-w-[220px]" />
          <p className="font-body text-sm text-ink-2">{copy.s5.note}</p>
          <Button onClick={onAgain} className="mt-2">{copy.s5.again}</Button>
        </div>
      </div>
    </main>
  );
}

function wait(ms: number) { return new Promise(r => setTimeout(r, ms)); }
