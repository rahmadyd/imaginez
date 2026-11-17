import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { seedTemplateSchema, type Slot, type SeedTemplate } from "../src/features/templates/schema";

// Standard CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type: string, data: Buffer): Buffer {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const toCrc = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(toCrc), 0);

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

/**
 * Membuat file PNG dengan frame solid dan area slot transparan (alpha = 0).
 */
function createOverlayPng(
  width: number,
  height: number,
  slots: Slot[],
  frameColor: [number, number, number, number] = [243, 236, 221, 255] // #F3ECDD (--paper)
): Buffer {
  const rowStride = 1 + width * 4;
  const raw = Buffer.alloc(rowStride * height);

  // 1. Isi seluruh area dengan warna frame
  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowStride;
    raw[rowOffset] = 0; // Filter byte: 0 (None)
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      raw[pxOffset] = frameColor[0];
      raw[pxOffset + 1] = frameColor[1];
      raw[pxOffset + 2] = frameColor[2];
      raw[pxOffset + 3] = frameColor[3];
    }
  }

  // 2. Buat lubang transparan (alpha = 0) untuk setiap slot
  for (const slot of slots) {
    const xStart = Math.max(0, Math.floor(slot.x));
    const yStart = Math.max(0, Math.floor(slot.y));
    const xEnd = Math.min(width, Math.ceil(slot.x + slot.w));
    const yEnd = Math.min(height, Math.ceil(slot.y + slot.h));

    for (let y = yStart; y < yEnd; y++) {
      const rowOffset = y * rowStride;
      for (let x = xStart; x < xEnd; x++) {
        const pxOffset = rowOffset + 1 + x * 4;
        raw[pxOffset] = 0;
        raw[pxOffset + 1] = 0;
        raw[pxOffset + 2] = 0;
        raw[pxOffset + 3] = 0; // transparan penuh
      }
    }
  }

  // 3. Bangun chunk PNG
  const signature = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth: 8
  ihdr[9] = 6; // color type: 6 (RGBA)
  ihdr[10] = 0; // compression: deflate
  ihdr[11] = 0; // filter: standard
  ihdr[12] = 0; // interlace: none

  const idat = zlib.deflateSync(raw, { level: 6 });

  return Buffer.concat([
    signature,
    makeChunk("IHDR", ihdr),
    makeChunk("IDAT", idat),
    makeChunk("IEND", Buffer.alloc(0)),
  ]);
}

const strip1x6Template: SeedTemplate = {
  id: "strip-1x6",
  name: "Strip Klasik 1A-6",
  canvas: { w: 1200, h: 3600 },
  slots: [
    { x: 80, y: 80, w: 1040, h: 520, rotate: 0, radius: 0 },
    { x: 80, y: 648, w: 1040, h: 520, rotate: 0, radius: 0 },
    { x: 80, y: 1216, w: 1040, h: 520, rotate: 0, radius: 0 },
    { x: 80, y: 1784, w: 1040, h: 520, rotate: 0, radius: 0 },
    { x: 80, y: 2352, w: 1040, h: 520, rotate: 0, radius: 0 },
    { x: 80, y: 2920, w: 1040, h: 520, rotate: 0, radius: 0 },
  ],
  overlayKey: "strip-1x6.png",
  bleed: 0,
  background: "#ffffff",
  published: true,
  isActive: true,
  usageCount: 0,
  sort: 1,
};

const grid2x3Template: SeedTemplate = {
  id: "grid-2x3",
  name: "Grid Retro 2A-3",
  canvas: { w: 1200, h: 1800 },
  slots: [
    { x: 75, y: 80, w: 500, h: 480, rotate: 0, radius: 0 },
    { x: 625, y: 80, w: 500, h: 480, rotate: 0, radius: 0 },
    { x: 75, y: 640, w: 500, h: 480, rotate: 0, radius: 0 },
    { x: 625, y: 640, w: 500, h: 480, rotate: 0, radius: 0 },
    { x: 75, y: 1200, w: 500, h: 480, rotate: 0, radius: 0 },
    { x: 625, y: 1200, w: 500, h: 480, rotate: 0, radius: 0 },
  ],
  overlayKey: "grid-2x3.png",
  bleed: 0,
  background: "#ffffff",
  published: true,
  isActive: true,
  usageCount: 0,
  sort: 2,
};

export function generateSeeds(
  outDir: string = path.resolve(__dirname, "../public/seed")
) {
  // Validasi kedua template dengan Zod sebelum ditulis
  seedTemplateSchema.parse(strip1x6Template);
  seedTemplateSchema.parse(grid2x3Template);

  fs.mkdirSync(outDir, { recursive: true });

  // Tulis strip 1×6
  const stripPng = createOverlayPng(
    strip1x6Template.canvas.w,
    strip1x6Template.canvas.h,
    strip1x6Template.slots
  );
  fs.writeFileSync(path.join(outDir, "strip-1x6.png"), stripPng);
  fs.writeFileSync(
    path.join(outDir, "strip-1x6.json"),
    JSON.stringify(strip1x6Template, null, 2),
    "utf-8"
  );

  // Tulis grid 2×3
  const gridPng = createOverlayPng(
    grid2x3Template.canvas.w,
    grid2x3Template.canvas.h,
    grid2x3Template.slots
  );
  fs.writeFileSync(path.join(outDir, "grid-2x3.png"), gridPng);
  fs.writeFileSync(
    path.join(outDir, "grid-2x3.json"),
    JSON.stringify(grid2x3Template, null, 2),
    "utf-8"
  );

  process.stdout.write(`Seed templates berhasil digenerate di ${outDir}\n`);
}

// Guard berbasis argv agar modul ini tetap bisa diimpor oleh test.
if (process.argv[1]?.endsWith("make-seed.ts")) {
  generateSeeds();
}
