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
    test.setTimeout(180000);
    await page.addInitScript(() => {
      const w = window as unknown as { __cameraStreams?: MediaStream[] };
      w.__cameraStreams = [];
      const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      navigator.mediaDevices.getUserMedia = async (constraints) => {
        const stream = await original(constraints);
        w.__cameraStreams?.push(stream);
        return stream;
      };
    });

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
    await expect(page.getByRole("heading", { name: "Select Your Frame" })).toBeVisible();

    // pilih template pertama
    const firstTemplate = page.locator("button").filter({ hasText: /portrait/ }).first();
    await firstTemplate.click();
    await page.getByRole("button", { name: "Take Your Position" }).click();

    // S2 primer izin kamera -> klik izinkan (kamera device/fake stream via Playwright args)
    await expect(page.getByRole("heading", { name: "Before the Curtain Rises" })).toBeVisible();
    await expect(page.getByText("The camera performs only within this tab.")).toBeVisible();
    await expect(page.getByText("Your portraits are never sent anywhere.")).toBeVisible();
    await expect(page.getByText("All traces vanish when you close the act.")).toBeVisible();
    await page.getByRole("button", { name: "Grant the Stage" }).click();

    // capture: ambil foto sampai semua slot terisi (jumlah slot varies per template)
    const shutter = page.getByLabel("Take portrait");
    await expect(shutter).toBeVisible({ timeout: 15000 });
    const keepsake = page.getByRole("button", { name: "Claim Your Keepsake" });
    for (let shot = 0; shot < 12; shot++) {
      if (await keepsake.isVisible().catch(() => false)) break;
      await shutter.click({ timeout: 15000 }).catch(() => undefined);
      await page.waitForTimeout(300);
    }

    // tunggu review (strip hasil + tombol unduh)
    await expect(keepsake).toBeVisible({ timeout: 120000 });

    // kamera harus mati di halaman hasil: tidak ada track video yang masih live
    const liveVideoTracks = await page.evaluate(() => {
      const streams = (window as unknown as { __cameraStreams?: MediaStream[] }).__cameraStreams ?? [];
      return streams.flatMap((stream) => stream.getVideoTracks()).filter((track) => track.readyState === "live").length;
    });
    expect(liveVideoTracks, "kamera harus mati saat berada di halaman hasil").toBe(0);

    // unduh
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Claim Your Keepsake" }).click(),
    ]);
    expect(await download.suggestedFilename()).toMatch(/photobooth-.*\.png/);

    // selesai & hapus
    await page.getByRole("button", { name: "Close the Act" }).click();
    await expect(page.getByRole("heading", { name: "The Curtain Falls." })).toBeVisible();
    await expect(page.getByText("Session cleared. Local portraits removed from memory.")).toBeVisible();

    // (b) storage kosong dari data foto
    const storage = await page.evaluate(async () => {
      const lsKeys = Object.keys(localStorage);
      const ssKeys = Object.keys(sessionStorage);
      const lsValues = lsKeys.map((k) => localStorage.getItem(k) ?? "");
      const ssValues = ssKeys.map((k) => sessionStorage.getItem(k) ?? "");
      const idbNames: string[] = [];
      if ("databases" in indexedDB) {
        try {
          const dbs = await indexedDB.databases();
          for (const db of dbs) if (db.name) idbNames.push(db.name);
        } catch {
          // ignore
        }
      }
      let cacheKeys: string[] = [];
      if ("caches" in window) {
        try { cacheKeys = await caches.keys(); } catch { /* ignore */ }
      }
      return { lsKeys, ssKeys, lsValues, ssValues, idbNames, cacheKeys };
    });

    const storedPhotoLike = [...storage.ssValues, ...storage.lsValues].some(
      (value) => value.startsWith("data:") || value.startsWith("blob:") || value.length > 512
    );
    expect(storedPhotoLike, "foto tidak boleh disimpan di storage").toBe(false);
    // hanya flag non-foto yang boleh disimpan (deduplikasi page_view)
    expect(storage.ssKeys.filter((k) => k !== "pb_page_view_tracked")).toEqual([]);
    expect(storage.idbNames).toEqual([]);
    expect(storage.cacheKeys).toEqual([]);
    // localStorage hanya boleh memuat preferensi non-foto (kamera)
    expect(storage.lsKeys.filter((k) => k !== "pb:camera")).toEqual([]);

    expect(suspicious, `Suspicious requests: ${suspicious.join("; ")}`).toEqual([]);
  });
});
