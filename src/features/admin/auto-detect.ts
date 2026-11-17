export type DetectedSlot = { x: number; y: number; w: number; h: number; rotate: number; warning?: string };

function labelComponents(mask: Uint8Array, w: number, h: number): number[][] {
  const labels = new Int32Array(w * h).fill(-1);
  const comps: number[][] = [];
  let label = 0;
  const stack: number[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (mask[idx] === 0 || labels[idx] !== -1) continue;
      const pixels: number[] = [];
      labels[idx] = label;
      stack.push(idx);
      while (stack.length) {
        const cur = stack.pop()!;
        pixels.push(cur);
        const cx = cur % w;
        const cy = (cur / w) | 0;
        const nbs = [ [cx-1,cy],[cx+1,cy],[cx,cy-1],[cx,cy+1] ];
        for (const [nx, ny] of nbs) {
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const ni = ny * w + nx;
          if (mask[ni] === 1 && labels[ni] === -1) {
            labels[ni] = label;
            stack.push(ni);
          }
        }
      }
      comps.push(pixels);
      label++;
    }
  }
  return comps;
}

export function detectSlotsFromImageData(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  maxSide = 800
): DetectedSlot[] {
  const scaleDown = Math.min(1, maxSide / Math.max(width, height));
  const sw = Math.max(1, Math.round(width * scaleDown));
  const sh = Math.max(1, Math.round(height * scaleDown));

  // downscale mask by nearest sampling
  const mask = new Uint8Array(sw * sh);
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const sx = Math.min(width - 1, Math.floor(x / scaleDown));
      const sy = Math.min(height - 1, Math.floor(y / scaleDown));
      const alpha = data[(sy * width + sx) * 4 + 3];
      mask[y * sw + x] = alpha <= 16 ? 1 : 0;
    }
  }

  const comps = labelComponents(mask, sw, sh);
  const areaTotal = sw * sh;
  const boxes: { x: number; y: number; w: number; h: number; area: number; pixelCount: number }[] = [];
  for (const pixels of comps) {
    let minX = sw, minY = sh, maxX = -1, maxY = -1;
    for (const p of pixels) {
      const px = p % sw; const py = (p / sw) | 0;
      if (px < minX) minX = px; if (py < minY) minY = py;
      if (px > maxX) maxX = px; if (py > maxY) maxY = py;
    }
    const bw = maxX - minX + 1;
    const bh = maxY - minY + 1;
    const bboxArea = bw * bh;
    if (bboxArea < areaTotal * 0.015) continue;
    boxes.push({ x: minX, y: minY, w: bw, h: bh, area: bboxArea, pixelCount: pixels.length });
  }

  // reading order: top->bottom, left->right, row tolerance ~2% height
  const tol = Math.max(1, Math.round(sh * 0.02));
  boxes.sort((a,b)=>a.y-b.y);
  const rows: typeof boxes[] = [];
  for (const b of boxes) {
    let row = rows.find(r => Math.abs(r[0].y - b.y) <= tol);
    if (!row) { row = []; rows.push(row); }
    row.push(b);
  }
  for (const r of rows) r.sort((a,b)=>a.x-b.x);
  const ordered = rows.flat();

  const inv = 1 / scaleDown;
  return ordered.map(b => {
    const x = Math.round(b.x * inv);
    const y = Math.round(b.y * inv);
    const w = Math.round(b.w * inv);
    const h = Math.round(b.h * inv);
    const fill = b.pixelCount / b.area;
    const slot: DetectedSlot = { x, y, w, h, rotate: 0 };
    if (fill < 0.9) slot.warning = "Bentuk lubang tidak persegi, periksa manual.";
    return slot;
  });
}

export async function detectSlotsFromImage(img: HTMLImageElement | ImageBitmap, maxSide = 800): Promise<DetectedSlot[]> {
  const width = "naturalWidth" in img ? img.naturalWidth : img.width;
  const height = "naturalHeight" in img ? img.naturalHeight : img.height;
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no ctx");
  ctx.drawImage(img as CanvasImageSource, 0, 0);
  const imageData = ctx.getImageData(0, 0, width, height);
  return detectSlotsFromImageData(imageData.data, width, height, maxSide);
}
