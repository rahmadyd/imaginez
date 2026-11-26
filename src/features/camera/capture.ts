/**
 * Opsi untuk captureFrame.
 */
export type CaptureOptions = {
  /** Cerminkan hasil secara horizontal, mengikuti tampilan preview saat jepret ditekan */
  mirror?: boolean;
  /** Terapkan beauty filter "flawless" (smoothing + brightening) */
  flawless?: boolean;
};

/**
 * CropRect – area sumber video yang dipakai untuk satu hasil capture.
 */
export type CropRect = {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
};

/**
 * coverCropRect – menghitung area video yang terlihat setelah di-crop center
 * mengikuti rasio target (sama dengan `object-fit: cover` + `object-position: center`).
 *
 * Fungsi murni: dipakai bersama oleh preview (CSS object-cover) dan capture
 * (canvas drawImage) supaya area yang terlihat identik dengan hasil jepretan.
 */
export function coverCropRect(sourceW: number, sourceH: number, targetAspect: number): CropRect {
  const sourceAspect = sourceW / sourceH;
  let sw: number;
  let sh: number;
  if (sourceAspect > targetAspect) {
    sh = sourceH;
    sw = sh * targetAspect;
  } else {
    sw = sourceW;
    sh = sw / targetAspect;
  }
  return {
    sx: (sourceW - sw) / 2,
    sy: (sourceH - sh) / 2,
    sw,
    sh,
  };
}

/**
 * captureFrame – menangkap satu frame dari video, dipotong sesuai rasio target,
 * lalu dibatasi ukuran maksimum.
 *
 * @param video Elemen video yang sedang memutar stream kamera
 * @param targetAspect Rasio aspek target (width / height) yang diinginkan
 * @param maxSide Sisi terpanjang maksimum untuk hasil (default 1920)
 * @param options Opsi tambahan (mis. `mirror` mengikuti tampilan preview)
 * @returns Promise<ImageBitmap> yang sudah terpotong sesuai rasio dan dibatasi ukuran
 *
 * Aturan:
 * - Center‑crop dari area video yang tersedia.
 * - Hasil selalu berorientasi landscape (width ≥ height).
 * - Jika rasio video lebih lebar dari target, crop vertikal.
 * - Jika rasio video lebih tinggi dari target, crop horizontal.
 * - Setelah crop, skala sehingga sisi terpanjang ≤ maxSide, pertahankan rasio.
 * - Memori: ImageBitmap langsung siap untuk canvas tanpa decode ulang.
 */
async function ensureVideoReady(video: HTMLVideoElement, timeoutMs = 2500): Promise<void> {
  const ready = () => video.videoWidth > 0 && video.videoHeight > 0;
  if (ready()) return;
  if (video.paused) {
    try { await video.play(); } catch { /* ignore */ }
  }
  await new Promise<void>((resolve, reject) => {
    const done = () => {
      if (ready()) {
        cleanup();
        resolve();
      }
    };
    const onFail = () => {
      cleanup();
      if (ready()) { resolve(); return; }
      reject(new Error("Video belum memiliki dimensi yang valid"));
    };
    const cleanup = () => {
      video.removeEventListener("loadedmetadata", done);
      video.removeEventListener("loadeddata", done);
      video.removeEventListener("playing", done);
      video.removeEventListener("resize", done);
      clearTimeout(timer);
    };
    const timer = setTimeout(onFail, timeoutMs);
    video.addEventListener("loadedmetadata", done);
    video.addEventListener("loadeddata", done);
    video.addEventListener("playing", done);
    video.addEventListener("resize", done);
    done();
  });
}

