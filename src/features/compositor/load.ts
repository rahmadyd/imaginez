/**
 * Helper untuk memuat overlay dari URL same-origin.
 * Mencegah tainted canvas dengan memastikan overlay dimuat dari origin yang sama.
 */

/**
 * Memuat overlay sebagai ImageBitmap dari URL same-origin.
 * @param url URL overlay (harus same-origin)
 * @returns Promise<ImageBitmap>
 * @throws {Error} Jika gagal memuat atau canvas menjadi tainted
 */
export async function loadOverlay(url: string): Promise<ImageBitmap> {
  // Muat gambar via fetch untuk memastikan same-origin
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Gagal memuat overlay: ${response.status} ${response.statusText}`);
  }

  const blob = await response.blob();
  const img = await createImageBitmap(blob);
  return img;
}

/**
 * Memuat overlay dari seed template (untuk development).
 * @param templateId ID template seed (strip-1x6 atau grid-2x3)
 * @returns Promise<ImageBitmap> overlay dari public/seed
 */
export async function loadSeedOverlay(templateId: string): Promise<ImageBitmap> {
  const url = `/seed/${templateId}.png`;
  return loadOverlay(url);
}

/**
 * Memuat template dari seed (untuk development).
 * @param templateId ID template seed
 * @returns Promise<{ template: unknown; overlay: ImageBitmap }>
 */
export async function loadSeedTemplate(templateId: string): Promise<{
  template: unknown;
  overlay: ImageBitmap;
}> {
  // Load template JSON
  const templateResponse = await fetch(`/seed/${templateId}.json`);
  if (!templateResponse.ok) {
    throw new Error(`Gagal memuat template: ${templateId}`);
  }
  const template = await templateResponse.json();

  // Load overlay
  const overlay = await loadSeedOverlay(templateId);

  return { template, overlay };
}