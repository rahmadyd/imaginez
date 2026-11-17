import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { getTemplate, getOverlay } from "@/lib/templates-repo";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    return new NextResponse("Not found", { status: 404 });
  }
  const layer = req.nextUrl.searchParams.get("layer");

  try {
    const tpl = await getTemplate(id);
    if (tpl) {
      const key = layer === "base" ? tpl.baseLayerKey : tpl.overlayKey;
      if (layer === "base" && !key) return new NextResponse("Not found", { status: 404 });
      if (key) {
        const buf = await getOverlay(key);
        if (buf) {
          return new NextResponse(new Uint8Array(buf), {
            headers: {
              "Content-Type": "image/png",
              "Cache-Control": "public, max-age=3600",
            },
          });
        }
      }
    }
  } catch {
    // fall through to seed
  }

  if (layer === "base") return new NextResponse("Not found", { status: 404 });
  const filePath = path.join(process.cwd(), "public", "seed", `${id}.png`);
  try {
    const data = await fs.readFile(filePath);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
