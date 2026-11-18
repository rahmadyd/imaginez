import { expect, test } from "@playwright/test";

type MirrorProbe = { flips: number };

declare global {
  interface Window {
    __mirrorProbe?: MirrorProbe;
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
      const original = CanvasRenderingContext2D.prototype.scale;
      CanvasRenderingContext2D.prototype.scale = function (x: number, y: number) {
        if (x === -1) window.__mirrorProbe!.flips += 1;
        return original.call(this, x, y);
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
});
