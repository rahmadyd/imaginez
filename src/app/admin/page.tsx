"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AdminTemplate } from "@/features/templates/schema";
import { Sunburst, GrainOverlay, FiligreeCorners, TheatreDivider, RibbonBadge } from "@/components/ornaments/TheatreOrnaments";
import { getFallbackAnalytics, type DashboardAnalytics, type DateRangeKey, type TrendPoint } from "@/features/admin/analytics";

export default function AdminPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<AdminTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [range, setRange] = useState<DateRangeKey>("7d");
  const [analyticsData, setAnalyticsData] = useState<DashboardAnalytics | null>(null);
  const [analyticsConfigured, setAnalyticsConfigured] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const uploaderRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/templates", { cache: "no-store" });
        if (!res.ok) throw new Error("Gagal memuat");
        const data = await res.json();
        if (!cancelled) setTemplates(data.templates ?? []);
      } catch {
        if (!cancelled) setError("Gagal memuat template.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setAnalyticsLoading(true);
      try {
        const res = await fetch(`/api/admin/analytics?range=${encodeURIComponent(range)}`, { cache: "no-store" });
        if (!res.ok) throw new Error("fail");
        const data = (await res.json()) as { configured?: boolean; analytics?: DashboardAnalytics | null };
        if (cancelled) return;
        setAnalyticsConfigured(data.configured === true && !!data.analytics);
        setAnalyticsData(data.analytics ?? null);
      } catch {
        if (cancelled) return;
        setAnalyticsConfigured(false);
        setAnalyticsData(null);
      } finally {
        if (!cancelled) setAnalyticsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [range, templates]);

  const reload = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/admin/templates", { cache: "no-store" });
      if (!res.ok) throw new Error("Gagal memuat");
      const data = await res.json();
      setTemplates(data.templates ?? []);
    } catch {
      setError("Gagal memuat template.");
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    // Navigasi penuh supaya guard admin tidak memakai cache RSC sesi lama.
    window.location.href = "/login";
  };

  const togglePublish = async (t: AdminTemplate) => {
    const next = !(t.isActive ?? t.published);
    await fetch(`/api/admin/templates/${t.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ published: next, isActive: next }) });
    await reload();
  };

  const remove = async (t: AdminTemplate) => {
    if (!confirm(`Hapus template "${t.name}"?`)) return;
    await fetch(`/api/admin/templates/${t.id}`, { method: "DELETE" });
    await reload();
  };

  const onDrop = async (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const ids = templates.map(t => t.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    ids.splice(from, 1);
    ids.splice(to, 0, dragId);
    setTemplates(prev => {
      const map = new Map(prev.map(p => [p.id, p]));
      return ids.map((id, i) => ({ ...map.get(id)!, sort: i }));
    });
    await fetch("/api/admin/templates/reorder", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) });
    setDragId(null);
  };

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("meta", JSON.stringify({
        name: file.name.replace(/\.png$/i, "") || "Template",
        canvas: { w: 1200, h: 3600 },
        slots: [{ x: 100, y: 100, w: 1000, h: 500, rotate: 0 }],
        background: "#ffffff",
        published: false,
        isActive: false,
      }));
      const res = await fetch("/api/admin/templates", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { alert(data.error || "Gagal unggah"); return; }
      router.push(`/admin/templates/${data.id}`);
    } finally {
      setUploading(false);
    }
  };

  const fallbackAnalytics = useMemo(() => getFallbackAnalytics(range, templates), [range, templates]);
  const analytics = analyticsConfigured && analyticsData ? analyticsData : fallbackAnalytics;
  const tracked = analyticsConfigured && analyticsData;
  const templateUsageById = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of analytics.topTemplates) map.set(t.id, t.usageCount);
    return map;
  }, [analytics.topTemplates]);

  return (
    <main className="min-h-[100dvh] bg-paper text-ink p-4 flex justify-center relative overflow-hidden">
      <Sunburst className="opacity-40" />
      <GrainOverlay />
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 60% 40% at 50% 10%, rgba(212,175,55,0.06) 0%, transparent 70%)" }} />
      <div className="relative w-full max-w-[1180px] flex flex-col gap-4 z-10">
        <header className="relative border border-brass/60 bg-paper-2/50 p-[1px]">
          <FiligreeCorners size={26} inset="inset-1" />
          <div className="border border-brass/30 px-4 py-4 flex items-start justify-between gap-4 flex-wrap">
            <div className="flex flex-col gap-2 min-w-[260px]">
              <RibbonBadge>Backstage</RibbonBadge>
              <div>
                <h1 className="font-display text-2xl sm:text-3xl font-semibold text-gold tracking-wide">Backstage Box Office</h1>
                <p className="font-body text-sm text-ink-2">Analytics &amp; Stage Management</p>
              </div>
            </div>
            <div className="flex flex-col sm:items-end gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Link href="/" className="font-body text-xs uppercase tracking-[0.14em] text-ink-2 underline underline-offset-4 hover:text-ink">Beranda</Link>
                <button onClick={logout} className="font-body text-xs uppercase tracking-[0.14em] text-ink-2 underline underline-offset-4 hover:text-ink">Keluar</button>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex border border-brass/50 bg-paper/40 p-0.5">
                  {([
                    ["today", "Today"],
                    ["7d", "7 Days"],
                    ["30d", "30 Days"],
                  ] as const).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setRange(key)}
                      className={`px-3 py-1.5 font-body text-xs uppercase tracking-[0.12em] transition-colors ${range === key ? "bg-booth-red text-ink border border-gold/60" : "text-ink-2 hover:text-ink border border-transparent"}`}
                    >{label}</button>
                  ))}
                </div>
                <button
                  onClick={() => uploaderRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  className="inline-flex items-center justify-center min-h-[36px] px-4 font-body font-semibold text-xs uppercase tracking-[0.14em] border border-gold bg-booth-red text-ink hover:bg-curtain transition-colors"
                >+ Upload New Frame</button>
              </div>
            </div>
          </div>
        </header>

        <TheatreDivider />

        {loading && <p className="font-mono text-ink-2 text-sm">Memuat data dashboard...</p>}
        {error && <p className="font-mono text-sm text-gold border border-brass/50 bg-paper-2/60 px-3 py-2">{error}</p>}

        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <KpiCard
            title="Total Web Visitors"
            value={formatNum(analytics.kpis.visitors)}
            note={<TrendBadge value={analytics.kpis.visitorsTrendPct} />}
            sub={analytics.source.visitors === "fallback" ? "Estimated (tracking pending)" : "Tracked"}
          />
          <KpiCard
            title="Completed Photo Sessions"
            value={formatNum(analytics.kpis.sessions)}
            note={<span className="font-mono text-xs text-ink-2">strips generated</span>}
            sub={`Conversion ${analytics.kpis.conversionRatePct}% from visitors`}
          />
          <KpiCard
            title="Downloads / Shares"
            value={formatNum(analytics.kpis.downloads + analytics.kpis.shares)}
            note={<TrendBadge value={analytics.kpis.downloadsSharesTrendPct} />}
            sub={`${formatNum(analytics.kpis.downloads)} downloads · ${formatNum(analytics.kpis.shares)} shares`}
          />
          <KpiCard
            title="Most Popular Template"
            value={analytics.kpis.topTemplateName}
            valueClass="text-lg sm:text-xl truncate"
            note={<span className="font-mono text-xs text-gold">{formatNum(analytics.kpis.topTemplateUsage)} uses</span>}
            sub={templates.length ? `${templates.length} templates in studio` : "No templates yet"}
          />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.85fr)_minmax(0,1fr)] gap-3">
          <div className="relative border border-brass/60 bg-paper-2/40 p-[1px] min-w-0">
            <div className="border border-brass/25 p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <h2 className="font-display text-xl text-gold">Traffic &amp; Session Trends</h2>
                  <p className="font-body text-xs text-ink-2">Web visitors vs. completed photo sessions</p>
                </div>
                <div className="flex items-center gap-3 font-body text-xs text-ink-2">
                  <LegendDot color="#D4AF37" label="Visitors" />
                  <LegendDot color="#781D2B" label="Sessions" />
                </div>
              </div>
              <TrendChart data={analytics.trend} />
              <p className="font-mono text-[10px] text-ink-2/70">{tracked ? "Tracking data from booth events." : (analyticsLoading ? "Loading analytics..." : "Fallback analytics shown until tracking events are connected.")}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 min-w-0">
            <div className="relative border border-brass/60 bg-paper-2/40 p-[1px] min-w-0">
              <div className="border border-brass/25 p-4 flex flex-col gap-3">
                <div>
                  <h2 className="font-display text-xl text-gold">Top Performing Templates</h2>
                  <p className="font-body text-xs text-ink-2">Most frequently used frames</p>
                </div>
                <div className="flex flex-col gap-2">
                  {analytics.topTemplates.length === 0 && (
                    <p className="font-body text-sm text-ink-2">No template data yet.</p>
                  )}
                  {analytics.topTemplates.slice(0, 5).map((t, idx) => (
                    <div key={t.id} className="flex items-center gap-3 border border-brass/30 bg-paper/30 p-2">
                      <span className="font-mono text-xs text-gold w-4">{idx + 1}</span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={t.overlayUrl} alt={t.name} className="w-8 h-12 object-contain border border-brass/30 bg-paper" width={32} height={48} loading="lazy" decoding="async" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-body text-sm text-ink truncate">{t.name}</p>
                          <span className="font-mono text-[11px] text-ink-2 shrink-0">{t.usageCount} uses</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full bg-paper border border-brass/20 overflow-hidden">
                          <div className="h-full bg-gold/70" style={{ width: `${Math.max(6, Math.round(t.share * 100))}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="relative border border-brass/60 bg-paper-2/40 p-[1px] min-w-0">
              <div className="border border-brass/25 p-4 flex flex-col gap-3">
                <div>
                  <h2 className="font-display text-xl text-gold">Top 5 Lokasi Pengguna</h2>
                  <p className="font-body text-xs text-ink-2">Kota di Indonesia, berdasarkan page view</p>
                </div>
                {analytics.topLocations.length === 0 ? (
                  <p className="font-body text-sm text-ink-2">{tracked ? "Belum ada data lokasi page view pada rentang ini." : "Data lokasi akan muncul saat tracking page view aktif."}</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {analytics.topLocations.slice(0, 5).map((loc, idx) => (
                      <div key={`${loc.city}-${idx}`} className="flex items-center gap-3 border border-brass/30 bg-paper/30 p-2">
                        <span className="font-mono text-xs text-gold w-4">{idx + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-body text-sm text-ink truncate">{loc.city}</p>
                            <span className="font-mono text-[11px] text-ink-2 shrink-0">{loc.count} views</span>
                          </div>
                          <div className="mt-1 h-1.5 w-full bg-paper border border-brass/20 overflow-hidden">
                            <div className="h-full bg-booth-red/70" style={{ width: `${Math.max(6, Math.round(loc.share * 100))}%` }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <p className="font-mono text-[10px] text-ink-2/70 mt-auto">Lokasi kasar sisi server (header geo), tanpa GPS/login/identitas pengguna.</p>
              </div>
            </div>
          </div>
        </section>

        <section ref={uploaderRef} className="grid grid-cols-1 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.55fr)] gap-3">
          <div className="relative border border-brass/60 bg-paper-2/40 p-[1px]">
            <FiligreeCorners size={22} inset="inset-1" />
            <div className="border border-brass/25 p-4 flex flex-col gap-3">
              <div>
                <h2 className="font-display text-xl text-gold">Template Studio</h2>
                <p className="font-body text-xs text-ink-2">Upload a PNG frame and configure slots in the editor.</p>
              </div>
              <label className="group relative flex flex-col items-center justify-center gap-2 border border-dashed border-brass/60 bg-paper/30 hover:border-gold/70 transition-colors min-h-[180px] p-4 cursor-pointer text-center">
                <span className="font-body text-sm text-ink">{uploading ? "Mengunggah..." : "Drop or select PNG frame"}</span>
                <span className="font-mono text-[11px] text-ink-2">Transparent PNG · slot areas cut out · opens editor on upload</span>
                <span className="mt-1 inline-flex items-center justify-center min-h-[36px] px-4 font-body font-semibold text-xs uppercase tracking-[0.14em] border border-gold bg-booth-red text-ink group-hover:bg-curtain transition-colors">
                  {uploading ? "Uploading..." : "Upload New Frame"}
                </span>
                <input type="file" accept="image/png" className="hidden" onChange={onUpload} disabled={uploading} />
              </label>
            </div>
          </div>

          <div className="relative border border-brass/60 bg-paper-2/40 p-[1px] min-w-0">
            <div className="border border-brass/25 p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <h2 className="font-display text-xl text-gold">Frame Manager</h2>
                  <p className="font-body text-xs text-ink-2">Manage, reorder, and publish uploaded templates.</p>
                </div>
                <span className="font-mono text-xs text-ink-2">{templates.length} total</span>
              </div>
              {!loading && !error && templates.length === 0 && <p className="font-body text-ink-2 text-sm">Belum ada template. Unggah PNG untuk mulai.</p>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {templates.map((t) => {
                  const usage = templateUsageById.get(t.id) ?? t.usageCount ?? 0;
                  const active = t.isActive ?? t.published;
                  return (
                    <div key={t.id}
                      draggable
                      onDragStart={() => setDragId(t.id)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => onDrop(t.id)}
                      className="relative border border-brass/40 bg-paper/30 p-3 flex gap-3 hover:border-brass transition-colors">
                      <span className="font-mono text-xs text-ink-2 cursor-grab pt-1" title="Seret untuk urutkan">::</span>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`/api/templates/${t.id}/overlay`} alt={t.name} className="w-12 h-20 object-contain border border-brass/40 bg-paper shrink-0" width={48} height={80} loading="lazy" decoding="async" />
                      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-display text-sm text-ink truncate">{t.name}</p>
                          <span className="font-mono text-[10px] text-gold border border-gold/40 px-1.5 py-0.5 shrink-0">{usage} uses</span>
                        </div>
                        <p className="font-mono text-[11px] text-ink-2">{t.slots.length} slot · {t.canvas.w}×{t.canvas.h}</p>
                        <div className="mt-auto flex items-center justify-between gap-2 flex-wrap pt-1">
                          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                            <span className="font-body text-[11px] uppercase tracking-[0.1em] text-ink-2">{active ? "Active" : "Hidden"}</span>
                            <span className="relative inline-block w-9 h-5">
                              <input type="checkbox" checked={active} onChange={() => togglePublish(t)} className="sr-only peer" />
                              <span className="absolute inset-0 border border-brass/60 bg-paper peer-checked:bg-booth-red peer-checked:border-gold/70 transition-colors" />
                              <span className="absolute top-0.5 left-0.5 w-4 h-4 bg-ink-2 peer-checked:bg-gold peer-checked:translate-x-4 transition-transform" />
                            </span>
                          </label>
                          <div className="flex items-center gap-3">
                            <Link href={`/admin/templates/${t.id}`} className="font-body text-xs uppercase tracking-[0.12em] text-gold underline underline-offset-4 hover:text-ink">Edit</Link>
                            <button onClick={() => remove(t)} className="font-body text-xs uppercase tracking-[0.12em] text-ink-2 underline underline-offset-4 hover:text-gold">Hapus</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="relative border border-brass/60 bg-paper-2/40 p-[1px]">
          <div className="border border-brass/25 p-4 flex flex-col gap-3">
            <div>
              <h2 className="font-display text-xl text-gold">Recent Box Office Activity</h2>
              <p className="font-body text-xs text-ink-2">Latest photo sessions and export actions</p>
            </div>
            <div className="overflow-auto">
              <table className="w-full min-w-[640px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-brass/40 text-ink-2">
                    <th className="font-body text-[11px] uppercase tracking-[0.14em] font-semibold py-2 pr-3">Session ID</th>
                    <th className="font-body text-[11px] uppercase tracking-[0.14em] font-semibold py-2 pr-3">Template Used</th>
                    <th className="font-body text-[11px] uppercase tracking-[0.14em] font-semibold py-2 pr-3">Filter Selected</th>
                    <th className="font-body text-[11px] uppercase tracking-[0.14em] font-semibold py-2 pr-3">Export Method</th>
                    <th className="font-body text-[11px] uppercase tracking-[0.14em] font-semibold py-2">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.activity.length === 0 ? (
                    <tr><td colSpan={5} className="py-3 font-body text-sm text-ink-2">{tracked ? "Belum ada aktivitas pada rentang ini." : "Activity log uses fallback data until tracking events are wired."}</td></tr>
                  ) : analytics.activity.map((a) => (
                    <tr key={`${a.id}-${a.timestamp}`} className="border-b border-brass/20 last:border-b-0">
                      <td className="py-2.5 pr-3 font-mono text-xs text-gold/90">{a.id}</td>
                      <td className="py-2.5 pr-3 font-body text-sm text-ink">{a.templateName}</td>
                      <td className="py-2.5 pr-3 font-body text-sm text-ink-2">{a.filter}</td>
                      <td className="py-2.5 pr-3">
                        <span className={`inline-flex px-2 py-0.5 border font-mono text-[11px] ${a.exportMethod === "Download" || a.exportMethod === "Share" ? "border-gold/50 text-gold" : "border-brass/50 text-ink-2"}`}>{a.exportMethod}</span>
                      </td>
                      <td className="py-2.5 font-mono text-xs text-ink-2">{a.timestamp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function formatNum(n: number) {
  return n.toLocaleString("en-GB");
}

function TrendBadge({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <span className={`inline-flex items-center font-mono text-xs px-1.5 py-0.5 border ${up ? "text-gold border-gold/40" : "text-ink-2 border-brass/40"}`}>
      {up ? "▲" : "▼"} {Math.abs(value)}%
    </span>
  );
}

function KpiCard({ title, value, note, sub, valueClass = "text-2xl sm:text-3xl" }: { title: string; value: string; note?: React.ReactNode; sub?: string; valueClass?: string }) {
  return (
    <div className="relative border border-brass/60 bg-paper-2/40 p-[1px]">
      <div className="border border-brass/25 p-4 flex flex-col gap-2 h-full">
        <p className="font-body text-xs uppercase tracking-[0.14em] text-ink-2">{title}</p>
        <p className={`font-display font-semibold text-ink ${valueClass}`}>{value}</p>
        {note && <div>{note}</div>}
        {sub && <p className="font-body text-xs text-ink-2 mt-auto">{sub}</p>}
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: color, boxShadow: `0 0 0 1px rgba(244,239,230,0.15)` }} />
      {label}
    </span>
  );
}

function TrendChart({ data }: { data: TrendPoint[] }) {
  const w = 720;
  const h = 240;
  const padL = 36;
  const padR = 12;
  const padT = 16;
  const padB = 28;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const maxY = Math.max(1, ...data.map((d) => Math.max(d.visitors, d.sessions)));
  const yMax = Math.ceil(maxY * 1.15);
  const x = (i: number) => padL + (data.length <= 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const y = (v: number) => padT + innerH - (v / yMax) * innerH;

  const line = (key: "visitors" | "sessions") => data.map((d, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(2)} ${y(d[key]).toFixed(2)}`).join(" ");
  const area = (key: "visitors" | "sessions") => {
    if (!data.length) return "";
    const top = data.map((d, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(2)} ${y(d[key]).toFixed(2)}`).join(" ");
    return `${top} L ${x(data.length - 1).toFixed(2)} ${(padT + innerH).toFixed(2)} L ${x(0).toFixed(2)} ${(padT + innerH).toFixed(2)} Z`;
  };

  const yTicks = 4;
  const tickVals = Array.from({ length: yTicks + 1 }, (_, i) => Math.round((yMax / yTicks) * i));
  const xStep = Math.max(1, Math.ceil(data.length / 6));

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto block" role="img" aria-label="Traffic and session trends chart">
        <defs>
          <linearGradient id="gradVisitors" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="gradSessions" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#781D2B" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#781D2B" stopOpacity="0.03" />
          </linearGradient>
        </defs>

        {tickVals.map((tv) => {
          const yy = y(tv);
          return (
            <g key={tv}>
              <line x1={padL} y1={yy} x2={w - padR} y2={yy} stroke="#C5A059" strokeOpacity="0.15" strokeWidth="1" />
              <text x={padL - 6} y={yy + 4} textAnchor="end" fontSize="10" fill="#B8AFA6" fontFamily="ui-monospace, monospace">{tv}</text>
            </g>
          );
        })}

        <path d={area("visitors")} fill="url(#gradVisitors)" />
        <path d={area("sessions")} fill="url(#gradSessions)" />
        <path d={line("visitors")} fill="none" stroke="#D4AF37" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
        <path d={line("sessions")} fill="none" stroke="#781D2B" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />

        {data.map((d, i) => (
          <g key={`${d.label}-${i}`}>
            <circle cx={x(i)} cy={y(d.visitors)} r="3" fill="#D4AF37" stroke="#120D10" strokeWidth="1">
              <title>{`${d.label}: ${d.visitors} visitors`}</title>
            </circle>
            <circle cx={x(i)} cy={y(d.sessions)} r="3" fill="#781D2B" stroke="#F4EFE6" strokeWidth="0.8">
              <title>{`${d.label}: ${d.sessions} sessions`}</title>
            </circle>
            {i % xStep === 0 && (
              <text x={x(i)} y={h - 8} textAnchor="middle" fontSize="10" fill="#B8AFA6" fontFamily="ui-monospace, monospace">{d.label}</text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}
