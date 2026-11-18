import { createSessionClient } from "./supabase/session";

function allowedAdminEmails(): string[] {
  return (process.env.ADMIN_EMAIL || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedAdminEmail(email: string | null | undefined): boolean {
  const allowed = allowedAdminEmails();
  if (allowed.length === 0) return false;
  return allowed.includes((email || "").trim().toLowerCase());
}

export async function isAdminRequest(): Promise<boolean> {
  const supabase = await createSessionClient();
  if (!supabase) return false;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return false;
    return isAllowedAdminEmail(data.user.email);
  } catch {
    return false;
  }
}
