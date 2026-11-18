import { describe, expect, it, vi, beforeEach } from "vitest";

const { signInWithPassword } = vi.hoisted(() => ({ signInWithPassword: vi.fn() }));

vi.mock("../../src/lib/db", () => ({
  getAuthClient: () => ({ auth: { signInWithPassword } }),
  isAuthConfigured: () => true,
}));

import { verifyCredentials } from "../../src/lib/auth";

describe("verifyCredentials (Supabase Auth)", () => {
  beforeEach(() => {
    signInWithPassword.mockReset();
    process.env.ADMIN_EMAIL = "admin@example.com";
  });

  it("accepts allowed email with valid credentials", async () => {
    signInWithPassword.mockResolvedValue({ data: { user: { email: "admin@example.com" } }, error: null });
    await expect(verifyCredentials("admin@example.com", "secret-password")).resolves.toBe(true);
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "admin@example.com",
      password: "secret-password",
    });
  });

  it("rejects invalid credentials", async () => {
    signInWithPassword.mockResolvedValue({ data: { user: null }, error: { message: "Invalid login credentials" } });
    await expect(verifyCredentials("admin@example.com", "wrong")).resolves.toBe(false);
  });

  it("rejects email outside allowlist", async () => {
    signInWithPassword.mockResolvedValue({ data: { user: { email: "other@example.com" } }, error: null });
    await expect(verifyCredentials("other@example.com", "secret-password")).resolves.toBe(false);
  });

  it("rejects empty input without calling Supabase", async () => {
    await expect(verifyCredentials("", "")).resolves.toBe(false);
    await expect(verifyCredentials("admin@example.com", "")).resolves.toBe(false);
    expect(signInWithPassword).not.toHaveBeenCalled();
  });
});
