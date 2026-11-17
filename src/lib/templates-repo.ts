import type { AdminTemplate, ClientTemplate, Slot } from "@/features/templates/schema";
import { getEnv, isD1Configured, isR2Configured, type D1Database, type R2Bucket, readLocalRows, writeLocalRows, putLocalOverlay, getLocalOverlay, deleteLocalOverlay } from "./db";

type TemplateRow = {
  id: string;
  name: string;
  canvas_w: number;
  canvas_h: number;
  slots_json: string;
  overlay_key: string;
  base_layer_key: string | null;
  bleed: number | null;
  background: string;
  published: number;
  is_active: number | null;
  usage_count: number | null;
  sort: number;
  created_at: string;
  updated_at: string;
};

function rowToAdmin(row: TemplateRow): AdminTemplate {
  const slots = JSON.parse(row.slots_json) as Slot[];
  const published = row.published === 1;
  const isActive = row.is_active === 1 || (row.is_active == null && published);
  return {
    id: row.id,
    name: row.name,
    canvas: { w: row.canvas_w, h: row.canvas_h },
    slots,
    overlayKey: row.overlay_key,
    baseLayerKey: row.base_layer_key ?? undefined,
    bleed: row.bleed ?? 0,
    background: row.background,
    published,
    isActive,
    usageCount: row.usage_count ?? 0,
    sort: row.sort,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function adminToRow(t: AdminTemplate) {
  return {
    id: t.id,
    name: t.name,
    canvas_w: t.canvas.w,
    canvas_h: t.canvas.h,
    slots_json: JSON.stringify(t.slots),
    overlay_key: t.overlayKey,
    base_layer_key: t.baseLayerKey ?? null,
    bleed: t.bleed ?? 0,
    background: t.background,
    published: t.published ? 1 : 0,
    is_active: t.isActive ? 1 : 0,
    usage_count: t.usageCount ?? 0,
    sort: t.sort,
    created_at: t.createdAt,
    updated_at: t.updatedAt,
  };
}

export function toClient(t: AdminTemplate): ClientTemplate {
  const { overlayKey: _overlayKey, ...rest } = t;
  void _overlayKey;
  return rest;
}

function isRowActive(r: TemplateRow): boolean {
  if (r.is_active === 1) return true;
  if (r.is_active === 0) return false;
  return r.published === 1;
}

async function getDB(): Promise<D1Database> {
  const env = await getEnv();
  return env.DB;
}

async function getBucket(): Promise<R2Bucket> {
  const env = await getEnv();
  return env.TEMPLATES_BUCKET;
}

export async function listPublishedTemplates(): Promise<ClientTemplate[]> {
  if (isD1Configured()) {
    const db = await getDB();
    const { results } = await db
      .prepare("SELECT * FROM templates WHERE is_active = 1 ORDER BY sort ASC")
      .all<TemplateRow>();
    return results.map(rowToAdmin).map(toClient);
  }
  const rows = (await readLocalRows()) as TemplateRow[];
  return rows
    .filter(isRowActive)
    .sort((a, b) => Number(a.sort) - Number(b.sort))
    .map(rowToAdmin)
    .map(toClient);
}

export async function listAllTemplates(): Promise<AdminTemplate[]> {
  if (isD1Configured()) {
    const db = await getDB();
    const { results } = await db.prepare("SELECT * FROM templates ORDER BY sort ASC").all<TemplateRow>();
    return results.map(rowToAdmin);
  }
  const rows = (await readLocalRows()) as TemplateRow[];
  return [...rows].sort((a, b) => Number(a.sort) - Number(b.sort)).map(rowToAdmin);
}

export async function getTemplate(id: string): Promise<AdminTemplate | null> {
  if (isD1Configured()) {
    const db = await getDB();
    const row = await db.prepare("SELECT * FROM templates WHERE id = ?").bind(id).first<TemplateRow>();
    return row ? rowToAdmin(row) : null;
  }
  const rows = (await readLocalRows()) as TemplateRow[];
  const row = rows.find((r) => r.id === id);
  return row ? rowToAdmin(row) : null;
}

export async function createTemplate(t: AdminTemplate): Promise<void> {
  if (isD1Configured()) {
    const db = await getDB();
    const row = adminToRow(t);
    await db
      .prepare(
        `INSERT INTO templates (id, name, canvas_w, canvas_h, slots_json, overlay_key, base_layer_key, bleed, background, published, is_active, usage_count, sort, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        row.id,
        row.name,
        row.canvas_w,
        row.canvas_h,
        row.slots_json,
        row.overlay_key,
        row.base_layer_key,
        row.bleed,
        row.background,
        row.published,
        row.is_active,
        row.usage_count,
        row.sort,
        row.created_at,
        row.updated_at
      )
      .run();
    return;
  }
  const rows = await readLocalRows();
  rows.push(adminToRow(t) as Record<string, unknown>);
  await writeLocalRows(rows);
}

export async function updateTemplate(id: string, patch: Partial<Omit<AdminTemplate, "id" | "createdAt">>): Promise<void> {
  const current = await getTemplate(id);
  if (!current) throw new Error("Template tidak ditemukan");
  const next: AdminTemplate = { ...current, ...patch, id, createdAt: current.createdAt, updatedAt: new Date().toISOString() };
  if (isD1Configured()) {
    const db = await getDB();
    const row = adminToRow(next);
    await db
      .prepare(
        `UPDATE templates SET name = ?, canvas_w = ?, canvas_h = ?, slots_json = ?, overlay_key = ?, base_layer_key = ?, bleed = ?, background = ?, published = ?, is_active = ?, usage_count = ?, sort = ?, updated_at = ? WHERE id = ?`
      )
      .bind(
        row.name,
        row.canvas_w,
        row.canvas_h,
        row.slots_json,
        row.overlay_key,
        row.base_layer_key,
        row.bleed,
        row.background,
        row.published,
        row.is_active,
        row.usage_count,
        row.sort,
        row.updated_at,
        row.id
      )
      .run();
    return;
  }
  const rows = await readLocalRows();
  const idx = rows.findIndex((r) => r.id === id);
  if (idx >= 0) {
    rows[idx] = adminToRow(next) as Record<string, unknown>;
    await writeLocalRows(rows);
  }
}

export async function deleteTemplate(id: string): Promise<void> {
  if (isD1Configured()) {
    const db = await getDB();
    await db.prepare("DELETE FROM templates WHERE id = ?").bind(id).run();
    return;
  }
  const rows = await readLocalRows();
  await writeLocalRows(rows.filter((r) => r.id !== id));
}

export async function reorderTemplates(idsInOrder: string[]): Promise<void> {
  const now = new Date().toISOString();
  if (isD1Configured()) {
    const db = await getDB();
    const stmt = db.prepare("UPDATE templates SET sort = ?, updated_at = ? WHERE id = ?");
    const batch = idsInOrder.map((id, i) => stmt.bind(i, now, id));
    await db.batch(batch);
    return;
  }
  const rows = await readLocalRows();
  const map = new Map(rows.map((r) => [r.id as string, r]));
  for (let i = 0; i < idsInOrder.length; i++) {
    const r = map.get(idsInOrder[i]);
    if (r) {
      r.sort = i;
      r.updated_at = now;
    }
  }
  await writeLocalRows(rows);
}

export async function putOverlay(key: string, buf: Buffer): Promise<void> {
  if (isR2Configured()) {
    const bucket = await getBucket();
    await bucket.put(key, buf, { httpMetadata: { contentType: "image/png" } });
    return;
  }
  await putLocalOverlay(key, buf);
}

export async function getOverlay(key: string): Promise<Buffer | null> {
  if (isR2Configured()) {
    const bucket = await getBucket();
    const obj = await bucket.get(key);
    if (!obj) return null;
    const ab = await obj.arrayBuffer();
    return Buffer.from(ab);
  }
  return getLocalOverlay(key);
}

export async function deleteOverlay(key: string): Promise<void> {
  if (isR2Configured()) {
    const bucket = await getBucket();
    await bucket.delete(key);
    return;
  }
  await deleteLocalOverlay(key);
}