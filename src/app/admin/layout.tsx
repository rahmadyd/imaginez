import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isAllowedAdminEmail } from "@/lib/auth";
import { createSessionClient } from "@/lib/supabase/session";
import { sanitizeNextPath } from "@/lib/next-path";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSessionClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!user || !isAllowedAdminEmail(user.email)) {
    const h = await headers();
    const next = sanitizeNextPath(h.get("x-pathname")) ?? "/admin";
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }
  return <>{children}</>;
}
