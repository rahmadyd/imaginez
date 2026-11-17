export type PngValidation = { ok: true; width: number; height: number } | { ok: false; error: string };

const PNG_SIG = [137, 80, 78, 71, 13, 10, 26, 10];

export function validatePngBuffer(buf: Buffer): PngValidation {
  if (buf.length < 8 + 25) return { ok: false, error: "File terlalu kecil atau rusak." };
  for (let i = 0; i < 8; i++) if (buf[i] !== PNG_SIG[i]) return { ok: false, error: "File harus PNG." };
  // IHDR chunk
  const ihdrLen = buf.readUInt32BE(8);
  const ihdrType = buf.toString("ascii", 12, 16);
  if (ihdrType !== "IHDR" || ihdrLen < 13) return { ok: false, error: "PNG tidak valid." };
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const colorType = buf[25];
  if (width <= 0 || height <= 0 || width > 4000 || height > 6000) return { ok: false, error: "Dimensi PNG maksimal 4000x6000 px." };
  // colorType 6 = RGBA, 4 = grayscale+alpha
  if (colorType !== 6 && colorType !== 4) return { ok: false, error: "PNG harus memiliki kanal alpha (transparan)." };
  if (buf.length > 8 * 1024 * 1024) return { ok: false, error: "Ukuran file maksimal 8 MB." };
  return { ok: true, width, height };
}
