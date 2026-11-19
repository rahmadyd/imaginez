import type { Template, Slot } from "../templates/schema";

/**
 * Opsi untuk renderStrip.
 */
export type RenderStripOptions = {
  /** Skala output (1 = ukuran asli template) */
  scale?: number;
  /** Kualitas untuk format JPEG (0-1) */
  quality?: number;
  /** Label tanggal (DD/MM/YYYY) digambar di kanan-bawah desain */
  dateLabel?: string;
  /** Layer bawah PNG utuh (opsional; diletakkan di atas background, di bawah foto) */
  baseLayer?: ImageBitmap | null;
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

/**
 * Render strip photobooth dari template, foto, dan overlay.
 * Urutan layer: background → foto per slot → overlay template di paling atas.
 * Transparansi/bolongan pada overlay menampakkan foto di bawahnya; overlay tidak ditimpa otomatis.
 * `photoPosition: "front"` membalik urutan: overlay digambar lebih dulu, foto di atasnya.
 */
export function renderStrip(
  template: Pick<Template, "canvas" | "slots" | "background"> & { bleed?: number; baseLayerKey?: string; photoPosition?: "behind" | "front" },
  photos: (ImageBitmap | null)[],
  overlay: ImageBitmap,
  options: RenderStripOptions = {}
): HTMLCanvasElement {
  if (photos.length !== template.slots.length) {
    throw new Error(
      `Jumlah foto (${photos.length}) tidak sama dengan jumlah slot (${template.slots.length})`
    );
  }

  const { scale = 1 } = options;
  const photoInFront = template.photoPosition === "front";
  // foto dirender sesuai ukuran slot agar tidak meluber menimpa area template
  const bleed = 0;

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(template.canvas.w * scale);
  canvas.height = Math.round(template.canvas.h * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Gagal membuat konteks 2D");
  }

  ctx.scale(scale, scale);
  ctx.fillStyle = template.background;
  ctx.fillRect(0, 0, template.canvas.w, template.canvas.h);

  const drawPhotos = () => {
    for (let i = 0; i < template.slots.length; i++) {
      const slot = template.slots[i];
      const photo = photos[i];
      if (!photo) continue;
      drawSlot(ctx, slot, photo, bleed, template.canvas.w, template.canvas.h);
    }
  };

  const drawOverlay = () => {
    // overlay PNG utuh di atas; area transparan menampakkan foto di belakang
    ctx.drawImage(overlay, 0, 0, template.canvas.w, template.canvas.h);
  };

  if (photoInFront) {
    drawOverlay();
    drawPhotos();
  } else {
    drawPhotos();
    drawOverlay();
  }

  const inset = Math.max(6, Math.round(Math.min(template.canvas.w, template.canvas.h) * 0.012));
  ctx.save();
  ctx.strokeStyle = "#C5A059";
  ctx.lineWidth = Math.max(2, Math.round(Math.min(template.canvas.w, template.canvas.h) * 0.003));
  ctx.strokeRect(inset, inset, template.canvas.w - inset * 2, template.canvas.h - inset * 2);
  ctx.restore();

  return canvas;
}

function drawSlot(
  ctx: CanvasRenderingContext2D,
  slot: Slot,
  photo: ImageBitmap,
  bleed: number,
  canvasW: number,
  canvasH: number
): void {
  const { x, y, w, h, rotate } = slot;
  const radius = (slot as Slot & { radius?: number }).radius ?? 0;

  const bL = Math.min(bleed, x);
  const bT = Math.min(bleed, y);
  const bR = Math.min(bleed, canvasW - (x + w));
  const bB = Math.min(bleed, canvasH - (y + h));
  const dw = w + bL + bR;
  const dh = h + bT + bB;
  const offX = (bR - bL) / 2;
  const offY = (bB - bT) / 2;

  ctx.save();
  ctx.translate(x + w / 2 + offX, y + h / 2 + offY);
  ctx.rotate((rotate * Math.PI) / 180);

  const coverScale = Math.max(dw / photo.width, dh / photo.height);
  const drawWidth = photo.width * coverScale;
  const drawHeight = photo.height * coverScale;

  roundedRectPath(ctx, -dw / 2, -dh / 2, dw, dh, radius + Math.min(bL, bT, bR, bB));
  ctx.clip();
  ctx.drawImage(photo, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
  ctx.restore();
}

/**
 * Helper untuk mengekspor canvas ke Blob.
 */
export async function exportBlob(
  canvas: HTMLCanvasElement,
  format: "png" | "jpeg" = "png",
  quality: number = 0.92
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Gagal membuat blob dari canvas"));
        }
      },
      format === "jpeg" ? "image/jpeg" : "image/png",
      format === "jpeg" ? quality : undefined
    );
  });
}

/**
 * Helper untuk mengunduh blob sebagai file.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Helper untuk share file via Web Share API (jika tersedia).
 */
export async function shareFile(
  blob: Blob,
  filename: string,
  title?: string
): Promise<boolean> {
  if (!navigator.share || !navigator.canShare) {
    return false;
  }

  const file = new File([blob], filename, {
    type: blob.type,
  });

  try {
    if (!navigator.canShare({ files: [file] })) {
      return false;
    }

    await navigator.share({
      files: [file],
      title: title || "Foto strip",
    });
    return true;
  } catch {
    return false;
  }
}
