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

import { resolveLoginTarget, sanitizeNextPath } from "../../src/lib/next-path";
import { proxy } from "../../src/proxy";

describe("sanitasi next", () => {
  it("menerima path internal biasa", () => {
    expect(sanitizeNextPath("/admin")).toBe("/admin");
    expect(sanitizeNextPath("/admin/templates/abc")).toBe("/admin/templates/abc");
    expect(sanitizeNextPath("/admin?tab=lokal")).toBe("/admin?tab=lokal");
  });

  it("menolak URL eksternal dan protocol-relative", () => {
    expect(sanitizeNextPath("https://evil.example/x")).toBeNull();
    expect(sanitizeNextPath("//evil.example/x")).toBeNull();
    expect(sanitizeNextPath("/\\evil.example/x")).toBeNull();
    expect(sanitizeNextPath("javascript:alert(1)")).toBeNull();
    expect(sanitizeNextPath("admin")).toBeNull();
    expect(sanitizeNextPath("")).toBeNull();
    expect(sanitizeNextPath(null)).toBeNull();
  });

  it("menolak karakter kontrol dan backslash tersembunyi", () => {
    expect(sanitizeNextPath("/admin\nSet-Cookie: x=1")).toBeNull();
    expect(sanitizeNextPath("/admin%0aSet-Cookie")).toBeNull();
    expect(sanitizeNextPath("/admin\\evil")).toBeNull();
  });

  it("tujuan login default ke /admin", () => {
    expect(resolveLoginTarget(null)).toBe("/admin");
    expect(resolveLoginTarget("https://evil.example")).toBe("/admin");
    expect(resolveLoginTarget("/admin/templates/abc")).toBe("/admin/templates/abc");
  });
});

describe("proxy admin", () => {
  beforeEach(() => {
    authState.user = { email: "admin@example.com" };
    process.env.ADMIN_EMAIL = "admin@example.com";
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_PUBLISHABLE_KEY = "test-publishable-key";
  });

  it("redirect admin tanpa sesi ke login dan mempertahankan query string", async () => {
    authState.user = null;
    const req = new NextRequest("http://localhost:3000/admin/templates/abc?tab=slot");
    const res = await proxy(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/login?next=%2Fadmin%2Ftemplates%2Fabc%3Ftab%3Dslot"
    );
  });

  it("redirect /login ke /admin bila sesi valid", async () => {
    const req = new NextRequest("http://localhost:3000/login");
    const res = await proxy(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/admin");
  });

  it("abaikan next eksternal saat sesi valid", async () => {
    const req = new NextRequest("http://localhost:3000/login?next=https%3A%2F%2Fevil.example%2Fx");
    const res = await proxy(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/admin");
  });

  it("API admin tanpa sesi tetap 401 walau prefetch", async () => {
    authState.user = null;
    const req = new NextRequest("http://localhost:3000/api/admin/templates", {
      headers: { "next-router-prefetch": "1" },
    });
    const res = await proxy(req);
    expect(res.status).toBe(401);
  });
});