export async function captureFrame(
  video: HTMLVideoElement,
  targetAspect: number,
  maxSide: number = 1920,
  options: CaptureOptions = {}
): Promise<ImageBitmap> {
  await ensureVideoReady(video);

  const videoWidth = video.videoWidth;
  const videoHeight = video.videoHeight;

  const { sx: cropX, sy: cropY, sw: cropWidth, sh: cropHeight } = coverCropRect(videoWidth, videoHeight, targetAspect);

  // Buat canvas untuk memotong
  const cropCanvas = document.createElement("canvas");
  cropCanvas.width = cropWidth;
  cropCanvas.height = cropHeight;
  const cropCtx = cropCanvas.getContext("2d");
  if (!cropCtx) {
    throw new Error("Gagal membuat konteks 2D untuk crop");
  }

  // Gambar area video yang dipotong ke canvas
  cropCtx.save();
  if (options.mirror) {
    cropCtx.translate(cropWidth, 0);
    cropCtx.scale(-1, 1);
  }
  cropCtx.drawImage(
    video,
    cropX, cropY, cropWidth, cropHeight, // area sumber di video
    0, 0, cropWidth, cropHeight          // area tujuan di canvas
  );
  cropCtx.restore();

  // Skala jika perlu untuk memenuhi maxSide
  const scale = Math.min(1, maxSide / Math.max(cropWidth, cropHeight));
  const resultWidth = Math.round(cropWidth * scale);
  const resultHeight = Math.round(cropHeight * scale);

  if (scale === 1 && resultWidth === cropWidth && resultHeight === cropHeight) {
    // Tidak perlu skala, langsung buat ImageBitmap dari canvas crop
    return await createImageBitmap(cropCanvas);
  }

  // Buat canvas akhir dengan ukuran yang sudah diskalakan
  const resultCanvas = document.createElement("canvas");
  resultCanvas.width = resultWidth;
  resultCanvas.height = resultHeight;
  const resultCtx = resultCanvas.getContext("2d");
  if (!resultCtx) {
    throw new Error("Gagal membuat konteks 2D untuk hasil");
  }

  // Gambar canvas crop ke canvas hasil dengan skala
  resultCtx.drawImage(cropCanvas, 0, 0, resultWidth, resultHeight);

  // Terapkan flawless beauty filter jika diminta
  if (options.flawless) {
    await applyFlawlessFilter(resultCanvas, resultCtx);
  }

  return await createImageBitmap(resultCanvas);
}

/**
 * Terapkan beauty filter "flawless" ke canvas.
 * - Brightening: tingkatkan brightness ~10%
 * - Contrast boost: slight increase
 * - Saturation boost: slight increase
 * - Smoothing: subtle blur via filter
 */
async function applyFlawlessFilter(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): Promise<void> {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Stronger values for visible effect
  const brightnessFactor = 1.2;    // +20% brightness
  const contrastFactor = 1.15;     // +15% contrast
  const saturationFactor = 1.25;   // +25% saturation

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Brightness
    r = Math.min(255, r * brightnessFactor);
    g = Math.min(255, g * brightnessFactor);
    b = Math.min(255, b * brightnessFactor);

    // Contrast (around middle gray 128)
    r = Math.min(255, Math.max(0, (r - 128) * contrastFactor + 128));
    g = Math.min(255, Math.max(0, (g - 128) * contrastFactor + 128));
    b = Math.min(255, Math.max(0, (b - 128) * contrastFactor + 128));

    // Simple saturation boost: push colors away from gray
    const gray = (r + g + b) / 3;
    r = Math.min(255, Math.max(0, gray + (r - gray) * saturationFactor));
    g = Math.min(255, Math.max(0, gray + (g - gray) * saturationFactor));
    b = Math.min(255, Math.max(0, gray + (b - gray) * saturationFactor));

    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }

  ctx.putImageData(imageData, 0, 0);

  // Apply stronger Gaussian blur for skin smoothing
  ctx.filter = "blur(1px)";
  ctx.drawImage(canvas, 0, 0);
  ctx.filter = "none";
}

/**
 * Menghitung rasio aspek dari dimensi slot (width / height).
 * Helper untuk menentukan crop area dari video.
 */
