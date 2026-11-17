import { expect, test, type Request } from "@playwright/test";

function isImageLike(request: Request): boolean {
  const ct = request.headers()["content-type"] || "";
  const url = request.url();
  if (ct.startsWith("image/")) return true;
  if (ct.includes("multipart/form-data")) return true;
  // allow same-origin seed/template asset fetches (GET) but flag if body carries data
  if ((url.includes("/api/templates/") && url.endsWith("/overlay")) || url.includes("/seed/")) return false;
  return false;
}

test.describe("privasi fase 3", () => {
  test("alur penuh: izin kamera device, capture, review, unduh, selesai tanpa kebocoran", async ({ page }) => {
    const suspicious: string[] = [];
    page.on("request", (req) => {
      const method = req.method();
      const url = req.url();
      const ct = req.headers()["content-type"] || "";
      const body = req.postDataBuffer();
      // (a) no request carrying image/photo data out
      if (isImageLike(req)) {
        // GET overlay is allowed; block if it has body
        if (method !== "GET" && method !== "HEAD") suspicious.push(`${method} ${url} ${ct}`);
      }
      if (body && body.length > 0) {
        const isSameOriginGetLike = url.startsWith("http://localhost:3000");
        const looksLikeImage = ct.startsWith("image/") || ct.includes("multipart") || ct.includes("octet-stream");
        if (looksLikeImage) suspicious.push(`body ${method} ${url} ${ct} len=${body.length}`);
        // any non-trivial POST/PUT/PATCH carrying binary-ish body to our origin would be bad; none expected
        if (["POST", "PUT", "PATCH"].includes(method) && isSameOriginGetLike) {
          suspicious.push(`mutating ${method} ${url} ct=${ct} len=${body.length}`);
        }
      }
    });

    await page.goto("/booth", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Pilih strip" })).toBeVisible();

    // pilih template pertama
    const firstTemplate = page.locator("button:has-text('foto')").first();
    await firstTemplate.click();
    await page.getByRole("button", { name: "Lanjut" }).click();

    // S2 primer izin kamera -> klik izinkan (kamera device/fake stream via Playwright args)
    await expect(page.getByRole("heading", { name: "Sebelum mulai" })).toBeVisible();
    await expect(page.getByText("Kamera hanya jalan di tab ini.")).toBeVisible();
    await expect(page.getByText("Fotomu tidak dikirim ke mana pun.")).toBeVisible();
    await expect(page.getByText("Hilang waktu kamu tekan Selesai.")).toBeVisible();
    await page.getByRole("button", { name: "Izinkan kamera" }).click();

    // capture: otomatis ambil semua slot
    await expect(page.getByLabel("Ambil foto")).toBeVisible({ timeout: 15000 });
    await page.getByLabel("Ambil foto").click();

    // tunggu review (strip hasil + tombol unduh)
    await expect(page.getByRole("button", { name: "Unduh" })).toBeVisible({ timeout: 120000 });

    // unduh
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Unduh" }).click(),
    ]);
    expect(await download.suggestedFilename()).toMatch(/photobooth-.*\.png/);

    // selesai & hapus
    await page.getByRole("button", { name: "Selesai & hapus" }).click();
    await expect(page.getByRole("heading", { name: "Sudah terhapus." })).toBeVisible();
    await expect(page.getByText("0 foto tersimpan di server.")).toBeVisible();

    // (b) storage kosong dari data foto
    const storage = await page.evaluate(async () => {
      const lsKeys = Object.keys(localStorage);
      const ssKeys = Object.keys(sessionStorage);
      const idbNames: string[] = [];
      if ("databases" in indexedDB) {
        try {
          const dbs = await indexedDB.databases();
          for (const d of dbs) if (d.name) idbNames.push(d.name);
        } catch {
          // ignore
        }
      }
      let cacheKeys: string[] = [];
      if ("caches" in window) {
        try { cacheKeys = await caches.keys(); } catch { /* ignore */ }
      }
      return { lsKeys, ssKeys, idbNames, cacheKeys };
    });

    expect(storage.ssKeys).toEqual([]);
    expect(storage.idbNames).toEqual([]);
    expect(storage.cacheKeys).toEqual([]);
    // localStorage only non-photo prefs allowed; in this flow should be empty
    expect(storage.lsKeys).toEqual([]);

    expect(suspicious, `Suspicious requests: ${suspicious.join("; ")}`).toEqual([]);
  });
});
