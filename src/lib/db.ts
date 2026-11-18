import fs from "fs/promises";
import path from "path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const DATA_DIR = process.env.IMAGINEZ_DATA_DIR || path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "templates.json");
const OVERLAY_DIR = path.join(DATA_DIR, "overlays");

type Row = Record<string, unknown>;

let supabase: SupabaseClient | null = null;
let authClient: SupabaseClient | null = null;

export type ColumnInfo = { type?: string; format?: string };
export type ColumnSchema = Record<string, ColumnInfo>;

let columnSchemaPromise: Promise<ColumnSchema | null> | null = null;

function getApiKey(): string | undefined {
  return process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
}

function getAuthKey(): string | undefined {
  return process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && getApiKey());
}

export function isAuthConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && getAuthKey());
}

export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured()) throw new Error("Supabase not configured");
  if (!supabase) {
    supabase = createClient(
      process.env.SUPABASE_URL!,
      getApiKey()!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
  }
  return supabase;
}

export function getAuthClient(): SupabaseClient {
  if (!isAuthConfigured()) throw new Error("Supabase Auth not configured");
  if (!authClient) {
    authClient = createClient(
      process.env.SUPABASE_URL!,
      getAuthKey()!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
  }
  return authClient;
}

export function getBucket(): string {
  return process.env.SUPABASE_STORAGE_BUCKET || "templates";
}

async function fetchTemplateColumnSchema(): Promise<ColumnSchema | null> {
  const url = process.env.SUPABASE_URL;
  const key = getApiKey();
  if (!url || !key) return null;
  try {
    const res = await fetch(`${url}/rest/v1/`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: "application/openapi+json",
      },
    });
    if (!res.ok) return null;
    const spec = (await res.json()) as {
      definitions?: Record<string, { properties?: Record<string, ColumnInfo> }>;
    };
    const properties = spec.definitions?.templates?.properties;
    if (!properties) return null;
    const schema: ColumnSchema = {};
    for (const [name, info] of Object.entries(properties)) schema[name] = info;
    return schema;
  } catch {
    return null;
  }
}

export async function getTemplateColumnSchema(): Promise<ColumnSchema> {
  if (!columnSchemaPromise) columnSchemaPromise = fetchTemplateColumnSchema();
  const schema = await columnSchemaPromise;
  if (!schema) {
    columnSchemaPromise = null;
    return {};
  }
  return schema;
}

export function resetTemplateColumnSchema(): void {
  columnSchemaPromise = null;
}

async function ensureData() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(OVERLAY_DIR, { recursive: true });
  try { await fs.access(DB_FILE); } catch { await fs.writeFile(DB_FILE, "[]", "utf8"); }
}

export async function readLocalRows(): Promise<Row[]> {
  await ensureData();
  const raw = await fs.readFile(DB_FILE, "utf8");
  return JSON.parse(raw) as Row[];
}

export async function writeLocalRows(rows: Row[]) {
  await ensureData();
  await fs.writeFile(DB_FILE, JSON.stringify(rows, null, 2), "utf8");
}

export async function putLocalOverlay(key: string, buf: Buffer) {
  await ensureData();
  const file = path.join(OVERLAY_DIR, key.replace(/[^a-zA-Z0-9._-]/g, "_"));
  await fs.writeFile(file, buf);
}

export async function getLocalOverlay(key: string): Promise<Buffer | null> {
  const file = path.join(OVERLAY_DIR, key.replace(/[^a-zA-Z0-9._-]/g, "_"));
  try { return await fs.readFile(file); } catch { return null; }
}

export async function deleteLocalOverlay(key: string) {
  const file = path.join(OVERLAY_DIR, key.replace(/[^a-zA-Z0-9._-]/g, "_"));
  try { await fs.unlink(file); } catch { /* ignore */ }
}