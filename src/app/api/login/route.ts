import { NextRequest, NextResponse } from "next/server";
import { verifyCredentials, createSessionToken, sessionCookie } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

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
  try { body = await req.json(); } catch { /* ignore */ }
  const ok = await verifyCredentials(body.email || "", body.password || "");
  if (!ok) {
    return NextResponse.json({ error: "Email atau kata sandi salah." }, { status: 401 });
  }
  const token = createSessionToken();
  const res = NextResponse.json({ ok: true });
  const c = sessionCookie(token);
  res.cookies.set(c);
  return res;
}
