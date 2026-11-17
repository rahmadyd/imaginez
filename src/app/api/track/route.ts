import { NextRequest, NextResponse } from "next/server";
import { getSupabase, isSupabaseConfigured } from "@/lib/db";
import { getRequestCity, isUuidLike } from "@/lib/tracking";

const ALLOWED = new Set(["page_view", "session_completed", "photo_downloaded"]);

function asString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s ? s.slice(0, 120) : null;
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const eventType = asString(body.event_type);
  if (!eventType || !ALLOWED.has(eventType)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const templateIdRaw = body.template_id;
  const templateId = isUuidLike(templateIdRaw) ? templateIdRaw : null;
  const filterUsed = asString(body.filter_used);
  const exportMethod = asString(body.export_method);
  const sessionCode = asString(body.session_code);
  const location = eventType === "page_view" ? getRequestCity(req) : null;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, stored: false });
  }

  try {
    const supabase = getSupabase();
    const { error } = await supabase.from("booth_events").insert({
      event_type: eventType,
      template_id: templateId,
      filter_used: filterUsed,
      export_method: exportMethod,
      session_code: sessionCode,
      location,
    });
    if (error) throw error;

    if (eventType === "session_completed" && templateId) {
      // Best-effort aggregate increment; ignore failures to keep tracking non-blocking.
      try {
        await supabase.rpc("increment_template_usage", { row_id: templateId });
      } catch {
        // ignore
      }
    }

    return NextResponse.json({ ok: true, stored: true });
  } catch {
    return NextResponse.json({ ok: true, stored: false });
  }
}