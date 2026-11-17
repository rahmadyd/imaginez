import { describe, expect, it } from "vitest";
import { punchSlots } from "../../src/features/compositor/punch";
import type { Slot } from "../../src/features/templates/schema";

type PunchCtx = CanvasRenderingContext2D & {
  _bounds: { x: number; y: number; w: number; h: number };
  _buf: Uint8ClampedArray;
};

function makeCtx(canvas: HTMLCanvasElement, w: number, h: number, fillA: number): PunchCtx {
  const buf = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    buf[i * 4] = 10; buf[i * 4 + 1] = 20; buf[i * 4 + 2] = 30; buf[i * 4 + 3] = fillA;
  }
  const ctx = {
    canvas,
    clearRect: (x: number, y: number, cw: number, ch: number) => { for (let py=y; py<y+ch; py++) for (let px=x; px<x+cw; px++){ const i=(py*w+px)*4; buf[i]=buf[i+1]=buf[i+2]=buf[i+3]=0; } },
    drawImage: () => { for (let i = 0; i < w * h; i++) { buf[i*4]=10; buf[i*4+1]=20; buf[i*4+2]=30; buf[i*4+3]=fillA; } },
    save: () => {},
    restore: () => {},
    translate: () => {},
    rotate: () => {},
    beginPath: () => {},
    rect: () => {},
    closePath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    quadraticCurveTo: () => {},
    globalCompositeOperation: "source-over",
    fill: () => {
      if (ctx.globalCompositeOperation !== "destination-out") return;
      const b = ctx._bounds; if (!b) return;
      for (let py=b.y; py<b.y+b.h; py++) for (let px=b.x; px<b.x+b.w; px++){ if(px<0||py<0||px>=w||py>=h) continue; const i=(py*w+px)*4; buf[i+3]=0; }
    },
    getImageData: (_x: number,_y: number,gw: number,gh: number) => ({ data: buf, width: gw, height: gh } as ImageData),
    putImageData: () => {},
    _bounds: { x: 0, y: 0, w: 0, h: 0 },
    _buf: buf,
  } as unknown as PunchCtx;
  return ctx;
}

describe("punchSlots", () => {
  it("membuat lubang (alpha 0) di dalam slot dan tidak mengubah area luar", () => {
    const w=10,h=8;
    const c = { width: 0, height: 0, getContext: () => null as unknown } as unknown as HTMLCanvasElement;
    const ctx = makeCtx(c,w,h,255);
    ctx._bounds = { x: 2, y: 2, w: 4, h: 3 };
    (c as unknown as { getContext: () => PunchCtx }).getContext = () => ctx;
    const prev = globalThis.document;
    globalThis.document = { createElement: () => c } as unknown as Document;
    try {
      punchSlots({} as ImageBitmap, [{ x: 2, y: 2, w: 4, h: 3, rotate: 0, radius: 0 } as Slot], w, h);
      const d = ctx._buf;
      const at = (x:number,y:number)=>d[(y*w+x)*4+3];
      expect(at(3,3)).toBe(0);
      expect(at(0,0)).toBe(255);
      expect(at(9,7)).toBe(255);
    } finally {
      globalThis.document = prev;
    }
  });
});
