import type { AdminTemplate, ClientTemplate, Slot } from "@/features/templates/schema";
import { getBucket, getSupabase, isSupabaseConfigured, readLocalRows, writeLocalRows, putLocalOverlay, getLocalOverlay, deleteLocalOverlay } from "./db";

type LocalRow = Record<string, unknown>;

type TemplateRow = {
  id: string;
  name: string;
  canvas_w: number;
  canvas_h: number;
  slots_json: string | Slot[];
  overlay_key: string;
  base_layer_key?: string | null;
  bleed?: number | null;
  background: string;
  published: boolean | number;
  is_active?: boolean | number | null;
  usage_count?: number | null;
  sort: number;
  created_at: string;
  updated_at: string;
};

function rowToAdmin(row: TemplateRow): AdminTemplate {
  const slots = typeof row.slots_json === "string" ? (JSON.parse(row.slots_json) as Slot[]) : row.slots_json;
  const published = row.published === true || row.published === 1;
  const isActive = row.is_active === true || row.is_active === 1 || (row.is_active == null && published);
  return {
    id: row.id,
    name: row.name,
    canvas: { w: Number(row.canvas_w), h: Number(row.canvas_h) },
    slots,
    overlayKey: row.overlay_key,
    baseLayerKey: row.base_layer_key ?? undefined,
    bleed: Number(row.bleed ?? 0),
    background: row.background,
    published,
    isActive,
    usageCount: Number(row.usage_count ?? 0),
    sort: Number(row.sort),
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
    slots_json: t.slots,
    overlay_key: t.overlayKey,
    base_layer_key: t.baseLayerKey ?? null,
    bleed: t.bleed ?? 0,
    background: t.background,
    published: t.published,
    is_active: t.isActive,
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
  if (r.is_active === true || r.is_active === 1) return true;
  if (r.is_active === false || r.is_active === 0) return false;
  return r.published === true || r.published === 1;
}

export async function listPublishedTemplates(): Promise<ClientTemplate[]> {
  if (isSupabaseConfigured()) {
    const { data, error } = await getSupabase()
      .from("templates")
      .select("*")
      .eq("is_active", true)
      .order("sort", { ascending: true });
    if (error) throw error;
    return (data as TemplateRow[]).map(rowToAdmin).map(toClient);
  }
  const rows = (await readLocalRows()) as TemplateRow[];
  return rows
    .filter(isRowActive)
    .sort((a, b) => Number(a.sort) - Number(b.sort))
    .map(rowToAdmin)
    .map(toClient);
}

export async function listAllTemplates(): Promise<AdminTemplate[]> {
  if (isSupabaseConfigured()) {
    const { data, error } = await getSupabase().from("templates").select("*").order("sort", { ascending: true });
    if (error) throw error;
    return (data as TemplateRow[]).map(rowToAdmin);
  }
  const rows = (await readLocalRows()) as TemplateRow[];
  return [...rows].sort((a, b) => Number(a.sort) - Number(b.sort)).map(rowToAdmin);
}

export async function getTemplate(id: string): Promise<AdminTemplate | null> {
  if (isSupabaseConfigured()) {
    const { data, error } = await getSupabase().from("templates").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? rowToAdmin(data as TemplateRow) : null;
  }
  const rows = (await readLocalRows()) as TemplateRow[];
  const row = rows.find((r) => r.id === id);
  return row ? rowToAdmin(row) : null;
}

export async function createTemplate(t: AdminTemplate): Promise<void> {
  if (isSupabaseConfigured()) {
    const { error } = await getSupabase().from("templates").insert(adminToRow(t));
    if (error) throw error;
    return;
  }
  const rows = await readLocalRows();
  rows.push(adminToRow(t) as LocalRow);
  await writeLocalRows(rows);
}

export async function updateTemplate(id: string, patch: Partial<Omit<AdminTemplate, "id" | "createdAt">>): Promise<void> {
  const current = await getTemplate(id);
  if (!current) throw new Error("Template tidak ditemukan");
  const next: AdminTemplate = { ...current, ...patch, id, createdAt: current.createdAt, updatedAt: new Date().toISOString() };
  if (isSupabaseConfigured()) {
    const row = adminToRow(next);
    const { id: _id, created_at: _ca, ...rest } = row;
    void _id; void _ca;
    const { error } = await getSupabase().from("templates").update(rest).eq("id", id);
    if (error) throw error;
    return;
  }
  const rows = await readLocalRows();
  const idx = rows.findIndex((r) => r.id === id);
  if (idx >= 0) {
    rows[idx] = adminToRow(next) as LocalRow;
    await writeLocalRows(rows);
  }
}

export async function deleteTemplate(id: string): Promise<void> {
  if (isSupabaseConfigured()) {
    const { error } = await getSupabase().from("templates").delete().eq("id", id);
    if (error) throw error;
    return;
  }
  const rows = await readLocalRows();
  await writeLocalRows(rows.filter((r) => r.id !== id));
}

export async function reorderTemplates(idsInOrder: string[]): Promise<void> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    const supabase = getSupabase();
    for (let i = 0; i < idsInOrder.length; i++) {
      const { error } = await supabase.from("templates").update({ sort: i, updated_at: now }).eq("id", idsInOrder[i]);
      if (error) throw error;
    }
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
  if (isSupabaseConfigured()) {
    const { error } = await getSupabase().storage.from(getBucket()).upload(key, buf, { contentType: "image/png", upsert: true });
    if (error) throw error;
    return;
  }
  await putLocalOverlay(key, buf);
}

export async function getOverlay(key: string): Promise<Buffer | null> {
  if (isSupabaseConfigured()) {
    const { data, error } = await getSupabase().storage.from(getBucket()).download(key);
    if (error || !data) return null;
    const ab = await data.arrayBuffer();
    return Buffer.from(ab);
  }
  return getLocalOverlay(key);
}

export async function deleteOverlay(key: string): Promise<void> {
  if (isSupabaseConfigured()) {
    await getSupabase().storage.from(getBucket()).remove([key]);
    return;
  }
  await deleteLocalOverlay(key);
}
