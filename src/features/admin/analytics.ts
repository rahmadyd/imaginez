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
  source: { visitors: "empty" | "tracked"; sessions: "empty" | "tracked"; downloads: "empty" | "tracked"; locations: "empty" | "tracked" };
};

function formatDayLabel(date: Date, range: DateRangeKey) {
  if (range === "today") return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return date.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
}

function buildEmptyTrend(range: DateRangeKey): TrendPoint[] {
  const points = range === "today" ? 12 : range === "7d" ? 7 : 30;
  const now = new Date();
  const out: TrendPoint[] = [];
  for (let i = points - 1; i >= 0; i--) {
    const d = new Date(now);
    if (range === "today") d.setHours(now.getHours() - i * 2, 0, 0, 0);
    else d.setDate(now.getDate() - i);
    out.push({ label: formatDayLabel(d, range), visitors: 0, sessions: 0 });
  }
  return out;
}

export function getEmptyAnalytics(range: DateRangeKey, templates: AdminTemplate[]): DashboardAnalytics {
  const topTemplates: TemplatePerformance[] = templates.map((t) => ({
    id: t.id,
    name: t.name,
    overlayUrl: `/api/templates/${t.id}/overlay`,
    usageCount: 0,
    share: 0,
    published: t.published,
    isActive: t.isActive ?? t.published,
  }));

  return {
    kpis: {
      visitors: 0,
      visitorsTrendPct: 0,
      sessions: 0,
      conversionRatePct: 0,
      downloads: 0,
      shares: 0,
      downloadsSharesTrendPct: 0,
      topTemplateName: "-",
      topTemplateUsage: 0,
    },
    trend: buildEmptyTrend(range),
    topTemplates,
    activity: [],
    topLocations: [],
    source: { visitors: "empty", sessions: "empty", downloads: "empty", locations: "empty" },
  };
}
