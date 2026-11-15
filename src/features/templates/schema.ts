import { z } from "zod";
import type { Slot, Template } from "./types";

export const slotSchema: z.ZodType<Slot> = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  w: z.number().positive("Lebar slot harus lebih besar dari 0"),
  h: z.number().positive("Tinggi slot harus lebih besar dari 0"),
  rotate: z.number().finite().default(0),
});

export const templateSchema: z.ZodType<Template> = z
  .object({
    id: z.string().min(1, "ID template tidak boleh kosong"),
    name: z.string().min(1, "Nama template tidak boleh kosong"),
    canvas: z.object({
      w: z.number().int().positive("Lebar canvas harus lebih besar dari 0"),
      h: z.number().int().positive("Tinggi canvas harus lebih besar dari 0"),
    }),
    slots: z
      .array(slotSchema)
      .min(1, "Template harus memiliki minimal satu slot foto"),
    overlayKey: z.string().min(1, "Kunci overlay tidak boleh kosong"),
    background: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, "Format warna background harus hex #rrggbb")
      .default("#ffffff"),
    published: z.boolean().default(false),
    sort: z.number().int().default(0),
  })
  .refine(
    (tpl) => {
      return tpl.slots.every((slot) => isSlotInsideCanvas(slot, tpl.canvas));
    },
    {
      message: "Semua slot harus berada di dalam batas canvas template",
      path: ["slots"],
    }
  );

export function isSlotInsideCanvas(
  slot: Slot,
  canvas: { w: number; h: number }
): boolean {
  if (slot.rotate === 0) {
    return (
      slot.x >= 0 &&
      slot.y >= 0 &&
      slot.x + slot.w <= canvas.w &&
      slot.y + slot.h <= canvas.h
    );
  }

  const rad = (slot.rotate * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const bbW = slot.w * cos + slot.h * sin;
  const bbH = slot.w * sin + slot.h * cos;
  const cx = slot.x + slot.w / 2;
  const cy = slot.y + slot.h / 2;
  const minX = cx - bbW / 2;
  const maxX = cx + bbW / 2;
  const minY = cy - bbH / 2;
  const maxY = cy + bbH / 2;

  return (
    minX >= -1e-4 &&
    minY >= -1e-4 &&
    maxX <= canvas.w + 1e-4 &&
    maxY <= canvas.h + 1e-4
  );
}

export function slotAspect(slot: { w: number; h: number }): number {
  if (slot.h === 0) return 1;
  return slot.w / slot.h;
}
