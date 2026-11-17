import { NextRequest, NextResponse } from "next/server";
import { listAllTemplates, createTemplate, putOverlay } from "@/lib/templates-repo";
import { validatePngBuffer } from "@/lib/png";
import { getSessionCookieName, isAdminAuthenticated } from "@/lib/auth";
import { z } from "zod";

const slotSchema = z.object({
  x: z.number().int().nonnegative(),
  y: z.number().int().nonnegative(),
  w: z.number().int().positive(),
  h: z.number().int().positive(),
  rotate: z.number().default(0),
  radius: z.number().int().nonnegative().default(0),
});
const metaSchema = z.object({
  name: z.string().min(1),
  canvas: z.object({ w: z.number().int().positive().max(6000), h: z.number().int().positive().max(6000) }),
  slots: z.array(slotSchema).min(1),
  background: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#ffffff"),
  bleed: z.number().int().nonnegative().default(0),
  published: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  if (!isAdminAuthenticated(req.cookies.get(getSessionCookieName())?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const templates = await listAllTemplates();
  return NextResponse.json({ templates });
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthenticated(req.cookies.get(getSessionCookieName())?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const form = await req.formData();
  const file = form.get("file");
  const metaRaw = form.get("meta");
  if (!(file instanceof File)) return NextResponse.json({ error: "File PNG diperlukan." }, { status: 400 });
  if (file.type && file.type !== "image/png") return NextResponse.json({ error: "File harus PNG." }, { status: 400 });
  const buf = Buffer.from(await file.arrayBuffer());
  const valid = validatePngBuffer(buf);
  if (!valid.ok) return NextResponse.json({ error: valid.error }, { status: 400 });

  let meta: z.infer<typeof metaSchema>;
  try {
    meta = metaSchema.parse(metaRaw ? JSON.parse(String(metaRaw)) : {});
  } catch (e) {
    return NextResponse.json({ error: "Metadata tidak valid.", detail: String(e) }, { status: 400 });
  }
  for (const s of meta.slots) {
    if (s.x + s.w > meta.canvas.w || s.y + s.h > meta.canvas.h) {
      return NextResponse.json({ error: "Semua slot harus berada dalam batas canvas." }, { status: 400 });
    }
  }

  const id = crypto.randomUUID();
  const overlayKey = `${id}.png`;
  await putOverlay(overlayKey, buf);

  const now = new Date().toISOString();
  const all = await listAllTemplates();
  await createTemplate({
    id,
    name: meta.name,
    canvas: valid.width && valid.height ? { w: valid.width, h: valid.height } : meta.canvas,
    slots: meta.slots,
    overlayKey,
    bleed: meta.bleed ?? 0,
    background: meta.background,
    published: meta.published ?? false,
    isActive: meta.isActive ?? meta.published ?? false,
    usageCount: 0,
    sort: all.length,
    createdAt: now,
    updatedAt: now,
  });
  return NextResponse.json({ id, ok: true }, { status: 201 });
}
