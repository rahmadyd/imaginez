import { NextRequest, NextResponse } from "next/server";
import { randomToken, sanitizeName } from "@/lib/share";
import { insertShareRecord, uploadShareObject } from "@/lib/share-store";
import { isSupabaseConfigured } from "@/lib/db";

const MAX_BYTES = 12 * 1024 * 1024;
const TTL_MS = 5 * 60 * 1000;

export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Share tidak tersedia." }, { status: 503 });
  }
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "File diperlukan." }, { status: 400 });
  if (!/^image\/(png|jpeg)$/.test(file.type)) return NextResponse.json({ error: "Format tidak didukung." }, { status: 400 });
  if (file.size <= 0 || file.size > MAX_BYTES) return NextResponse.json({ error: "Ukuran file tidak valid." }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  const id = randomToken(16);
  const ext = file.type === "image/jpeg" ? "jpg" : "png";
  const storageKey = `shares/${id}.${ext}`;
  const expiresAt = new Date(Date.now() + TTL_MS).toISOString();
  const createdAt = new Date().toISOString();
  const contentType = file.type;

  try {
    await uploadShareObject(storageKey, buf, contentType);
    await insertShareRecord({ id, storage_key: storageKey, content_type: contentType, expires_at: expiresAt, created_at: createdAt });
  } catch {
    return NextResponse.json({ error: "Gagal membuat tautan." }, { status: 500 });
  }

  const origin = req.nextUrl.origin;
  return NextResponse.json({
    id,
    url: `${origin}/share/${id}`,
    expiresAt,
    filename: sanitizeName(file.name || `photobooth.${ext}`),
  }, { status: 201 });
}
