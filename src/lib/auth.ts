import crypto from "crypto";
import { getSupabase, isSupabaseConfigured } from "./db";

const COOKIE_NAME = "pb_admin";
const MAX_AGE = 60 * 60 * 12;

function getSecret(): string {
  return process.env.SESSION_SECRET || "dev-session-secret-change-me";
}

function sign(value: string): string {
  const mac = crypto.createHmac("sha256", getSecret()).update(value).digest("base64url");
  return `${value}.${mac}`;
}

function verify(signed: string): string | null {
  const idx = signed.lastIndexOf(".");
  if (idx < 0) return null;
  const value = signed.slice(0, idx);
  const mac = signed.slice(idx + 1);
  const expected = crypto.createHmac("sha256", getSecret()).update(value).digest("base64url");
  try {
    if (!crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  return value;
}

export function createSessionToken(): string {
  const payload = JSON.stringify({ iat: Date.now() });
  return sign(Buffer.from(payload).toString("base64url"));
}

export function verifySessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const payload = verify(token);
  if (!payload) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { iat?: number };
    if (!data.iat) return false;
    if (Date.now() - data.iat > MAX_AGE * 1000) return false;
    return true;
  } catch {
    return false;
  }
}

export function sessionCookie(token: string) {
  return {
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE,
  };
}

export function clearSessionCookie() {
  return {
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };
}

export function getSessionCookieName() {
  return COOKIE_NAME;
}

export async function verifyCredentials(email: string, password: string): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  const digest = crypto.createHash("sha256").update(password).digest("hex");

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await getSupabase()
        .from("admin_accounts")
        .select("email, password_hash, is_active, role")
        .eq("email", normalized)
        .eq("role", "admin")
        .maybeSingle();
      if (error) throw error;
      if (data && data.is_active !== false) {
        let match = false;
        try {
          match = crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(String(data.password_hash)));
        } catch {
          match = false;
        }
        return match;
      }
      return false;
    } catch {
      // Supabase unavailable: fall back to env credentials for resilience
    }
  }

  const hash = process.env.ADMIN_PASSWORD_HASH;
  const adminEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  if (!hash) {
    if (process.env.NODE_ENV === "production") return false;
    return normalized === "admin@imaginez.local" && password === "admin";
  }
  const expectedEmail = adminEmail || "admin@imaginez.local";
  if (normalized !== expectedEmail) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hash));
  } catch {
    return false;
  }
}

export function isAdminAuthenticated(cookieValue: string | undefined | null): boolean {
  return verifySessionToken(cookieValue);
}