export function slotAspect(slotWidth: number, slotHeight: number): number {
  if (slotHeight === 0) throw new Error("Tinggi slot tidak boleh nol");
  return slotWidth / slotHeight;
}


/**
 * readImageFile – membaca file gambar dari input file, memuatnya ke ImageBitmap,
 * lalu memotong sesuai rasio target.
 *
 * @param file File gambar (PNG, JPEG, WebP, dll.)
 * @param targetAspect Rasio aspek target (width / height) untuk crop
 * @param maxSide Sisi terpanjang maksimum untuk hasil (default 1920)
 * @param flawless Terapkan beauty filter flawless
 * @returns Promise<ImageBitmap> yang sudah terpotong sesuai rasio
 *
 * Catatan privasi:
 * - File dibaca dengan FileReader secara lokal, tanpa upload ke server.
 * - Tidak ada request jaringan yang terjadi.
 * - Semua proses terjadi di browser user.
 */
export async function readImageFile(
  file: File,
  targetAspect: number,
  maxSide: number = 1920,
  flawless: boolean = false
): Promise<ImageBitmap> {
  // Baca file sebagai data URL (berjalan di thread utama)
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Gagal membaca file"));
    reader.readAsDataURL(file);
  });

  // Muat gambar dari data URL
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Gagal memuat gambar"));
    image.src = dataUrl;
  });

  // Kini kita punya HTMLImageElement, lakukan crop seperti captureFrame
  const imgWidth = img.naturalWidth;
  const imgHeight = img.naturalHeight;
  const imgAspect = imgWidth / imgHeight;

  // Hitung area crop di dalam gambar
  let cropWidth: number, cropHeight: number;
  let cropX = 0, cropY = 0;

  if (imgAspect > targetAspect) {
    // Gambar lebih lebar → crop sisi kiri/kanan
    cropHeight = imgHeight;
    cropWidth = cropHeight * targetAspect;
    cropX = (imgWidth - cropWidth) / 2;
  } else {
    // Gambar lebih tinggi → crop atas/bawah
    cropWidth = imgWidth;
    cropHeight = cropWidth / targetAspect;
    cropY = (imgHeight - cropHeight) / 2;
  }

  // Buat canvas untuk memotong
  const cropCanvas = document.createElement("canvas");
  cropCanvas.width = cropWidth;
  cropCanvas.height = cropHeight;
  const cropCtx = cropCanvas.getContext("2d");
  if (!cropCtx) {
    throw new Error("Gagal membuat konteks 2D untuk crop");
  }

  // Gambar area gambar yang dipotong ke canvas
  cropCtx.drawImage(
    img,
    cropX, cropY, cropWidth, cropHeight,
    0, 0, cropWidth, cropHeight
  );

  // Skala jika perlu untuk memenuhi maxSide
  const scale = Math.min(1, maxSide / Math.max(cropWidth, cropHeight));
  const resultWidth = Math.round(cropWidth * scale);
  const resultHeight = Math.round(cropHeight * scale);

  if (scale === 1 && resultWidth === cropWidth && resultHeight === cropHeight) {
    // Tidak perlu skala, langsung buat ImageBitmap dari canvas crop
    return await createImageBitmap(cropCanvas);
  }

  // Buat canvas akhir dengan ukuran yang sudah diskalakan
  const resultCanvas = document.createElement("canvas");
  resultCanvas.width = resultWidth;
  resultCanvas.height = resultHeight;
  const resultCtx = resultCanvas.getContext("2d");
  if (!resultCtx) {
    throw new Error("Gagal membuat konteks 2D untuk hasil");
  }

  // Gambar canvas crop ke canvas hasil dengan skala
  resultCtx.drawImage(cropCanvas, 0, 0, resultWidth, resultHeight);

  // Terapkan flawless beauty filter jika diminta
  if (flawless) {
    await applyFlawlessFilter(resultCanvas, resultCtx);
  }

  return await createImageBitmap(resultCanvas);
}