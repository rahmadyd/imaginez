import type { ClientTemplate } from "@/features/templates/schema";

export async function fetchPublishedTemplates(): Promise<ClientTemplate[]> {
  const res = await fetch("/api/templates", { cache: "no-store" });
  if (!res.ok) throw new Error("Gagal memuat template");
  const data = (await res.json()) as { templates: ClientTemplate[] };
  return data.templates;
}
