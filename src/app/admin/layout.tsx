import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionCookieName, isAdminAuthenticated } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(getSessionCookieName())?.value;
  if (!isAdminAuthenticated(token)) {
    redirect("/login");
  }
  return <>{children}</>;
}