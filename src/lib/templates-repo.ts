import type { AdminTemplate, ClientTemplate, Slot } from "@/features/templates/schema";
import { getBucket, getSupabase, getTemplateColumnSchema, isSupabaseConfigured, readLocalRows, writeLocalRows, putLocalOverlay, getLocalOverlay, deleteLocalOverlay, type ColumnInfo, type ColumnSchema } from "./db";

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

function isIntegerColumn(info: ColumnInfo | undefined): boolean {
  return info?.type === "integer" || info?.type === "number";
}

export function buildTemplateRow(t: AdminTemplate, schema: ColumnSchema): Record<string, unknown> {
  const row: Record<string, unknown> = adminToRow(t);
  const known = Object.keys(schema).length > 0;
  if (!known) return row;
  for (const key of Object.keys(row)) {
    if (!(key in schema)) delete row[key];
  }
  if (isIntegerColumn(schema.published)) row.published = t.published ? 1 : 0;
  if (isIntegerColumn(schema.is_active)) row.is_active = t.isActive ? 1 : 0;
  return row;
}

export function adaptRowFromError(
  row: Record<string, unknown>,
  error: { code?: string; message?: string }
): Record<string, unknown> | null {
  const message = error.message || "";
  const next = { ...row };
  const missing = message.match(/Could not find the '([^']+)' column/);
  if (missing && missing[1] in next) {
    delete next[missing[1]];
    return next;
  }
  if (error.code === "22P02" || error.code === "42804") {
    if ("published" in next && typeof next.published === "boolean") {
      next.published = next.published ? 1 : 0;
      return next;
    }
    if ("is_active" in next && typeof next.is_active === "boolean") {
      next.is_active = next.is_active ? 1 : 0;
      return next;
    }
  }
  return null;
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
    const schema = await getTemplateColumnSchema();
    const known = Object.keys(schema).length > 0;
    const column = known && !schema.is_active ? "published" : "is_active";
    const value = isIntegerColumn(schema[column]) ? 1 : true;
    const { data, error } = await getSupabase()
      .from("templates")
      .select("*")
      .eq(column, value)
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
    const schema = await getTemplateColumnSchema();
    let row = buildTemplateRow(t, schema);
    let lastMessage = "Gagal menyimpan template ke database.";
    for (let attempt = 0; attempt < 4; attempt++) {
      const { error } = await getSupabase().from("templates").insert(row);
      if (!error) return;
      lastMessage = error.message || lastMessage;
      const adapted = adaptRowFromError(row, error);
      if (!adapted) break;
      row = adapted;
    }
    throw new Error(lastMessage);
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
    const schema = await getTemplateColumnSchema();
    const full = buildTemplateRow(next, schema);
    const { id: _id, created_at: _ca, ...rest } = full;
    void _id; void _ca;
    let row = rest;
    let lastMessage = "Gagal memperbarui template di database.";
    for (let attempt = 0; attempt < 4; attempt++) {
      const { error } = await getSupabase().from("templates").update(row).eq("id", id);
      if (!error) return;
      lastMessage = error.message || lastMessage;
      const adapted = adaptRowFromError(row, error);
      if (!adapted) break;
      row = adapted;
    }
    throw new Error(lastMessage);
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