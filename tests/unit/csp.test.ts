import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy } from "../../src/lib/csp";

function directive(csp: string, name: string): string | undefined {
  return csp
    .split("; ")
    .find((part) => part === name || part.startsWith(`${name} `));
}

describe("buildContentSecurityPolicy", () => {
  it("produksi memakai nonce dan strict-dynamic tanpa unsafe-inline/eval", () => {
    const csp = buildContentSecurityPolicy({ nonce: "abc123", isDev: false });

    expect(directive(csp, "script-src")).toBe(
      "script-src 'self' 'nonce-abc123' 'strict-dynamic'"
    );
    expect(directive(csp, "connect-src")).toBe("connect-src 'self'");
  });

  it("dev mengizinkan inline/eval dan WebSocket HMR lokal", () => {
    const csp = buildContentSecurityPolicy({ nonce: "abc123", isDev: true });

    expect(directive(csp, "script-src")).toBe(
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    );
    expect(directive(csp, "connect-src")).toBe(
      "connect-src 'self' ws://localhost:*"
    );
  });

  it("memuat semua directive privasi dan resource", () => {
    const csp = buildContentSecurityPolicy({ nonce: "abc123", isDev: false });

    expect(directive(csp, "default-src")).toBe("default-src 'self'");
    expect(directive(csp, "style-src")).toBe(
      "style-src 'self' 'unsafe-inline'"
    );
    expect(directive(csp, "img-src")).toBe("img-src 'self' blob: data:");
    expect(directive(csp, "media-src")).toBe("media-src 'self' blob:");
    expect(directive(csp, "font-src")).toBe("font-src 'self'");
    expect(directive(csp, "frame-ancestors")).toBe("frame-ancestors 'none'");
  });
});
