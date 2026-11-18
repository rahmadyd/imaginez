import { NextResponse } from "next/server";
import { createSessionClient } from "@/lib/supabase/session";

export async function POST() {
  const supabase = await createSessionClient();
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch {
      return NextResponse.json({ ok: true });
    }
  }
  return NextResponse.json({ ok: true });
}
