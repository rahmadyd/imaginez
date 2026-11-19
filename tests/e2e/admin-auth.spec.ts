import { expect, test } from "@playwright/test";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;

test.describe("proteksi rute admin", () => {
  test("halaman admin dan sub-rute dialihkan ke login tanpa sesi", async ({ page }) => {
    for (const path of ["/admin", "/admin/templates", "/admin/templates/abc-def"]) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(/\/login\?next=/);
      await expect(page.getByRole("button", { name: /masuk/i })).toBeVisible();
    }
  });

  test("prefetch halaman admin tidak membocorkan isi dashboard", async ({ request }) => {
    const res = await request.get("/admin", {
      headers: { purpose: "prefetch", "next-router-prefetch": "1" },
    });
    const body = await res.text();
    expect(body).not.toMatch(/Daftar template|Slot \(urutan\)|keluar/i);
  });

  test("API admin menolak tanpa sesi", async ({ request }) => {
    const res = await request.get("/api/admin/templates");
    expect(res.status()).toBe(401);
  });

  test("login memberi akses admin, logout menutupnya lagi", async ({ page, context }) => {
    test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, "kredensial admin tidak tersedia");

    await page.goto("/login");
    await page.locator('input[type="email"]').fill(ADMIN_EMAIL!);
    await page.locator('input[type="password"]').fill(ADMIN_PASSWORD!);
    await page.getByRole("button", { name: /masuk/i }).click();
    await page.waitForURL(/\/admin/, { timeout: 20000 });

    const authCookie = (await context.cookies()).find((c) => c.name.includes("auth-token"));
    expect(authCookie?.httpOnly).toBe(true);

    await page.getByRole("button", { name: /keluar/i }).click();
    await page.waitForURL(/\/login/, { timeout: 20000 });

    const cookieAfter = (await context.cookies()).find((c) => c.name.includes("auth-token"));
    expect(!cookieAfter || !cookieAfter.value).toBe(true);

    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/login\?next=/);
  });
});
