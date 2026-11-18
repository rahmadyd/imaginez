import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export type SessionEnv = { url: string; key: string };

export function getSessionEnv(): SessionEnv | null {
  const url = process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return { url, key };
}

export async function createSessionClient() {
  const env = getSessionEnv();
  if (!env) return null;
  const store = await cookies();
  return createServerClient(env.url, env.key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (items) => {
        try {
          for (const { name, value, options } of items) {
            store.set(name, value, options as Parameters<typeof store.set>[2]);
          }
        } catch {
          return;
        }
      },
    },
  });
}
