import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { signInWithPassword, signOut } = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("../../src/lib/supabase/session", () => ({
  createSessionClient: async () => ({
    auth: { signInWithPassword, signOut },
  }),
  getSessionEnv: () => ({ url: "https://example.supabase.co", key: "test-publishable-key" }),
}));

import { POST } from "../../src/app/api/login/route";

function loginRequest(body: Record<string, string>) {
  return new NextRequest("http://localhost:3000/api/login", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/login (sesi Supabase)", () => {
  beforeEach(() => {
    signInWithPassword.mockReset();
    signOut.mockReset();
    process.env.ADMIN_EMAIL = "admin@example.com";
  });

  it("menerima email allowlist dengan kredensial valid", async () => {
    signInWithPassword.mockResolvedValue({ data: { user: { email: "admin@example.com" } }, error: null });
    const res = await POST(loginRequest({ email: " Admin@Example.com ", password: "secret-password" }));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "admin@example.com",
      password: "secret-password",
    });
  });

  it("menolak kredensial invalid", async () => {
    signInWithPassword.mockResolvedValue({ data: { user: null }, error: { message: "Invalid login credentials" } });
    const res = await POST(loginRequest({ email: "admin@example.com", password: "salah" }));
    expect(res.status).toBe(401);
  });

  it("menolak email di luar allowlist dan mengakhiri sesi", async () => {
    signInWithPassword.mockResolvedValue({ data: { user: { email: "other@example.com" } }, error: null });
    const res = await POST(loginRequest({ email: "other@example.com", password: "secret-password" }));
    expect(res.status).toBe(401);
    expect(signOut).toHaveBeenCalled();
  });

  it("menolak input kosong tanpa memanggil Supabase", async () => {
    const res = await POST(loginRequest({ email: "", password: "" }));
    expect(res.status).toBe(401);
    expect(signInWithPassword).not.toHaveBeenCalled();
  });
});
