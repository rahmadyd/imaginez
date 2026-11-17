export function wipeBitmaps(photos: (ImageBitmap | null)[]): void {
  for (const photo of photos) {
    if (photo) {
      try {
        photo.close();
      } catch {
        // sudah ditutup
      }
    }
  }
}

export function revokeUrls(urls: string[]): void {
  for (const url of urls) {
    if (url.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // sudah dicabut
      }
    }
  }
}

export function clearCanvases(canvases: HTMLCanvasElement[]): void {
  for (const canvas of canvases) {
    try {
      canvas.width = 0;
      canvas.height = 0;
    } catch {
      // canvas mungkin sudah terlepas
    }
  }
}

export function stopMediaStream(stream: MediaStream | null | undefined): void {
  if (!stream) return;
  for (const track of stream.getTracks()) {
    try {
      track.stop();
    } catch {
      // track mungkin sudah berhenti
    }
  }
}

export type WipeTargets = {
  photos?: (ImageBitmap | null)[];
  blobUrls?: string[];
  canvases?: HTMLCanvasElement[];
  stream?: MediaStream | null;
};

export function wipe(targets: WipeTargets): void {
  wipeBitmaps(targets.photos ?? []);
  revokeUrls(targets.blobUrls ?? []);
  clearCanvases(targets.canvases ?? []);
  stopMediaStream(targets.stream ?? null);
}
