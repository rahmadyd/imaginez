import type { AdminTemplate } from "@/features/templates/schema";

export type DateRangeKey = "today" | "7d" | "30d";

export type TrendPoint = {
  label: string;
  visitors: number;
  sessions: number;
};

export type TemplatePerformance = {
  id: string;
  name: string;
  overlayUrl: string;
  usageCount: number;
  share: number; // 0..1
  published: boolean;
  isActive: boolean;
};

export type ActivityItem = {
  id: string;
  templateName: string;
  filter: string;
  exportMethod: string;
  timestamp: string;
};

export type LocationStat = {
  city: string;
  count: number;
  share: number;
};

export type KpiSummary = {
  visitors: number;
  visitorsTrendPct: number;
  sessions: number;
  conversionRatePct: number;
  downloads: number;
  shares: number;
  downloadsSharesTrendPct: number;
  topTemplateName: string;
  topTemplateUsage: number;
};

export type DashboardAnalytics = {
  kpis: KpiSummary;
  trend: TrendPoint[];
  topTemplates: TemplatePerformance[];
  activity: ActivityItem[];
  topLocations: LocationStat[];
  source: { visitors: "fallback" | "tracked" | "unavailable"; sessions: "fallback" | "tracked" | "unavailable"; downloads: "fallback" | "tracked" | "unavailable"; locations: "fallback" | "tracked" | "unavailable" };
};

const FILTERS = ["Natural", "B&W", "Warm Film", "Cool Matte", "No Filter"] as const;

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function formatDayLabel(date: Date, range: DateRangeKey) {
  if (range === "today") return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return date.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
}

function buildTrend(range: DateRangeKey, seed: number): TrendPoint[] {
  const rand = mulberry32(seed ^ (range === "today" ? 11 : range === "7d" ? 7 : 30));
  const points = range === "today" ? 12 : range === "7d" ? 7 : 30;
  const now = new Date();
  const out: TrendPoint[] = [];
  let visitorsBase = range === "today" ? 8 : range === "7d" ? 45 : 38;
  let sessionsBase = range === "today" ? 3 : range === "7d" ? 22 : 18;
  for (let i = points - 1; i >= 0; i--) {
    const d = new Date(now);
    if (range === "today") d.setHours(now.getHours() - i * 2, 0, 0, 0);
    else d.setDate(now.getDate() - i);
    visitorsBase = Math.max(4, Math.round(visitorsBase * (0.9 + rand() * 0.25)));
    sessionsBase = Math.max(1, Math.min(visitorsBase, Math.round(sessionsBase * (0.88 + rand() * 0.3))));
    out.push({ label: formatDayLabel(d, range), visitors: visitorsBase, sessions: sessionsBase });
  }
  return out;
}

export function getFallbackAnalytics(range: DateRangeKey, templates: AdminTemplate[]): DashboardAnalytics {
  const seed = hashString(`${range}|${templates.map(t => t.id).join(",")}|${templates.length}`);
  const rand = mulberry32(seed);
  const trend = buildTrend(range, seed);
  const visitors = trend.reduce((a, p) => a + p.visitors, 0);
  const sessions = trend.reduce((a, p) => a + p.sessions, 0);
  const conversionRatePct = visitors ? Math.round((sessions / visitors) * 1000) / 10 : 0;

  const downloads = Math.round(sessions * (0.62 + rand() * 0.18));
  const shares = Math.max(0, Math.round(sessions * (0.08 + rand() * 0.12)));
  const visitorsTrendPct = Math.round((-6 + rand() * 18) * 10) / 10;
  const downloadsSharesTrendPct = Math.round((-4 + rand() * 16) * 10) / 10;

  const weights = templates.map((t, i) => (t.published ? 1.4 : 0.6) + (templates.length - i) * 0.08 + rand() * 0.5);
  const weightSum = weights.reduce((a, b) => a + b, 0) || 1;
  const usages = templates.map((_, i) => Math.max(1, Math.round((weights[i] / weightSum) * Math.max(sessions, templates.length * 3))));
  const usageSum = usages.reduce((a, b) => a + b, 0) || 1;
  const topTemplates: TemplatePerformance[] = templates
    .map((t, i) => ({
      id: t.id,
      name: t.name,
      overlayUrl: `/api/templates/${t.id}/overlay`,
      usageCount: usages[i],
      share: usages[i] / usageSum,
      published: t.published,
      isActive: t.isActive ?? t.published,
    }))
    .sort((a, b) => b.usageCount - a.usageCount);

  const top = topTemplates[0];
  const pool = topTemplates.length ? topTemplates : [{ id: "none", name: "No template", overlayUrl: "", usageCount: 0, share: 0, published: false, isActive: false }];
  const activity: ActivityItem[] = Array.from({ length: 8 }).map((_, i) => {
    const pick = pool[Math.floor(rand() * pool.length)];
    const minsAgo = 3 + i * (range === "today" ? 7 : 37) + Math.floor(rand() * 9);
    const ts = new Date(Date.now() - minsAgo * 60 * 1000);
    return {
      id: `sess-${seed.toString(36)}-${i}`,
      templateName: pick.name,
      filter: FILTERS[Math.floor(rand() * FILTERS.length)],
      exportMethod: rand() > 0.22 ? "Download" : "QR Share",
      timestamp: ts.toLocaleString("en-GB", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
    };
  });

  const fallbackCities = ["Jakarta", "Bandung", "Surabaya", "Yogyakarta", "Medan"];
  const locCounts = fallbackCities.map((c, i) => ({ city: c, count: Math.max(1, Math.round(visitors * (0.34 - i * 0.05) * (0.7 + rand() * 0.6))) }));
  const locTotal = locCounts.reduce((a, b) => a + b.count, 0) || 1;
  const topLocations = locCounts.map((l) => ({ ...l, share: l.count / locTotal })).sort((a, b) => b.count - a.count).slice(0, 5);

  return {
    kpis: {
      visitors,
      visitorsTrendPct,
      sessions,
      conversionRatePct,
      downloads,
      shares,
      downloadsSharesTrendPct,
      topTemplateName: top?.name ?? "-",
      topTemplateUsage: top?.usageCount ?? 0,
    },
    trend,
    topTemplates,
    activity,
    topLocations,
    source: { visitors: "fallback", sessions: "fallback", downloads: "fallback", locations: "fallback" },
  };
}
