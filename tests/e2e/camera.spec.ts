import { expect, test } from "@playwright/test";

type MirrorProbe = { flips: number };
type DrawProbe = { sx: number; sy: number; sw: number; sh: number };

declare global {
  interface Window {
    __mirrorProbe?: MirrorProbe;
    __drawProbe?: DrawProbe[];
  }
}

async function openCaptureScreen(page: import("@playwright/test").Page) {
  await page.goto("/booth", { waitUntil: "networkidle" });
  await page.locator("button").filter({ hasText: /portrait/ }).first().click();
  await page.getByRole("button", { name: "Take Your Position" }).click();
  await page.getByRole("button", { name: "Grant the Stage" }).click();
  await expect(page.getByLabel("Take portrait")).toBeVisible({ timeout: 15000 });
  // mode manual: satu klik = satu foto, tidak shooting semua slot
  await page.getByRole("button", { name: "Single Take" }).click();
}

function previewTransform(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const video = document.querySelector("video") as HTMLVideoElement | null;
    return video ? getComputedStyle(video).transform : null;
  });
}

function flipCount(page: import("@playwright/test").Page) {
  return page.evaluate(() => window.__mirrorProbe?.flips ?? 0);
}

test.describe("kamera", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.__mirrorProbe = { flips: 0 };
      window.__drawProbe = [];
      const originalScale = CanvasRenderingContext2D.prototype.scale;
      CanvasRenderingContext2D.prototype.scale = function (x: number, y: number) {
        if (x === -1) window.__mirrorProbe!.flips += 1;
        return originalScale.call(this, x, y);
      };
      const originalDraw = CanvasRenderingContext2D.prototype.drawImage;
      CanvasRenderingContext2D.prototype.drawImage = function (...args: unknown[]) {
        const source = args[0];
        if (source instanceof HTMLVideoElement) {
          window.__drawProbe!.push({
            sx: args[1] as number,
            sy: args[2] as number,
            sw: args[3] as number,
            sh: args[4] as number,
          });
        }
        return (originalDraw as (...a: unknown[]) => void).apply(this, args);
      };
    });
  });

  test("webcam cermin otomatis dan hasil jepretan mengikuti tampilan", async ({ page }) => {
    await openCaptureScreen(page);

    // desktop: webcam memakai mirror otomatis
    await expect.poll(previewTransform.bind(null, page)).toContain("-1");

    // hasil jepretan ikut cermin (canvas capture memakai scale(-1, 1))
    await page.getByLabel("Take portrait").click();
    await expect.poll(flipCount.bind(null, page), { timeout: 20000 }).toBeGreaterThan(0);
  });

  test("toggle manual mengubah preview dan hasil jepretan", async ({ page }) => {
    await openCaptureScreen(page);

    const selectCamera = page.getByRole("button", { name: "Select camera" });
    const shutter = page.getByLabel("Take portrait");

    await selectCamera.click();
    const toggle = page.getByRole("checkbox");
    await expect(toggle).toBeChecked();
    await toggle.uncheck();
    await page.keyboard.press("Escape");

    await expect.poll(previewTransform.bind(null, page)).toBe("none");

    await shutter.click();
    await expect(selectCamera).toBeEnabled({ timeout: 20000 });
    expect(await flipCount(page)).toBe(0);

    // hidupkan lagi -> preview dan hasil jepretan cermin
    await selectCamera.click();
    await toggle.check();
    await page.keyboard.press("Escape");
    await expect.poll(previewTransform.bind(null, page)).toContain("-1");

    await shutter.click();
    await expect.poll(flipCount.bind(null, page), { timeout: 20000 }).toBeGreaterThan(0);
  });

  test("viewfinder memakai rasio slot dan capture memotong area yang sama", async ({ page }) => {
    await openCaptureScreen(page);

    const template = await page.request.get("/api/templates").then((r) => r.json() as Promise<{ templates: { slots: { w: number; h: number }[] }[] }>);
    const slotAspect = template.templates[0].slots[0].w / template.templates[0].slots[0].h;

    const preview = await page.evaluate(() => {
      const video = document.querySelector("video") as HTMLVideoElement | null;
      const rect = video!.getBoundingClientRect();
      const videoW = video!.videoWidth;
      const videoH = video!.videoHeight;
      const scale = Math.max(rect.width / videoW, rect.height / videoH);
      return {
        aspect: rect.width / rect.height,
        sx: (videoW - rect.width / scale) / 2,
        sy: (videoH - rect.height / scale) / 2,
        sw: rect.width / scale,
        sh: rect.height / scale,
      };
    });

    // kotak preview persis mengikuti rasio slot template
    expect(preview.aspect).toBeCloseTo(slotAspect, 3);

    await page.getByLabel("Take portrait").click();
    await expect(page.getByRole("button", { name: "Select camera" })).toBeEnabled({ timeout: 20000 });

    const crop = await page.evaluate(() => window.__drawProbe?.[0] ?? null);
    expect(crop).not.toBeNull();
    // area yang dipotong sama persis dengan area yang terlihat di preview
    expect(crop!.sx).toBeCloseTo(preview.sx, 1);
    expect(crop!.sy).toBeCloseTo(preview.sy, 1);
    expect(crop!.sw).toBeCloseTo(preview.sw, 0);
    expect(crop!.sh).toBeCloseTo(preview.sh, 0);
  });
});
