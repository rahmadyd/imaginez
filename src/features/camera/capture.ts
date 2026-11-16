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