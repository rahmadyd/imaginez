import { expect, test } from "@playwright/test";

test.describe("header keamanan", () => {
  test("respons memuat CSP dan header keamanan lain", async ({ request }) => {
    const response = await request.get("/");
    const headers = response.headers();

    expect(response.ok()).toBe(true);

    expect(headers["content-security-policy"]).toContain("default-src 'self'");
    expect(headers["content-security-policy"]).toContain("script-src 'self'");
    expect(headers["content-security-policy"]).toContain(
      "style-src 'self' 'unsafe-inline'"
    );
    expect(headers["content-security-policy"]).toContain(
      "img-src 'self' blob: data:"
    );
    expect(headers["content-security-policy"]).toContain(
      "media-src 'self' blob:"
    );
    expect(headers["content-security-policy"]).toContain("connect-src 'self'");
    expect(headers["content-security-policy"]).toContain("font-src 'self'");
    expect(headers["content-security-policy"]).toContain(
      "frame-ancestors 'none'"
    );

    expect(headers["permissions-policy"]).toBe(
      "camera=(self), microphone=(), geolocation=()"
    );
    expect(headers["referrer-policy"]).toBe("same-origin");
    expect(headers["x-content-type-options"]).toBe("nosniff");
  });

  test("halaman, font, gambar data, dan kamera device tetap berjalan", async ({
    page,
  }) => {
    const cspErrors: string[] = [];
    const pageErrors: string[] = [];

    page.on("console", (message) => {
      const text = message.text();
      if (
        message.type() === "error" &&
        (text.includes("Content Security Policy") ||
          text.includes("Refused to"))
      ) {
        cspErrors.push(text);
      }
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));

    const response = await page.goto("/");
    expect(response).not.toBeNull();

    expect(response?.headers()["content-security-policy"]).toContain(
      "script-src 'self'"
    );
    await expect(page.getByRole("heading", { name: "Step Into the Spotlight" })).toBeVisible();

    const runtimeLoaded = await page.evaluate(() => {
      return typeof (window as unknown as { __next_f?: unknown }).__next_f !== "undefined";
    });
    expect(runtimeLoaded).toBe(true);

    const fonts = await page.evaluate(async () => {
      await document.fonts.ready;
      return {
        status: document.fonts.status,
        count: document.fonts.size,
        bodyFamily: getComputedStyle(document.body).fontFamily,
      };
    });
    expect(fonts.status).toBe("loaded");
    expect(fonts.count).toBeGreaterThan(0);
    expect(fonts.bodyFamily.length).toBeGreaterThan(0);

    await page.evaluate(async () => {
      const image = new Image();
      image.src =
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'/%3E";
      await image.decode();
    });

    const videoTrackCount = await page.evaluate(async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const count = stream.getVideoTracks().length;
      stream.getTracks().forEach((track) => track.stop());
      return count;
    });
    expect(videoTrackCount).toBeGreaterThan(0);

    await page.waitForTimeout(300);

    expect(cspErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});
