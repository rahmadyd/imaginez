import { NextRequest, NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "Share tidak tersedia di Cloudflare deployment." }, { status: 503 });
}
