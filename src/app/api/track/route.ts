import { NextRequest, NextResponse } from "next/server";

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

  return NextResponse.json({ ok: true, stored: false });
}
