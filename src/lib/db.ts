import fs from "fs/promises";
import path from "path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "templates.json");
const OVERLAY_DIR = path.join(DATA_DIR, "overlays");

type Row = Record<string, unknown>;

let supabase: SupabaseClient | null = null;

function getApiKey(): string | undefined {
  return process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && getApiKey());
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

export function getBucket(): string {
  return process.env.SUPABASE_STORAGE_BUCKET || "templates";
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