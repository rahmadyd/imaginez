import { describe, expect, it, beforeEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import { createTemplate, listAllTemplates, listPublishedTemplates, getTemplate, updateTemplate, deleteTemplate, reorderTemplates } from "../../src/lib/templates-repo";
import { validatePngBuffer } from "../../src/lib/png";
import type { AdminTemplate } from "../../src/features/templates/schema";

const dataDir = path.join(process.cwd(), "data");

function makeTemplate(id: string, sort: number, published: boolean): AdminTemplate {
  const now = "2026-01-01T00:00:00.000Z";
  return {
    id,
    name: `T ${id}`,
    canvas: { w: 1200, h: 1800 },
    slots: [{ x: 10, y: 10, w: 100, h: 100, rotate: 0, radius: 0 }],
    overlayKey: `${id}.png`,
    bleed: 0,
    background: "#ffffff",
    published,
    isActive: published,
    usageCount: 0,
    sort,
    createdAt: now,
    updatedAt: now,
  };
}

describe("templates repo (local fallback)", () => {
  beforeEach(async () => {
    await fs.rm(dataDir, { recursive: true, force: true });
  });

  it("create, list all, list published, get, update, delete, reorder", async () => {
    await createTemplate(makeTemplate("a", 1, true));
    await createTemplate(makeTemplate("b", 0, false));
    await createTemplate(makeTemplate("c", 2, true));

    const all = await listAllTemplates();
    expect(all.map(t => t.id)).toEqual(["b", "a", "c"]);
    const pub = await listPublishedTemplates();
    expect(pub.map(t => t.id)).toEqual(["a", "c"]);
    expect(pub[0]).not.toHaveProperty("overlayKey");

    const got = await getTemplate("b");
    expect(got?.name).toBe("T b");

    await updateTemplate("b", { name: "Updated", published: true, isActive: true });
    const got2 = await getTemplate("b");
    expect(got2?.name).toBe("Updated");
    expect(got2?.published).toBe(true);

    await reorderTemplates(["c", "b", "a"]);
    const all2 = await listAllTemplates();
    expect(all2.map(t => t.id)).toEqual(["c", "b", "a"]);

    await deleteTemplate("a");
    expect(await getTemplate("a")).toBeNull();
  });
});

describe("validatePngBuffer", () => {
  it("rejects non-png and invalid", () => {
    expect(validatePngBuffer(Buffer.from("hello")).ok).toBe(false);
  });
  it("accepts valid RGBA png (minimal crafted)", () => {
    const png = Buffer.from([
      137,80,78,71,13,10,26,10,
      0,0,0,13,73,72,68,82, 0,0,0,1,0,0,0,1,8,6,0,0,0, 31,21,196,137,
      0,0,0,10,73,68,65,84,120,156,99,250,15,0,0,1,0,1,0,24,221,142,175,
      0,0,0,0,73,69,78,68,174,66,96,130
    ]);
    const res = validatePngBuffer(png);
    expect(res.ok).toBe(true);
    if (res.ok) { expect(res.width).toBe(1); expect(res.height).toBe(1); }
  });
  it("rejects png without alpha (RGB color type 2)", () => {
    const png = Buffer.from([
      137,80,78,71,13,10,26,10,
      0,0,0,13,73,72,68,82, 0,0,0,1,0,0,0,1,8,2,0,0,0, 144,119,83,222,
      0,0,0,12,73,68,65,84,120,156,99,248,15,0,1,1,1,0,197,251,227,251,
      0,0,0,0,73,69,78,68,174,66,96,130
    ]);
    const res = validatePngBuffer(png);
    expect(res.ok).toBe(false);
  });
});
