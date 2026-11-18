import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { authState } = vi.hoisted(() => ({
  authState: { user: null as { email: string } | null },
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: { getUser: async () => ({ data: { user: authState.user }, error: null }) },
  }),
}));

import { isAllowedAdminEmail } from "../../src/lib/auth";
import { checkRateLimit } from "../../src/lib/rate-limit";
import { proxy } from "../../src/proxy";

describe("admin auth/rate-limit", () => {
  beforeEach(() => {
    authState.user = null;
    process.env.ADMIN_EMAIL = "admin@example.com";
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_PUBLISHABLE_KEY = "test-publishable-key";
  });

  it("hanya mengizinkan email dalam allowlist", () => {
    expect(isAllowedAdminEmail("admin@example.com")).toBe(true);
    expect(isAllowedAdminEmail("ADMIN@Example.com")).toBe(true);
    expect(isAllowedAdminEmail("other@example.com")).toBe(false);
    expect(isAllowedAdminEmail(null)).toBe(false);
  });

  it("menolak semua email bila allowlist kosong", () => {
    process.env.ADMIN_EMAIL = "";
    expect(isAllowedAdminEmail("admin@example.com")).toBe(false);
  });

  it("rate limit blocks after 5", () => {
    const key = "test:" + Date.now();
    for (let i = 0; i < 5; i++) expect(checkRateLimit(key, 5, 10000).ok).toBe(true);
    expect(checkRateLimit(key, 5, 10000).ok).toBe(false);
  });

  it("redirects unauthenticated admin page to login", async () => {
    const req = new NextRequest("http://localhost:3000/admin");
    const res = await proxy(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/login?next=%2Fadmin");
  });

  it("returns 401 for unauthenticated admin api", async () => {
    const req = new NextRequest("http://localhost:3000/api/admin/templates");
    const res = await proxy(req);
    expect(res.status).toBe(401);
  });

  it("mengizinkan halaman admin bila sesi Supabase valid", async () => {
    authState.user = { email: "admin@example.com" };
    const req = new NextRequest("http://localhost:3000/admin");
    const res = await proxy(req);
    expect(res.status).toBe(200);
  });

  it("menolak sesi valid bila email di luar allowlist", async () => {
    authState.user = { email: "other@example.com" };
    const req = new NextRequest("http://localhost:3000/api/admin/templates");
    const res = await proxy(req);
    expect(res.status).toBe(401);
  });
});
