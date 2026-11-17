export type ShareRecord = {
  id: string;
  storage_key: string;
  content_type: string;
  expires_at: string;
  created_at: string;
};

export async function insertShareRecord(): Promise<void> {
  throw new Error("Share feature not available in Cloudflare deployment");
}

export async function getShareRecord(): Promise<ShareRecord | null> {
  return null;
}

export async function deleteShareRecord(): Promise<void> {
  return;
}

export async function uploadShareObject(): Promise<void> {
  throw new Error("Share feature not available in Cloudflare deployment");
}

export async function downloadShareObject(): Promise<Buffer | null> {
  return null;
}

export async function removeShareObject(): Promise<void> {
  return;
}