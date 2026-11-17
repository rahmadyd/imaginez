import { getCloudflareContext } from "@opennextjs/cloudflare";
import fs from "fs/promises";
import path from "path";

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  dump(): Promise<ArrayBuffer>;
  batch(statements: D1PreparedStatement[]): Promise<D1Result[]>;
  exec(query: string): Promise<D1Result>;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run(): Promise<D1Result>;
  all<T = unknown>(): Promise<D1Result<T>>;
  raw<T = unknown>(): Promise<T[]>;
}

export interface D1Result<T = unknown> {
  success: boolean;
  results: T[];
  meta: {
    duration: number;
    size_after: number;
    rows_read: number;
    rows_written: number;
  };
  error?: string;
}

export interface R2Bucket {
  put(key: string, value: ReadableStream | ArrayBuffer | ArrayBufferView | string, options?: R2PutOptions): Promise<R2Object | null>;
  get(key: string, options?: R2GetOptions): Promise<R2ObjectBody | null>;
  delete(key: string): Promise<void>;
  list(options?: R2ListOptions): Promise<R2Objects>;
}

export interface R2PutOptions {
  httpMetadata?: R2HTTPMetadata;
  customMetadata?: Record<string, string>;
}

export interface R2HTTPMetadata {
  contentType?: string;
  contentEncoding?: string;
  contentLanguage?: string;
  contentDisposition?: string;
  cacheControl?: string;
}

export interface R2GetOptions {
  onlyIf?: R2Condition;
  range?: R2Range;
}

export interface R2Condition {
  etagMatches?: string;
  etagDoesNotMatch?: string;
  uploadedBefore?: Date;
  uploadedAfter?: Date;
}

export interface R2Range {
  offset: number;
  length?: number;
}

export interface R2ObjectBody extends R2Object {
  body: ReadableStream;
  arrayBuffer(): Promise<ArrayBuffer>;
  text(): Promise<string>;
  json<T>(): Promise<T>;
  blob(): Promise<Blob>;
}

export interface R2Object {
  key: string;
  version: string;
  size: number;
  etag: string;
  httpMetadata: R2HTTPMetadata;
  customMetadata: Record<string, string>;
  uploaded: Date;
}

export interface R2ListOptions {
  prefix?: string;
  delimiter?: string;
  cursor?: string;
  maxKeys?: number;
}

export interface R2Objects {
  objects: R2Object[];
  truncated: boolean;
  cursor?: string;
}

export interface CloudflareEnv {
  DB: D1Database;
  TEMPLATES_BUCKET: R2Bucket;
}

let cachedEnv: CloudflareEnv | null = null;

export async function getEnv(): Promise<CloudflareEnv> {
  if (cachedEnv) return cachedEnv;
  const { env } = await getCloudflareContext({ async: true });
  cachedEnv = env as unknown as CloudflareEnv;
  return cachedEnv;
}

export function getEnvSync(): CloudflareEnv {
  if (cachedEnv) return cachedEnv;
  const { env } = getCloudflareContext({ async: false });
  cachedEnv = env as unknown as CloudflareEnv;
  return cachedEnv;
}

export function isD1Configured(): boolean {
  if (process.env.USE_LOCAL_FALLBACK === "true") return false;
  try {
    const env = getEnvSync();
    return !!env.DB;
  } catch {
    return false;
  }
}

export function isR2Configured(): boolean {
  if (process.env.USE_LOCAL_FALLBACK === "true") return false;
  try {
    const env = getEnvSync();
    return !!env.TEMPLATES_BUCKET;
  } catch {
    return false;
  }
}

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "templates.json");
const OVERLAY_DIR = path.join(DATA_DIR, "overlays");

type Row = Record<string, unknown>;

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