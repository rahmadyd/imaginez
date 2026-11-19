import { expect, test } from "@playwright/test";
import path from "path";

const IMAGE = path.join(process.cwd(), "public", "seed", "strip-1x6.png");

test.describe("alur galeri", () => {
  test("foto dari galeri langsung mengisi slot tanpa menyalakan kamera", async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __cameraStreams?: MediaStream[] };
      w.__cameraStreams = [];
      const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      navigator.mediaDevices.getUserMedia = async (constraints: MediaStreamConstraints) => {
        const stream = await original(constraints);
        w.__cameraStreams?.push(stream);
        return stream;
      };
    });

    await page.goto("/booth", { waitUntil: "networkidle" });
    await page.locator("button:has(img)").first().click();
    await page.getByRole("button", { name: "Take Your Position" }).click();

    // tombol galeri di layar izin harus benar-benar membuka pemilih file
    const permissionInput = page.locator('input[type="file"][aria-label="Use a portrait from gallery"]');
    await expect(permissionInput).toHaveCount(1);
    await permissionInput.setInputFiles(IMAGE);

    // langsung ke layar pengisian slot, bukan viewfinder kamera
    await expect(page.getByRole("heading", { name: "Fill the Frames" })).toBeVisible({ timeout: 15000 });
    await expect(page.getByLabel("Take portrait")).toHaveCount(0);

    const templates = await page.request.get("/api/templates").then((r) => r.json() as Promise<{ templates: { slots: unknown[] }[] }>);
    const total = templates.templates[0].slots.length;

    // satu foto terisi, sisa slot kosong
    await expect(page.getByText(`1 of ${total} frames filled`)).toBeVisible({ timeout: 15000 });

    // kamera tidak pernah dinyalakan
    const cameraStreams = await page.evaluate(() => (window as unknown as { __cameraStreams?: MediaStream[] }).__cameraStreams?.length ?? 0);
    expect(cameraStreams).toBe(0);

    // tambah foto lagi lewat galeri, tanpa kamera
    const fillInput = page.locator('input[type="file"][aria-label="Add portrait from gallery"]');
    await fillInput.setInputFiles(Array.from({ length: total - 1 }, () => IMAGE));

    // semua slot terisi -> langsung ke review
    await expect(page.getByRole("heading", { name: "Your Keepsake" })).toBeVisible({ timeout: 30000 });
    const cameraAfter = await page.evaluate(() => (window as unknown as { __cameraStreams?: MediaStream[] }).__cameraStreams?.length ?? 0);
    expect(cameraAfter).toBe(0);
  });
});
