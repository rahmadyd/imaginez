import { NextRequest, NextResponse } from "next/server";
import { reorderTemplates } from "@/lib/templates-repo";
import { isAdminRequest } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({ ids: z.array(z.string().min(1)).min(1) });

export async function PATCH(req: NextRequest) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const parsed = schema.parse(body);
  await reorderTemplates(parsed.ids);
  return NextResponse.json({ ok: true });
}
