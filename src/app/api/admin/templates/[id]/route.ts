import { NextRequest, NextResponse } from "next/server";
import { getTemplate, updateTemplate, deleteTemplate, putOverlay, deleteOverlay } from "@/lib/templates-repo";
import { validatePngBuffer } from "@/lib/png";
import { isAdminRequest } from "@/lib/auth";
import { z } from "zod";

const slotSchema = z.object({
  x: z.number().int().nonnegative(),
  y: z.number().int().nonnegative(),
  w: z.number().int().positive(),
  h: z.number().int().positive(),
  rotate: z.number().default(0),
  radius: z.number().int().nonnegative().default(0),
});
const updateSchema = z.object({
  name: z.string().min(1).optional(),
  canvas: z.object({ w: z.number().int().positive().max(6000), h: z.number().int().positive().max(6000) }).optional(),
  slots: z.array(slotSchema).min(1).optional(),
  background: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  published: z.boolean().optional(),
  isActive: z.boolean().optional(),
  usageCount: z.number().int().nonnegative().optional(),
  bleed: z.number().int().nonnegative().optional(),
  baseLayerKey: z.string().min(1).nullable().optional(),
  overlayKey: z.string().min(1).optional(),
});

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const t = await getTemplate(id);
  if (!t) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ template: t });
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const existing = await getTemplate(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const ct = req.headers.get("content-type") || "";
  if (ct.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    const baseFile = form.get("baseFile");
    const metaRaw = form.get("meta");
    const patch: Record<string, unknown> = metaRaw ? JSON.parse(String(metaRaw)) : {};

    if (baseFile instanceof File) {
      const buf = Buffer.from(await baseFile.arrayBuffer());
      const valid = validatePngBuffer(buf);
      if (!valid.ok) return NextResponse.json({ error: valid.error }, { status: 400 });
      const baseKey = `${id}-base.png`;
      await putOverlay(baseKey, buf);
      patch.baseLayerKey = baseKey;
    }
    if (file instanceof File) {
      const buf = Buffer.from(await file.arrayBuffer());
      const valid = validatePngBuffer(buf);
      if (!valid.ok) return NextResponse.json({ error: valid.error }, { status: 400 });
      const targetKey = (patch.overlayKey as string | undefined) || existing.overlayKey;
      await putOverlay(targetKey, buf);
      patch.overlayKey = targetKey;
      if (valid.width && valid.height) patch.canvas = { w: valid.width, h: valid.height };
    }

    const parsed = updateSchema.parse(patch);
    const { baseLayerKey, isActive, published, ...rest } = parsed;
    const normalized: Record<string, unknown> = { ...rest };
    if (baseLayerKey != null) normalized.baseLayerKey = baseLayerKey;
    if (isActive != null) { normalized.isActive = isActive; if (published == null) normalized.published = isActive; }
    if (published != null) { normalized.published = published; if (isActive == null) normalized.isActive = published; }
    if (normalized.slots && normalized.canvas) {
      for (const s of normalized.slots as { x: number; y: number; w: number; h: number }[]) if (s.x + s.w > (normalized.canvas as { w: number; h: number }).w || s.y + s.h > (normalized.canvas as { w: number; h: number }).h) return NextResponse.json({ error: "Semua slot harus berada dalam batas canvas." }, { status: 400 });
    } else if (normalized.slots) {
      const c = (normalized.canvas as { w: number; h: number } | undefined) ?? existing.canvas;
      for (const s of normalized.slots as { x: number; y: number; w: number; h: number }[]) if (s.x + s.w > c.w || s.y + s.h > c.h) return NextResponse.json({ error: "Semua slot harus berada dalam batas canvas." }, { status: 400 });
    }
    await updateTemplate(id, normalized);
    return NextResponse.json({ ok: true });
  }

  const body = await req.json();
  const parsed = updateSchema.parse(body);
  const { baseLayerKey, isActive, published, ...rest } = parsed;
  const normalized: Record<string, unknown> = { ...rest };
  if (baseLayerKey != null) normalized.baseLayerKey = baseLayerKey;
  if (isActive != null) { normalized.isActive = isActive; if (published == null) normalized.published = isActive; }
  if (published != null) { normalized.published = published; if (isActive == null) normalized.isActive = published; }
  const canvas = (normalized.canvas as { w: number; h: number } | undefined) ?? existing.canvas;
  if (normalized.slots) {
    for (const s of normalized.slots as { x: number; y: number; w: number; h: number }[]) if (s.x + s.w > canvas.w || s.y + s.h > canvas.h) return NextResponse.json({ error: "Semua slot harus berada dalam batas canvas." }, { status: 400 });
  }
  await updateTemplate(id, normalized);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const existing = await getTemplate(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  for (const key of [existing.overlayKey, existing.baseLayerKey]) {
    if (!key) continue;
    try { await deleteOverlay(key); } catch { /* ignore */ }
  }
  await deleteTemplate(id);
  return NextResponse.json({ ok: true });
}
