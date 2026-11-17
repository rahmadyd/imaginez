import { z } from "zod";

export const slotSchema = z.object({
  x: z.number().int("Koordinat X harus bilangan bulat").nonnegative("Koordinat X tidak boleh negatif"),
  y: z.number().int("Koordinat Y harus bilangan bulat").nonnegative("Koordinat Y tidak boleh negatif"),
  w: z.number().int("Lebar slot harus bilangan bulat").positive("Lebar slot harus lebih besar dari 0"),
  h: z.number().int("Tinggi slot harus bilangan bulat").positive("Tinggi slot harus lebih besar dari 0"),
  rotate: z.number().multipleOf(1, "Rotasi harus kelipatan 1 derajat").min(-360, "Rotasi minimal -360 derajat").max(360, "Rotasi maksimal 360 derajat").default(0),
  radius: z.number().int("Radius harus bilangan bulat").nonnegative("Radius tidak boleh negatif").default(0),
});

export const templateBaseSchema = z.object({
  id: z.string().uuid("ID harus format UUID"),
  name: z.string().min(1, "Nama template tidak boleh kosong").max(100, "Nama template maksimal 100 karakter"),
  canvas: z.object({
    w: z.number().int("Lebar canvas harus bilangan bulat").positive("Lebar canvas harus lebih besar dari 0").max(6000, "Lebar canvas maksimal 6000 piksel"),
    h: z.number().int("Tinggi canvas harus bilangan bulat").positive("Tinggi canvas harus lebih besar dari 0").max(6000, "Tinggi canvas maksimal 6000 piksel"),
  }),
  slots: z.array(slotSchema).min(1, "Template harus memiliki minimal 1 slot"),
  overlayKey: z.string().min(1, "Overlay key tidak boleh kosong"),
  baseLayerKey: z.string().min(1).optional(),
  bleed: z.number().int().nonnegative().default(0),
  background: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Background harus format hex (#RRGGBB)").default("#ffffff"),
  published: z.boolean().default(false),
  isActive: z.boolean().default(false),
  usageCount: z.number().int().nonnegative().default(0),
  sort: z.number().int().default(0),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

export const templateSchema = templateBaseSchema.refine(
  (data) => {
    for (const slot of data.slots) {
      if (slot.x + slot.w > data.canvas.w || slot.y + slot.h > data.canvas.h) {
        return false;
      }
    }
    return true;
  },
  { message: "Semua slot harus berada dalam batas canvas", path: ["slots"] }
);

export const createTemplateSchema = z.object({
  name: templateBaseSchema.shape.name,
  canvas: templateBaseSchema.shape.canvas,
  slots: templateBaseSchema.shape.slots,
  background: templateBaseSchema.shape.background,
  bleed: templateBaseSchema.shape.bleed.optional(),
  baseLayerKey: templateBaseSchema.shape.baseLayerKey,
  isActive: templateBaseSchema.shape.isActive.optional(),
  usageCount: templateBaseSchema.shape.usageCount.optional(),
});

export const updateTemplateSchema = createTemplateSchema.partial().extend({
  published: z.boolean().optional(),
  overlayKey: z.string().min(1).optional(),
  baseLayerKey: z.string().min(1).nullable().optional(),
  bleed: z.number().int().nonnegative().optional(),
  isActive: z.boolean().optional(),
  usageCount: z.number().int().nonnegative().optional(),
});

export const clientTemplateSchema = templateBaseSchema
  .omit({ overlayKey: true })
  .refine(
    (data) => {
      for (const slot of data.slots) {
        if (slot.x + slot.w > data.canvas.w || slot.y + slot.h > data.canvas.h) {
          return false;
        }
      }
      return true;
    },
    { message: "Semua slot harus berada dalam batas canvas", path: ["slots"] }
  );

export const adminTemplateSchema = templateSchema;

export type Slot = z.infer<typeof slotSchema>;
export type Template = z.infer<typeof templateSchema>;
export type ClientTemplate = z.infer<typeof clientTemplateSchema>;
export type AdminTemplate = z.infer<typeof adminTemplateSchema>;
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;

export const seedTemplateSchema = templateBaseSchema
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({ id: z.string().min(1, "ID seed tidak boleh kosong") })
  .refine(
    (data) => {
      for (const slot of data.slots) {
        if (slot.x + slot.w > data.canvas.w || slot.y + slot.h > data.canvas.h) {
          return false;
        }
      }
      return true;
    },
    { message: "Semua slot harus berada dalam batas canvas", path: ["slots"] }
  );

export type SeedTemplate = z.infer<typeof seedTemplateSchema>;
