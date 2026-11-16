import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  seedTemplateSchema,
  type SeedTemplate,
} from "../../src/features/templates/schema";

// Helper untuk memeriksa slot dalam canvas
function isSlotInsideCanvas(slot: { x: number; y: number; w: number; h: number }, canvas: { w: number; h: number }): boolean {
  return (
    slot.x >= 0 &&
    slot.y >= 0 &&
    slot.x + slot.w <= canvas.w &&
    slot.y + slot.h <= canvas.h
  );
}

const seedDir = path.resolve(process.cwd(), "public/seed");

type DecodedPng = {
  width: number;
  height: number;
  alphaAt: (x: number, y: number) => number;
};

function decodePng(filePath: string): DecodedPng {
  const buf = fs.readFileSync(filePath);
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  expect(buf.subarray(0, 8)).toEqual(signature);

  const idatChunks: Buffer[] = [];
  let offset = 8;
  let width = 0;
  let height = 0;

  while (offset < buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString("ascii", offset + 4, offset + 8);
    const data = buf.subarray(offset + 8, offset + 8 + length);

    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      expect(data[8]).toBe(8); // kedalaman bit
      expect(data[9]).toBe(6); // RGBA
      expect(data[12]).toBe(0); // tanpa interlace
    } else if (type === "IDAT") {
      idatChunks.push(data);
    }

    offset += 12 + length;
  }

  const raw = zlib.inflateSync(Buffer.concat(idatChunks));
  const stride = 1 + width * 4;

  expect(raw.length).toBe(stride * height);

  for (let y = 0; y < height; y++) {
    expect(raw[y * stride]).toBe(0); // generator memakai filter None
  }

  return {
    width,
    height,
    alphaAt: (x, y) => raw[y * stride + 1 + x * 4 + 3],
  };
}

function loadSeed(id: string): { template: SeedTemplate; png: DecodedPng } {
  const template = seedTemplateSchema.parse(
    JSON.parse(fs.readFileSync(path.join(seedDir, `${id}.json`), "utf-8"))
  );
  const png = decodePng(path.join(seedDir, `${id}.png`));

  return { template, png };
}

describe.each([
  { id: "strip-1x6", canvas: { w: 1200, h: 3600 } },
  { id: "grid-2x3", canvas: { w: 1200, h: 1800 } },
])("seed $id", ({ id, canvas }) => {
  it("lolos validasi Zod dan semua slot berada di dalam canvas", () => {
    const { template } = loadSeed(id);

    expect(template.canvas).toEqual(canvas);
    expect(template.slots).toHaveLength(6);

    for (const slot of template.slots) {
      expect(isSlotInsideCanvas(slot, template.canvas)).toBe(true);
    }
  });

  it("PNG transparan pada area slot dan pejal pada bingkai", () => {
    const { template, png } = loadSeed(id);

    expect({ w: png.width, h: png.height }).toEqual(template.canvas);
    expect(png.alphaAt(0, 0)).toBe(255);

    for (const slot of template.slots) {
      const cx = Math.floor(slot.x + slot.w / 2);
      const cy = Math.floor(slot.y + slot.h / 2);
      expect(png.alphaAt(cx, cy)).toBe(0);
    }
  });
});
