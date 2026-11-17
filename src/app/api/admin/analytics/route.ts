import { NextRequest, NextResponse } from "next/server";
import { getSessionCookieName, isAdminAuthenticated } from "@/lib/auth";
import type { DashboardAnalytics, DateRangeKey } from "@/features/admin/analytics";
import { getFallbackAnalytics } from "@/features/admin/analytics";

function parseRange(v: string | null): DateRangeKey {
  return v === "today" || v === "30d" ? v : "7d";
}

export async function GET(req: NextRequest) {
  if (!isAdminAuthenticated(req.cookies.get(getSessionCookieName())?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const range = parseRange(req.nextUrl.searchParams.get("range"));
  const fallback = getFallbackAnalytics(range, []);
  fallback.source = { visitors: "unavailable", sessions: "unavailable", downloads: "unavailable", locations: "unavailable" };
  return NextResponse.json({ configured: false, range, analytics: fallback });
}
