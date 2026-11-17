import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { createSessionToken, verifySessionToken } from "../../src/lib/auth";
import { checkRateLimit } from "../../src/lib/rate-limit";
import { proxy } from "../../src/proxy";

describe("admin auth/rate-limit", () => {
  it("session token roundtrip", () => {
    const t = createSessionToken();
    expect(verifySessionToken(t)).toBe(true);
    expect(verifySessionToken("bad")).toBe(false);
  });
  it("rate limit blocks after 5", () => {
    const key = "test:" + Date.now();
    for (let i=0;i<5;i++) expect(checkRateLimit(key,5,10000).ok).toBe(true);
    expect(checkRateLimit(key,5,10000).ok).toBe(false);
  });
  it("redirects unauthenticated admin page to login", () => {
    const req = new NextRequest("http://localhost:3000/admin");
    const res = proxy(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/login?next=%2Fadmin");
  });
  it("returns 401 for unauthenticated admin api", () => {
    const req = new NextRequest("http://localhost:3000/api/admin/templates");
    const res = proxy(req);
    expect(res.status).toBe(401);
  });
});
