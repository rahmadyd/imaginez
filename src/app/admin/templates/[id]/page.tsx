"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/Button";
import type { Slot, AdminTemplate } from "@/features/templates/schema";
import { detectSlotsFromImage } from "@/features/admin/auto-detect";

type DragMode = null | { kind: "move"; idx: number; ox: number; oy: number; start: Slot }
  | { kind: "resize"; idx: number; handle: string; start: Slot; sx: number; sy: number }
  | { kind: "pan"; sx: number; sy: number; ox: number; oy: number };

function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }
function snap(v: number, g = 8) { return Math.round(v / g) * g; }

export default function TemplateEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [tpl, setTpl] = useState<AdminTemplate | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [name, setName] = useState("");
  const [background, setBackground] = useState("#ffffff");
  const [published, setPublished] = useState(false);
  const [bleed, setBleedState] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [selected, setSelected] = useState<number | null>(0);
  const [previewDummy, setPreviewDummy] = useState(false);
  const [showWithoutPhotos, setShowWithoutPhotos] = useState(false);
  const [zoom, setZoom] = useState(0.3);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState<DragMode>(null);
  const [overlayImg, setOverlayImg] = useState<HTMLImageElement | null>(null);
  const [overlayUrl, setOverlayUrl] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/admin/templates/${id}`, { cache: "no-store" });
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!alive) return;
        const t = data.template as AdminTemplate;
        setTpl(t); setSlots(t.slots); setName(t.name); setBackground(t.background); setPublished(t.published); setBleedState(t.bleed ?? 0);
      } catch { if (alive) setError("Gagal memuat template."); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [id]);

  useEffect(() => {
    const url = `/api/templates/${id}/overlay?t=${Date.now()}`;
    const img = new Image();
    img.onload = () => { setOverlayImg(img); setOverlayUrl(url); };
    img.onerror = () => setOverlayImg(null);
    img.src = url;
  }, [id]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const markDirty = () => setDirty(true);

  const updateSlot = (idx: number, patch: Partial<Slot>) => {
    if (!tpl) return;
    setSlots(prev => prev.map((s, i) => {
      if (i !== idx) return s;
      const n = { ...s, ...patch };
      n.w = Math.max(1, Math.min(n.w, tpl.canvas.w - n.x));
      n.h = Math.max(1, Math.min(n.h, tpl.canvas.h - n.y));
      n.x = clamp(n.x, 0, tpl.canvas.w - n.w);
      n.y = clamp(n.y, 0, tpl.canvas.h - n.h);
      return n;
    }));
    markDirty();
  };

  const addSlot = () => {
    if (!tpl) return;
    setSlots(prev => [...prev, { x: 40, y: 40, w: Math.min(400, tpl.canvas.w-80), h: Math.min(300, tpl.canvas.h-80), rotate: 0, radius: 0 }]);
    setSelected(slots.length);
    markDirty();
  };
  const deleteSlot = (idx: number) => {
    if (slots.length <= 1) return;
    setSlots(prev => prev.filter((_, i) => i !== idx));
    setSelected(Math.max(0, idx - 1));
    markDirty();
  };
  const duplicateSlot = (idx: number) => {
    const s = slots[idx]; if (!s) return;
    setSlots(prev => { const n=[...prev]; n.splice(idx+1,0,{...s,x:s.x+20,y:s.y+20}); return n; });
    setSelected(idx+1); markDirty();
  };
  const moveSlotOrder = (idx: number, dir: -1|1) => {
    const ni = idx + dir; if (ni < 0 || ni >= slots.length) return;
    setSlots(prev => { const n=[...prev]; const [it]=n.splice(idx,1); n.splice(ni,0,it); return n; });
    setSelected(ni); markDirty();
  };

  const autoDetect = async () => {
    if (!overlayImg) { alert("Overlay belum dimuat."); return; }
    try {
      const detected = await detectSlotsFromImage(overlayImg);
      if (detected.length === 0) { alert("Tidak ada slot terdeteksi."); return; }
      setSlots(detected.map(d => ({ x: d.x, y: d.y, w: d.w, h: d.h, rotate: d.rotate, radius: 0 })));
      setSelected(0); markDirty();
      const warned = detected.filter(d=>d.warning);
      if (warned.length) alert(`${warned.length} slot perlu diperiksa manual.`);
    } catch { alert("Gagal deteksi otomatis."); }
  };

  const save = async () => {
    if (!tpl) return;
    if (!name.trim()) { alert("Nama tidak boleh kosong."); return; }
    if (slots.length < 1) { alert("Minimal 1 slot."); return; }
    for (const s of slots) { if (s.x+s.w>tpl.canvas.w || s.y+s.h>tpl.canvas.h) { alert("Slot di luar canvas."); return; } }
    if (bleed < 0) { alert("Bleed tidak boleh negatif."); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/templates/${tpl.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, background, published, slots, canvas: tpl.canvas, bleed }),
      });
      if (!res.ok) { const d = await res.json().catch(()=>({})); alert(d.error || "Gagal simpan"); return; }
      setDirty(false);
      router.refresh();
    } finally { setSaving(false); }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (selected == null) return;
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      const step = e.shiftKey ? 10 : 1;
      if (e.key === "Delete") { e.preventDefault(); deleteSlot(selected); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") { e.preventDefault(); duplicateSlot(selected); }
      if (e.key === "ArrowLeft") { e.preventDefault(); updateSlot(selected, { x: (slots[selected]?.x ?? 0) - step }); }
      if (e.key === "ArrowRight") { e.preventDefault(); updateSlot(selected, { x: (slots[selected]?.x ?? 0) + step }); }
      if (e.key === "ArrowUp") { e.preventDefault(); updateSlot(selected, { y: (slots[selected]?.y ?? 0) - step }); }
      if (e.key === "ArrowDown") { e.preventDefault(); updateSlot(selected, { y: (slots[selected]?.y ?? 0) + step }); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, slots, tpl]);

  const getCanvasPoint = (clientX: number, clientY: number, rect: DOMRect) => {
    return { x: (clientX - rect.left - pan.x) / zoom, y: (clientY - rect.top - pan.y) / zoom };
  };

  const getCanvasRect = (target: EventTarget | null): DOMRect | null => {
    const el = target as HTMLElement | null;
    const canvas = el?.closest("[data-tpl-canvas]") as HTMLElement | null;
    return canvas ? canvas.getBoundingClientRect() : null;
  };

  const handleSlotPointerDown = (e: React.PointerEvent, kind: "move"|"resize", idx: number, handle?: string) => {
    e.stopPropagation(); e.preventDefault();
    setSelected(idx);
    const rect = getCanvasRect(e.currentTarget);
    if (!rect) return;
    const p = getCanvasPoint(e.clientX, e.clientY, rect);
    const s = { ...slots[idx] };
    if (kind === "move") setDrag({ kind: "move", idx, ox: p.x - s.x, oy: p.y - s.y, start: s });
    else setDrag({ kind: "resize", idx, handle: handle || "se", start: s, sx: p.x, sy: p.y });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onBgPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    setDrag({ kind: "pan", sx: e.clientX, sy: e.clientY, ox: pan.x, oy: pan.y });
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag || !tpl) return;
    if (drag.kind === "pan") { setPan({ x: drag.ox + (e.clientX - drag.sx), y: drag.oy + (e.clientY - drag.sy) }); return; }
    const rect = getCanvasRect(e.target);
    if (!rect) return;
    const p = getCanvasPoint(e.clientX, e.clientY, rect);
    if (drag.kind === "move") {
      updateSlot(drag.idx, { x: snap(p.x - drag.ox), y: snap(p.y - drag.oy) });
    } else {
      const dx = snap(p.x - drag.sx); const dy = snap(p.y - drag.sy);
      const s = drag.start; let nx=s.x, ny=s.y, nw=s.w, nh=s.h;
      if (drag.handle.includes("e")) nw = Math.max(8, s.w + dx);
      if (drag.handle.includes("s")) nh = Math.max(8, s.h + dy);
      if (drag.handle.includes("w")) { nw = Math.max(8, s.w - dx); nx = s.x + dx; }
      if (drag.handle.includes("n")) { nh = Math.max(8, s.h - dy); ny = s.y + dy; }
      updateSlot(drag.idx, { x: nx, y: ny, w: nw, h: nh });
    }
  };
  const onPointerUp = () => setDrag(null);

  if (loading) return <main className="min-h-[100dvh] bg-paper text-ink p-6 font-mono">Memuat...</main>;
  if (error || !tpl) return <main className="min-h-[100dvh] bg-paper text-ink p-6"><p className="text-gold">{error || "Tidak ditemukan"}</p><Link href="/admin" className="underline text-ink-2 hover:text-ink">Kembali</Link></main>;

  return (
    <main className="min-h-[100dvh] bg-paper text-ink flex flex-col">
      <header className="border-b border-brass/50 p-3 flex items-center justify-between gap-2 flex-wrap bg-paper-2/40">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="font-body text-xs uppercase tracking-[0.14em] text-ink-2 underline underline-offset-4 hover:text-ink">Daftar</Link>
          <h1 className="font-display text-xl font-semibold text-gold">Editor</h1>
          {dirty && <span className="font-mono text-xs text-gold">Belum disimpan</span>}
        </div>
        <div className="flex gap-2 items-center">
          <label className="font-body text-xs uppercase tracking-[0.12em] text-ink-2 flex items-center gap-2"><input type="checkbox" checked={published} onChange={e=>{setPublished(e.target.checked);markDirty();}} className="accent-[#D4AF37]"/> Publish</label>
          <Button onClick={save} disabled={saving}>{saving?"Menyimpan...":"Simpan"}</Button>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        {/* left: slot list */}
        <aside className="md:w-56 border-b md:border-b-0 md:border-r border-brass/40 p-2 flex flex-col gap-2 overflow-auto bg-paper-2/20">
          <div className="flex justify-between items-center"><span className="font-body text-xs uppercase tracking-[0.12em] text-ink-2">Slot (urutan)</span><button onClick={addSlot} className="border border-brass px-2 text-sm text-gold hover:bg-paper-2">+</button></div>
          {slots.map((s,i)=> (
            <div key={i} className={`border p-1 text-xs font-mono flex flex-col gap-1 cursor-pointer ${i===selected?"border-gold bg-paper-2":"border-brass/40 bg-paper text-ink-2 hover:border-brass"}`} onClick={()=>setSelected(i)}>
              <div className="flex justify-between text-ink"><span>#{i+1}</span><span>{s.w}x{s.h}</span></div>
              <div className="flex gap-1 flex-wrap text-ink-2">
                <button onClick={(e)=>{e.stopPropagation();moveSlotOrder(i,-1);}} className="underline hover:text-ink">Naik</button>
                <button onClick={(e)=>{e.stopPropagation();moveSlotOrder(i,1);}} className="underline hover:text-ink">Turun</button>
                <button onClick={(e)=>{e.stopPropagation();duplicateSlot(i);}} className="underline hover:text-ink">Ganda</button>
                <button onClick={(e)=>{e.stopPropagation();deleteSlot(i);}} className="underline hover:text-gold">Hapus</button>
              </div>
            </div>
          ))}
        </aside>

        {/* center: canvas */}
        <section className="flex-1 bg-[#0F0F12] relative overflow-hidden min-h-[320px]" onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}>
          <div className="absolute top-2 left-2 z-10 flex gap-2 font-mono text-xs">
            <button className="border border-brass bg-paper-2 text-ink px-2" onClick={()=>setZoom(z=>Math.min(2,z+0.1))}>+</button>
            <button className="border border-brass bg-paper-2 text-ink px-2" onClick={()=>setZoom(z=>Math.max(0.1,z-0.1))}>-</button>
            <span className="bg-paper-2 text-ink px-2 border border-brass">{Math.round(zoom*100)}%</span>
          </div>
          <div className="w-full h-full overflow-auto" onPointerDown={onBgPointerDown}>
            <div data-tpl-canvas className="relative origin-top-left" style={{
              width: tpl.canvas.w, height: tpl.canvas.h, transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`, transformOrigin: "0 0",
              background: showWithoutPhotos ? undefined : background,
              backgroundImage: showWithoutPhotos ? "linear-gradient(45deg,#666 25%,transparent 25%),linear-gradient(-45deg,#666 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#666 75%),linear-gradient(-45deg,transparent 75%,#666 75%)" : undefined,
              backgroundSize: showWithoutPhotos ? "32px 32px" : undefined,
              backgroundPosition: showWithoutPhotos ? "0 0,0 16px,16px -16px,-16px 0" : undefined,
            }}>
              {previewDummy && !showWithoutPhotos && slots.map((s,i)=> (
                <div key={`p${i}`} className="absolute" style={{ left:s.x, top:s.y, width:s.w, height:s.h, transform:`rotate(${s.rotate}deg)`, background: i%2===0?"#bbb":"#999" }} />
              ))}
              {(overlayImg || overlayUrl) && (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={overlayUrl ?? `/api/templates/${id}/overlay`} alt="overlay" className="absolute inset-0 w-full h-full pointer-events-none" />
                </>
              )}
              {slots.map((s,i)=> {
                const active = i === selected;
                return (
                <div key={i}
                  onPointerDown={(e)=>handleSlotPointerDown(e,"move",i)}
                  className="absolute"
                  style={{
                    left: s.x, top: s.y, width: s.w, height: s.h, transform: `rotate(${s.rotate}deg)`,
                    boxSizing: "border-box",
                    border: active ? "3px solid #D4AF37" : "3px dashed #00E5FF",
                    boxShadow: active
                      ? "0 0 0 2px rgba(0,0,0,0.9), 0 0 0 5px rgba(212,175,55,0.9), 0 0 14px rgba(212,175,55,0.45)"
                      : "0 0 0 2px rgba(0,0,0,0.95), 0 0 0 5px rgba(255,255,255,0.9)",
                    background: active ? "rgba(212,175,55,0.08)" : "rgba(0,229,255,0.06)",
                  }}>
                  <span
                    className="absolute -top-6 -left-1 font-mono text-[11px] font-semibold px-1.5 py-0.5"
                    style={{
                      color: active ? "#111" : "#fff",
                      background: active ? "#D4AF37" : "#00838F",
                      border: "1px solid rgba(0,0,0,0.7)",
                      boxShadow: "0 0 0 1px rgba(255,255,255,0.5)",
                    }}
                  >#{i+1}</span>
                  {active && ["nw","ne","sw","se"].map(h => (
                    <span key={h} onPointerDown={(e)=>handleSlotPointerDown(e,"resize",i,h)}
                      className="absolute"
                      style={{
                        width: 14, height: 14, background: "#D4AF37",
                        border: "2px solid #111", boxShadow: "0 0 0 1px #fff",
                        cursor: `${h}-resize`,
                        ...(h.includes("n") ? { top: -8 } : { bottom: -8 }),
                        ...(h.includes("w") ? { left: -8 } : { right: -8 }),
                      }} />
                  ))}
                </div>
              );})}
            </div>
          </div>
        </section>

        {/* right: props */}
        <aside className="md:w-64 border-t md:border-t-0 md:border-l border-brass/40 p-3 flex flex-col gap-3 overflow-auto bg-paper-2/20">
          <label className="flex flex-col gap-1 font-body text-xs uppercase tracking-[0.12em] text-ink-2">Nama<input value={name} onChange={e=>{setName(e.target.value);markDirty();}} className="border border-brass bg-paper px-2 py-1 font-body text-sm text-ink"/></label>
          <label className="flex flex-col gap-1 font-body text-xs uppercase tracking-[0.12em] text-ink-2">Background<input value={background} onChange={e=>{setBackground(e.target.value);markDirty();}} className="border border-brass bg-paper px-2 py-1 font-mono text-sm text-ink"/></label>
          <label className="flex flex-col gap-1 font-body text-xs uppercase tracking-[0.12em] text-ink-2">Bleed (px)
            <input type="number" min={0} value={bleed} onChange={e=>{setBleedState(Math.max(0, Number(e.target.value)||0));markDirty();}} className="border border-brass bg-paper px-2 py-1 font-mono text-sm text-ink"/>
          </label>
          <div className="flex flex-col gap-2">
            <button onClick={autoDetect} className="border border-brass px-2 py-2 font-body text-xs uppercase tracking-[0.12em] text-ink bg-paper-2 hover:border-gold">Deteksi otomatis</button>
          </div>
          <label className="flex items-center gap-2 font-body text-xs text-ink-2"><input type="checkbox" checked={previewDummy} onChange={e=>setPreviewDummy(e.target.checked)} className="accent-[#D4AF37]" /> Preview foto dummy</label>
          <label className="flex items-center gap-2 font-body text-xs text-ink-2"><input type="checkbox" checked={showWithoutPhotos} onChange={e=>setShowWithoutPhotos(e.target.checked)} className="accent-[#D4AF37]" /> Lihat tanpa foto</label>
          {selected!=null && slots[selected] && (
            <div className="border-t border-dashed border-brass/40 pt-2 flex flex-col gap-2">
              <span className="font-body text-xs uppercase tracking-[0.12em] text-gold font-semibold">Slot #{selected+1}</span>
              {(["x","y","w","h","rotate","radius"] as const).map(k => (
                <label key={k} className="flex items-center gap-2 font-mono text-xs text-ink-2"><span className="w-12 uppercase text-ink">{k}</span>
                  <input type="number" min={k==="radius"?0:undefined} value={slots[selected][k] ?? 0} onChange={e=>updateSlot(selected,{[k]: Number(e.target.value)} as Partial<Slot>)} className="border border-brass bg-paper text-ink px-2 py-1 w-full" />
                </label>
              ))}
            </div>
          )}
          <p className="font-mono text-[11px] text-ink-2">Geser: panah (Shift=10). Delete hapus. Ctrl+D duplikat. Snap 8px. Overlay/frame manual (PNG berlubang) ditampilkan di atas; bounding box foto diatur di bawahnya.</p>
        </aside>
      </div>
    </main>
  );
}
