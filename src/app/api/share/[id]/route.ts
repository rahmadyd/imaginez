import { NextRequest, NextResponse } from "next/server";
import { deleteShareRecord, downloadShareObject, getShareRecord, removeShareObject } from "@/lib/share-store";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[a-f0-9]{16,64}$/i.test(id)) return new NextResponse("Not found", { status: 404 });
  const rec = await getShareRecord(id);
  if (!rec) return new NextResponse("Not found", { status: 404 });

  const expired = new Date(rec.expires_at).getTime() <= Date.now();
  if (expired) {
    try { await removeShareObject(rec.storage_key); } catch { /* ignore */ }
    try { await deleteShareRecord(id); } catch { /* ignore */ }
    return new NextResponse("Link expired", { status: 410 });
  }

  const buf = await downloadShareObject(rec.storage_key);
  if (!buf) {
    try { await deleteShareRecord(id); } catch { /* ignore */ }
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": rec.content_type || "image/png",
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="photobooth.${rec.content_type === "image/jpeg" ? "jpg" : "png"}"`,
    },
  });
}
