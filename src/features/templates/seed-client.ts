import type { ClientTemplate, SeedTemplate } from "./schema";

const seedIds = ["strip-1x6", "grid-2x3"];

export async function loadSeedTemplates(): Promise<ClientTemplate[]> {
  const items = await Promise.all(
    seedIds.map(async (id) => {
      const res = await fetch(`/seed/${id}.json`);
      if (!res.ok) throw new Error("Gagal memuat seed");
      const t = (await res.json()) as SeedTemplate & { overlayKey?: string };
      const { overlayKey: _overlayKey, ...rest } = t;
      void _overlayKey;
      return {
        ...rest,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      } as ClientTemplate;
    })
  );
  return items;
}
