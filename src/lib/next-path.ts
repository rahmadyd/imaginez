const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

/**
 * Membersihkan nilai `next` agar hanya menunjuk path internal aplikasi.
 * Menolak URL absolut, protocol-relative, backslash, dan karakter kontrol
 * supaya parameter tidak bisa dipakai sebagai open redirect.
 */
export function sanitizeNextPath(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  if (CONTROL_CHARS.test(value)) return null;
  if (value.includes("\\")) return null;
  try {
    const decoded = decodeURIComponent(value);
    if (decoded.startsWith("//") || decoded.includes("\\")) return null;
    if (CONTROL_CHARS.test(decoded)) return null;
  } catch {
    return null;
  }
  return value;
}

/**
 * Tujuan setelah login. Default ke /admin supaya admin tetap satu-satunya
 * halaman di balik login.
 */
export function resolveLoginTarget(raw: string | null | undefined): string {
  return sanitizeNextPath(raw) ?? "/admin";
}
