import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/auth";
import { getSupabase, getTemplateColumnSchema, isSupabaseConfigured } from "@/lib/db";
import type { ActivityItem, DashboardAnalytics, DateRangeKey, LocationStat, TemplatePerformance, TrendPoint } from "@/features/admin/analytics";
import { getFallbackAnalytics } from "@/features/admin/analytics";

function toBool(value: unknown): boolean {
  return value === true || value === 1;
}

function parseRange(v: string | null): DateRangeKey {
  return v === "today" || v === "30d" ? v : "7d";
}

function sinceForRange(range: DateRangeKey): Date {
  const now = new Date();
  if (range === "today") {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  const days = range === "30d" ? 30 : 7;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

function labelFor(date: Date, range: DateRangeKey) {
  if (range === "today") return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function buildBuckets(range: DateRangeKey): { start: Date; label: string }[] {
  const now = new Date();
  if (range === "today") {
    const out: { start: Date; label: string }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 2 * 60 * 60 * 1000);
      d.setMinutes(0, 0, 0);
      const slot = new Date(d);
      slot.setHours(Math.floor(d.getHours() / 2) * 2, 0, 0, 0);
      out.push({ start: slot, label: labelFor(slot, range) });
    }
    return out.filter((b, i, arr) => i === 0 || b.start.getTime() !== arr[i - 1].start.getTime());
  }
  const days = range === "30d" ? 30 : 7;
  const out: { start: Date; label: string }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    d.setHours(0, 0, 0, 0);
    out.push({ start: d, label: labelFor(d, range) });
  }
  return out;
}

function bucketIndex(date: Date, range: DateRangeKey, buckets: { start: Date }[]) {
  if (!buckets.length) return -1;
  if (range === "today") {
    const t = new Date(date);
    t.setMinutes(0, 0, 0);
    t.setHours(Math.floor(t.getHours() / 2) * 2, 0, 0, 0);
    const time = t.getTime();
    return buckets.findIndex((b) => b.start.getTime() === time);
  }
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const time = d.getTime();
  return buckets.findIndex((b) => b.start.getTime() === time);
}

export async function GET(req: NextRequest) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const range = parseRange(req.nextUrl.searchParams.get("range"));
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ configured: false, range, analytics: null });
  }

  try {
    const supabase = getSupabase();
    const schema = await getTemplateColumnSchema();
    const known = Object.keys(schema).length > 0;
    const templateColumns = ["id", "name", "published", "is_active", "usage_count", "sort"]
      .filter((column) => !known || column in schema)
      .join(",");
    const since = sinceForRange(range).toISOString();
    const [{ data: events, error: evErr }, { data: templatesRaw, error: tplErr }] = await Promise.all([
      supabase.from("booth_events").select("event_type,template_id,filter_used,export_method,session_code,location,created_at").gte("created_at", since),
      supabase.from("templates").select(templateColumns).order("sort", { ascending: true }),
    ]);
    if (evErr) throw evErr;
    if (tplErr) throw tplErr;

    const evs = events ?? [];
    const tpls = ((templatesRaw ?? []) as unknown) as Array<Record<string, unknown>>;
    const pageViews = evs.filter((e) => e.event_type === "page_view");
    const sessions = evs.filter((e) => e.event_type === "session_completed");
    const downloads = evs.filter((e) => e.event_type === "photo_downloaded");
    const visitors = pageViews.length;
    const sessionCount = sessions.length;
    const downloadCount = downloads.filter((e) => e.export_method === "png" || e.export_method === "jpg" || e.export_method === "download").length || downloads.length;
    const shareCount = downloads.filter((e) => e.export_method === "share").length;
    const conversionRatePct = visitors ? Math.round((sessionCount / visitors) * 1000) / 10 : 0;

    const buckets = buildBuckets(range);
    const trend: TrendPoint[] = buckets.map((b) => ({ label: b.label, visitors: 0, sessions: 0 }));
    for (const e of pageViews) {
      const idx = bucketIndex(new Date(e.created_at), range, buckets);
      if (idx >= 0) trend[idx].visitors += 1;
    }
    for (const e of sessions) {
      const idx = bucketIndex(new Date(e.created_at), range, buckets);
      if (idx >= 0) trend[idx].sessions += 1;
    }

    const nameById = new Map<string, string>(tpls.map((t) => [t.id as string, (t.name as string) ?? "Template"]));
    const usageFromEvents = new Map<string, number>();
    for (const e of sessions) {
      if (typeof e.template_id === "string" && e.template_id) usageFromEvents.set(e.template_id, (usageFromEvents.get(e.template_id) ?? 0) + 1);
    }
    const templateRows = tpls.map((t) => {
      const id = t.id as string;
      const usageCount = Number(t.usage_count ?? 0) || usageFromEvents.get(id) || 0;
      const published = toBool(t.published);
      const isActive = toBool(t.is_active) || (t.is_active == null && published);
      return {
        id,
        name: (t.name as string) ?? "Template",
        overlayUrl: `/api/templates/${id}/overlay`,
        usageCount,
        published,
        isActive,
      };
    });
    const usageSum = templateRows.reduce((a, b) => a + b.usageCount, 0) || 0;
    const topTemplates: TemplatePerformance[] = [...templateRows]
      .sort((a, b) => b.usageCount - a.usageCount)
      .map((t) => ({ ...t, share: usageSum ? t.usageCount / usageSum : 0 }));

    const top = topTemplates[0];
    const recent = [...evs]
      .filter((e) => e.event_type === "session_completed" || e.event_type === "photo_downloaded")
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 12);
    const activity: ActivityItem[] = recent.map((e, i) => ({
      id: typeof e.session_code === "string" && e.session_code ? e.session_code : `evt-${i}-${new Date(e.created_at).getTime()}`,
      templateName: (typeof e.template_id === "string" && nameById.get(e.template_id)) || "Unknown",
      filter: (typeof e.filter_used === "string" && e.filter_used) || "No Filter",
      exportMethod: e.event_type === "photo_downloaded" ? (e.export_method === "share" ? "Share" : "Download") : "Session",
      timestamp: new Date(e.created_at).toLocaleString("en-GB", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
    }));

    const locCounts = new Map<string, number>();
    for (const e of pageViews) {
      const city = typeof e.location === "string" && e.location.trim() ? e.location.trim() : "Indonesia (lokasi kota tidak diketahui)";
      locCounts.set(city, (locCounts.get(city) ?? 0) + 1);
    }
    const locTotal = Array.from(locCounts.values()).reduce((a, b) => a + b, 0) || 0;
    const topLocations: LocationStat[] = Array.from(locCounts.entries())
      .map(([city, count]) => ({ city, count, share: locTotal ? count / locTotal : 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const analytics: DashboardAnalytics = {
      kpis: {
        visitors,
        visitorsTrendPct: 0,
        sessions: sessionCount,
        conversionRatePct,
        downloads: downloadCount,
        shares: shareCount,
        downloadsSharesTrendPct: 0,
        topTemplateName: top?.name ?? "-",
        topTemplateUsage: top?.usageCount ?? 0,
      },
      trend,
      topTemplates,
      activity,
      topLocations,
      source: { visitors: "tracked", sessions: "tracked", downloads: "tracked", locations: "tracked" },
    };

    return NextResponse.json({ configured: true, range, analytics });
  } catch {
    const fallback = getFallbackAnalytics(range, []);
    fallback.source = { visitors: "fallback", sessions: "fallback", downloads: "fallback", locations: "fallback" };
    return NextResponse.json({ configured: false, range, analytics: fallback });
  }
}