import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ error: "Share tidak tersedia di Cloudflare deployment." }, { status: 503 });
}