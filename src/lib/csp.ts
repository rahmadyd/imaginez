type ContentSecurityPolicyOptions = {
  nonce: string;
  isDev: boolean;
};

export function buildContentSecurityPolicy({
  nonce,
  isDev,
}: ContentSecurityPolicyOptions): string {
  // Turbopack dev belum menempelkan nonce ke tag script, jadi dev memakai
  // 'unsafe-inline'. Produksi tetap memakai nonce + strict-dynamic.
  const scriptSrc = isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`;

  // connect-src tetap 'self' di produksi; hanya dev yang butuh WebSocket HMR.
  const connectSrc = isDev ? "connect-src 'self' ws://localhost:*" : "connect-src 'self'";

  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "media-src 'self' blob:",
    connectSrc,
    "font-src 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}
