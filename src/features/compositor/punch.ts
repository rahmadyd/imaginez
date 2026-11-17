import type { Slot } from "../templates/schema";

export type PunchOptions = {
  canvas?: HTMLCanvasElement;
};

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  if (rr === 0) {
    ctx.rect(x, y, w, h);
    return;
  }
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

export function punchSlots(
  source: CanvasImageSource,
  slots: Slot[],
  width: number,
  height: number,
  opts: PunchOptions = {}
): HTMLCanvasElement {
  const canvas = opts.canvas ?? document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Gagal membuat konteks 2D");
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(source, 0, 0, width, height);
  ctx.globalCompositeOperation = "destination-out";
  for (const slot of slots) {
    const r = (slot as Slot & { radius?: number }).radius ?? 0;
    ctx.save();
    ctx.translate(slot.x + slot.w / 2, slot.y + slot.h / 2);
    ctx.rotate((slot.rotate * Math.PI) / 180);
    roundedRectPath(ctx, -slot.w / 2, -slot.h / 2, slot.w, slot.h, r);
    ctx.fill();
    ctx.restore();
  }
  ctx.globalCompositeOperation = "source-over";
  return canvas;
}
