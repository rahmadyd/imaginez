import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { listPublishedTemplates } from "@/lib/templates-repo";

async function loadSeeds() {
  const seedDir = path.join(process.cwd(), "public", "seed");
  const files = await fs.readdir(seedDir);
  const jsonFiles = files.filter((f) => f.endsWith(".json"));
  const templates = await Promise.all(
    jsonFiles.map(async (f) => {
      const raw = await fs.readFile(path.join(seedDir, f), "utf8");
      const t = JSON.parse(raw) as { sort?: number; overlayKey?: string; published?: boolean; [key: string]: unknown };
      const { overlayKey: _overlayKey, ...rest } = t;
      void _overlayKey;
      return {
        ...rest,
        isActive: t.published ?? true,
        usageCount: 0,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      };
    })
  );
  templates.sort((a, b) => ((a.sort as number | undefined) ?? 0) - ((b.sort as number | undefined) ?? 0));
  return templates;
}

export async function GET() {
  try {
    const published = await listPublishedTemplates();
    if (published.length > 0) {
      return NextResponse.json({ templates: published });
    }
  } catch {
    // fall back to seeds
  }
  const templates = await loadSeeds();
  return NextResponse.json({ templates: templates.filter((t) => (t as { isActive?: boolean }).isActive !== false) });
}
