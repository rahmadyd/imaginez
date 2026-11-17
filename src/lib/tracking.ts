import { NextRequest } from "next/server";

export function normalizeIdCity(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let value = raw.trim();
  if (!value) return null;
  try {
    value = decodeURIComponent(value);
  } catch {
    // keep original
  }
  value = value.replace(/\+/g, " ").trim();
  if (!value) return null;
  // Title-case-ish for readability; keep short coarse label only.
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getRequestCity(req: NextRequest): string | null {
  const country = (req.headers.get("x-vercel-ip-country") || req.headers.get("cf-ipcountry") || "").toUpperCase();
  if (country && country !== "ID") return null;

  const city =
    req.headers.get("x-vercel-ip-city") ||
    req.headers.get("cf-ipcity") ||
    req.headers.get("x-vercel-ip-country-region") ||
    null;
  const normalized = normalizeIdCity(city);
  if (!normalized) return country === "ID" ? "Indonesia (lokasi kota tidak diketahui)" : null;
  return normalized;
}

export function isUuidLike(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
