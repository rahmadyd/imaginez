import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionCookieName, isAdminAuthenticated } from "@/lib/auth";
import { sanitizeNextPath } from "@/lib/next-path";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(getSessionCookieName())?.value;
  if (!isAdminAuthenticated(token)) {
    const h = await headers();
    const next = sanitizeNextPath(h.get("x-pathname")) ?? "/admin";
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }
  return <>{children}</>;
}
