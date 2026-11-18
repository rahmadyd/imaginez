import { NextRequest, NextResponse } from "next/server";
import { isAllowedAdminEmail } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { createSessionClient } from "@/lib/supabase/session";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "local";
  const isLocal =
    req.nextUrl.hostname === "localhost" ||
    req.nextUrl.hostname === "127.0.0.1" ||
    req.nextUrl.hostname === "[::1]";
  const rl = isLocal
    ? { ok: true, remaining: 5 }
    : checkRateLimit(`login:${ip}`, 5, 10 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Terlalu banyak percobaan. Coba lagi nanti." }, { status: 429 });
  }
  let body: { email?: string; password?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Email atau kata sandi salah." }, { status: 401 });
  }
  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";
  if (!email || !password) {
    return NextResponse.json({ error: "Email atau kata sandi salah." }, { status: 401 });
  }
  const supabase = await createSessionClient();
  if (!supabase) {
    return NextResponse.json({ error: "Login belum dikonfigurasi." }, { status: 503 });
  }
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      return NextResponse.json({ error: "Email atau kata sandi salah." }, { status: 401 });
    }
    if (!isAllowedAdminEmail(data.user.email)) {
      await supabase.auth.signOut();
      return NextResponse.json({ error: "Email atau kata sandi salah." }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: "Email atau kata sandi salah." }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
