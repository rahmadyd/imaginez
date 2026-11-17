import { getBucket, getSupabase, isSupabaseConfigured } from "./db";

export type ShareRecord = {
  id: string;
  storage_key: string;
  content_type: string;
  expires_at: string;
  created_at: string;
};

export async function insertShareRecord(rec: ShareRecord): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error("Supabase not configured");
  const { error } = await getSupabase().from("photo_shares").insert(rec);
  if (error) throw error;
}

export async function getShareRecord(id: string): Promise<ShareRecord | null> {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await getSupabase().from("photo_shares").select("id,storage_key,content_type,expires_at,created_at").eq("id", id).maybeSingle();
  if (error || !data) return null;
  return data as ShareRecord;
}

export async function deleteShareRecord(id: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  await getSupabase().from("photo_shares").delete().eq("id", id);
}

export async function uploadShareObject(key: string, body: Buffer, contentType: string): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error("Supabase not configured");
  const { error } = await getSupabase().storage.from(getBucket()).upload(key, body, { contentType, upsert: true });
  if (error) throw error;
}

export async function downloadShareObject(key: string): Promise<Buffer | null> {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await getSupabase().storage.from(getBucket()).download(key);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

export async function removeShareObject(key: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  await getSupabase().storage.from(getBucket()).remove([key]);
}
