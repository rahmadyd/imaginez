/**
 * captureFrame – menangkap satu frame dari video, dipotong sesuai rasio target,
 * lalu dibatasi ukuran maksimum.
 *
 * @param video Elemen video yang sedang memutar stream kamera
 * @param targetAspect Rasio aspek target (width / height) yang diinginkan
 * @param maxSide Sisi terpanjang maksimum untuk hasil (default 1920)
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
export async function captureFrame(
  video: HTMLVideoElement,
  targetAspect: number,
  maxSide: number = 1920
): Promise<ImageBitmap> {
  // Video harus sudah memuat dan memiliki dimensi valid
  if (video.videoWidth === 0 || video.videoHeight === 0) {
    throw new Error("Video belum memiliki dimensi yang valid");
  }

  const videoWidth = video.videoWidth;
  const videoHeight = video.videoHeight;
  const videoAspect = videoWidth / videoHeight;

  // Hitung area crop di dalam video
  let cropWidth: number, cropHeight: number;
  let cropX = 0, cropY = 0;

  if (videoAspect > targetAspect) {
    // Video lebih lebar → crop sisi kiri/kanan
    cropHeight = videoHeight;
    cropWidth = cropHeight * targetAspect;
    cropX = (videoWidth - cropWidth) / 2;
  } else {
    // Video lebih tinggi → crop atas/bawah
    cropWidth = videoWidth;
    cropHeight = cropWidth / targetAspect;
    cropY = (videoHeight - cropHeight) / 2;
  }

  // Buat canvas untuk memotong
  const cropCanvas = document.createElement("canvas");
  cropCanvas.width = cropWidth;
  cropCanvas.height = cropHeight;
  const cropCtx = cropCanvas.getContext("2d");
  if (!cropCtx) {
    throw new Error("Gagal membuat konteks 2D untuk crop");
  }

  // Gambar area video yang dipotong ke canvas
  cropCtx.drawImage(
    video,
    cropX, cropY, cropWidth, cropHeight, // area sumber di video
    0, 0, cropWidth, cropHeight          // area tujuan di canvas
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

  return await createImageBitmap(resultCanvas);
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
  maxSide: number = 1920
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

  return await createImageBitmap(resultCanvas);
}