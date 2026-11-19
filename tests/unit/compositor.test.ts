import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderStrip } from "../../src/features/compositor/render";
import type { Template } from "../../src/features/templates/schema";

function makeCanvasCtx() {
  const calls = { drawImage: [] as unknown[][], fillText: [] as unknown[][], rect: [] as unknown[][] };
  const ctx = {
    scale: vi.fn(),
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    strokeRect: vi.fn(),
    drawImage: vi.fn((...args: unknown[]) => { calls.drawImage.push(args); }),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    beginPath: vi.fn(),
    rect: vi.fn((...args: unknown[]) => { calls.rect.push(args); }),
    clip: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    fill: vi.fn(),
    fillText: vi.fn((...args: unknown[]) => { calls.fillText.push(args); }),
    globalCompositeOperation: "source-over",
    set fillStyle(_v: string) {},
    set strokeStyle(_v: string) {},
    set lineWidth(_v: number) {},
    set font(_v: string) {},
    set textAlign(_v: string) {},
    set textBaseline(_v: string) {},
  } as unknown as CanvasRenderingContext2D;
  return { ctx, calls };
}

function makePhoto(w = 100, h = 100) {
  return { width: w, height: h, close: vi.fn() } as unknown as ImageBitmap;
}

const template: Pick<Template, "canvas" | "slots" | "background"> = {
  canvas: { w: 400, h: 600 },
  background: "#ffffff",
  slots: [
    { x: 10, y: 10, w: 100, h: 80, rotate: 0, radius: 0 },
    { x: 10, y: 100, w: 100, h: 80, rotate: 90, radius: 0 },
  ],
};

describe("renderStrip", () => {
  let ctxObj: ReturnType<typeof makeCanvasCtx>;
  beforeEach(() => {
    ctxObj = makeCanvasCtx();
    vi.stubGlobal("document", {
      createElement: vi.fn(() => {
        const c = {
          width: 0,
          height: 0,
          getContext: vi.fn(() => ctxObj.ctx),
        };
        return c;
      }),
    });
  });

  it("melempar error jika jumlah foto tidak sama dengan jumlah slot", () => {
    expect(() => renderStrip(template, [makePhoto()], makePhoto(400, 600))).toThrow(/tidak sama/);
  });

  it("membuat canvas dengan dimensi yang sesuai", () => {
    const canvas = renderStrip(template, [makePhoto(), makePhoto()], makePhoto(400, 600));
    expect(canvas.width).toBe(400);
    expect(canvas.height).toBe(600);
  });

  it("menerapkan skala jika diberikan", () => {
    const canvas = renderStrip(template, [makePhoto(), makePhoto()], makePhoto(400, 600), { scale: 0.5 });
    expect(canvas.width).toBe(200);
    expect(canvas.height).toBe(300);
  });

  it("mengisi background terlebih dahulu", () => {
    renderStrip(template, [makePhoto(), makePhoto()], makePhoto(400, 600));
    expect((ctxObj.ctx.fillRect as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(0, 0, 400, 600);
  });

  it("menggambar foto ke setiap slot lalu overlay di atas", () => {
    renderStrip(template, [makePhoto(), makePhoto()], makePhoto(400, 600));
    expect((ctxObj.ctx.save as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
    expect((ctxObj.ctx.rotate as ReturnType<typeof vi.fn>).mock.calls.length).toBe(2);
    // 2 foto + 1 overlay utuh digambar di atas
    expect(ctxObj.calls.drawImage.length).toBe(3);
  });

  it("menggambar overlay di atas foto", () => {
    const overlay = makePhoto(400, 600);
    renderStrip(template, [makePhoto(), makePhoto()], overlay);
    expect(ctxObj.calls.drawImage.length).toBe(3);
  });

  it("melewatkan slot jika foto tidak ada (null/undefined)", () => {
    renderStrip(template, [makePhoto(), null as unknown as ImageBitmap], makePhoto(400, 600));
    // 1 foto + 1 overlay
    expect(ctxObj.calls.drawImage.length).toBe(2);
  });

  it("menaruh foto di belakang overlay secara default", () => {
    const overlay = makePhoto(400, 600);
    renderStrip(template, [makePhoto(), makePhoto()], overlay);
    const overlayCall = ctxObj.calls.drawImage.findIndex((args) => args[0] === overlay);
    const photoCalls = ctxObj.calls.drawImage.map((args, i) => (args[0] === overlay ? -1 : i)).filter((i) => i >= 0);
    expect(overlayCall).toBeGreaterThan(Math.max(...photoCalls));
  });

  it("menaruh foto di depan overlay saat photoPosition = front", () => {
    const overlay = makePhoto(400, 600);
    renderStrip({ ...template, photoPosition: "front" }, [makePhoto(), makePhoto()], overlay);
    const overlayCall = ctxObj.calls.drawImage.findIndex((args) => args[0] === overlay);
    const photoCalls = ctxObj.calls.drawImage.map((args, i) => (args[0] === overlay ? -1 : i)).filter((i) => i >= 0);
    expect(overlayCall).toBeLessThan(Math.min(...photoCalls));
  });

  it("memakai posisi behind sebagai nilai bawaan template lama", () => {
    const overlay = makePhoto(400, 600);
    renderStrip(template, [makePhoto(), makePhoto()], overlay);
    const overlayCall = ctxObj.calls.drawImage.findIndex((args) => args[0] === overlay);
    expect(overlayCall).toBe(2);
  });

  it("tidak menggambar label tanggal meski diberikan (dinonaktifkan)", () => {
    renderStrip(template, [makePhoto(), makePhoto()], makePhoto(400, 600), { dateLabel: "16/11/2026" });
    expect(ctxObj.calls.fillText.length).toBe(0);
  });
});
