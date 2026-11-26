import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isAllowedAdminEmail } from "@/lib/auth";
import { getSessionCookieOptions, getSessionEnv } from "@/lib/supabase/session";
import { buildContentSecurityPolicy } from "@/lib/csp";
import { resolveLoginTarget, sanitizeNextPath } from "@/lib/next-path";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdminPage = pathname === "/admin" || pathname.startsWith("/admin/");
  const isAdminApi = pathname === "/api/admin" || pathname.startsWith("/api/admin/");
  const isLoginPage = pathname === "/login" || pathname.startsWith("/login/");

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";
  const contentSecurityPolicy = buildContentSecurityPolicy({ nonce, isDev });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);
  requestHeaders.set("x-pathname", pathname + request.nextUrl.search);

  let response = NextResponse.next({ request: { headers: requestHeaders } });
  let authenticated = false;

  if (isAdminPage || isAdminApi || isLoginPage) {
    const env = getSessionEnv();
    if (env) {
      const supabase = createServerClient(env.url, env.key, {
        cookieOptions: getSessionCookieOptions(),
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (items, headers) => {
            for (const { name, value } of items) request.cookies.set(name, value);
            response = NextResponse.next({ request: { headers: requestHeaders } });
            for (const { name, value, options } of items) {
              response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]);
            }
            for (const [key, value] of Object.entries(headers || {})) {
              response.headers.set(key, value);
            }
          },
        },
      });
      const { data } = await supabase.auth.getUser();
      authenticated = Boolean(data.user && isAllowedAdminEmail(data.user.email));
    }
  }

  if (isAdminApi && !authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isAdminPage && !authenticated) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", sanitizeNextPath(pathname + request.nextUrl.search) ?? "/admin");
    return NextResponse.redirect(url);
  }

  if (isLoginPage && authenticated) {
    const url = request.nextUrl.clone();
    const target = resolveLoginTarget(url.searchParams.get("next"));
    const parsed = new URL(target, url.origin);
    url.pathname = parsed.pathname;
    url.search = parsed.search;
    return NextResponse.redirect(url);
  }

  response.headers.set("Content-Security-Policy", contentSecurityPolicy);
  return response;
}

export const config = {
  matcher: [
    // Route admin selalu melewati cek sesi, termasuk permintaan prefetch.
    "/admin",
    "/admin/:path*",
    "/api/admin",
    "/api/admin/:path*",
    // Sisanya: set CSP/redirect login, kecuali prefetch.
    {
      source: "/((?!_next/static|_next/image|favicon.ico|favicon.svg|manifest.json).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
