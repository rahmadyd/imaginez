import { describe, expect, it } from "vitest";
import {
  slotSchema,
  templateSchema,
  createTemplateSchema,
  updateTemplateSchema,
  clientTemplateSchema,
} from "../../src/features/templates/schema";

describe("template schemas", () => {
  const validSlot = {
    x: 100,
    y: 100,
    w: 500,
    h: 400,
    rotate: 0,
  };

  const validTemplate = {
    id: "123e4567-e89b-12d3-a456-426614174000",
    name: "Test Template",
    canvas: { w: 1200, h: 1800 },
    slots: [validSlot],
    overlayKey: "test.png",
    background: "#ffffff",
    published: true,
    sort: 1,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  };

  describe("slotSchema", () => {
    it("menerima slot valid", () => {
      expect(() => slotSchema.parse(validSlot)).not.toThrow();
    });

    it("menolak koordinat negatif", () => {
      const invalid = { ...validSlot, x: -10 };
      expect(() => slotSchema.parse(invalid)).toThrow("Koordinat X tidak boleh negatif");
    });

    it("menolak lebar 0 atau negatif", () => {
      const invalid = { ...validSlot, w: 0 };
      expect(() => slotSchema.parse(invalid)).toThrow("Lebar slot harus lebih besar dari 0");
    });

    it("menolak tinggi 0 atau negatif", () => {
      const invalid = { ...validSlot, h: 0 };
      expect(() => slotSchema.parse(invalid)).toThrow("Tinggi slot harus lebih besar dari 0");
    });

    it("menerima rotasi dalam rentang -360 sampai 360", () => {
      expect(() => slotSchema.parse({ ...validSlot, rotate: 45 })).not.toThrow();
      expect(() => slotSchema.parse({ ...validSlot, rotate: -90 })).not.toThrow();
      expect(() => slotSchema.parse({ ...validSlot, rotate: 361 })).toThrow("Rotasi maksimal 360 derajat");
      expect(() => slotSchema.parse({ ...validSlot, rotate: -361 })).toThrow("Rotasi minimal -360 derajat");
    });

    it("default rotasi = 0", () => {
      const slotWithoutRotate = { x: 100, y: 100, w: 500, h: 400 };
      const parsed = slotSchema.parse(slotWithoutRotate);
      expect(parsed.rotate).toBe(0);
    });
  });

  describe("templateSchema", () => {
    it("menerima template valid", () => {
      expect(() => templateSchema.parse(validTemplate)).not.toThrow();
    });

    it("menolak template tanpa slot", () => {
      const invalid = { ...validTemplate, slots: [] };
      expect(() => templateSchema.parse(invalid)).toThrow("Template harus memiliki minimal 1 slot");
    });

    it("menolak slot di luar canvas", () => {
      const slotOutside = { ...validSlot, x: 1000, w: 300 }; // x + w = 1300 > canvas.w = 1200
      const invalid = { ...validTemplate, slots: [slotOutside] };
      expect(() => templateSchema.parse(invalid)).toThrow("Semua slot harus berada dalam batas canvas");
    });

    it("menolak slot dengan y di luar canvas", () => {
      const slotOutside = { ...validSlot, y: 1500, h: 400 }; // y + h = 1900 > canvas.h = 1800
      const invalid = { ...validTemplate, slots: [slotOutside] };
      expect(() => templateSchema.parse(invalid)).toThrow("Semua slot harus berada dalam batas canvas");
    });

    it("menolak background format hex salah", () => {
      const invalid = { ...validTemplate, background: "not-hex" };
      expect(() => templateSchema.parse(invalid)).toThrow("Background harus format hex (#RRGGBB)");
    });

    it("menerima background default #ffffff", () => {
      const templateWithoutBg = { ...validTemplate };
      // Hapus background untuk test default
      const { background, ...rest } = templateWithoutBg;
      const parsed = templateSchema.parse(rest);
      expect(parsed.background).toBe("#ffffff");
    });

    it("menolak ID bukan UUID", () => {
      const invalid = { ...validTemplate, id: "not-a-uuid" };
      expect(() => templateSchema.parse(invalid)).toThrow("ID harus format UUID");
    });

    it("menolak nama kosong", () => {
      const invalid = { ...validTemplate, name: "" };
      expect(() => templateSchema.parse(invalid)).toThrow("Nama template tidak boleh kosong");
    });

    it("menolak nama terlalu panjang", () => {
      const invalid = { ...validTemplate, name: "a".repeat(101) };
      expect(() => templateSchema.parse(invalid)).toThrow("Nama template maksimal 100 karakter");
    });

    it("menolak canvas terlalu besar", () => {
      const invalid = { ...validTemplate, canvas: { w: 7000, h: 5000 } };
      expect(() => templateSchema.parse(invalid)).toThrow("Lebar canvas maksimal 6000 piksel");
    });
  });

  describe("createTemplateSchema", () => {
    it("menerima input pembuatan template valid", () => {
      const createInput = {
        name: "New Template",
        canvas: { w: 1200, h: 1800 },
        slots: [validSlot],
        background: "#f0f0f0",
      };
      expect(() => createTemplateSchema.parse(createInput)).not.toThrow();
    });

    it("tidak memerlukan ID, timestamps, atau overlayKey", () => {
      const createInput = {
        name: "New Template",
        canvas: { w: 1200, h: 1800 },
        slots: [validSlot],
      };
      expect(() => createTemplateSchema.parse(createInput)).not.toThrow();
    });
  });

  describe("updateTemplateSchema", () => {
    it("menerima update partial", () => {
      const updateInput = {
        name: "Updated Name",
        published: false,
      };
      expect(() => updateTemplateSchema.parse(updateInput)).not.toThrow();
    });

    it("boleh hanya update satu field", () => {
      const updateInput = {
        published: true,
      };
      expect(() => updateTemplateSchema.parse(updateInput)).not.toThrow();
    });
  });

  describe("clientTemplateSchema", () => {
    it("menghilangkan overlayKey dari output", () => {
      const parsed = clientTemplateSchema.parse(validTemplate);
      expect(parsed).not.toHaveProperty("overlayKey");
      expect(parsed).toHaveProperty("id");
      expect(parsed).toHaveProperty("name");
      expect(parsed).toHaveProperty("slots");
    });

    it("tetap memvalidasi struktur lainnya", () => {
      const invalid = { ...validTemplate, name: "" };
      expect(() => clientTemplateSchema.parse(invalid)).toThrow("Nama template tidak boleh kosong");
    });
  });
});