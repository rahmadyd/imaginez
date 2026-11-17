import { describe, expect, it } from "vitest";
import { detectSlotsFromImageData } from "../../src/features/admin/auto-detect";

function makeImage(w: number, h: number, holes: {x:number;y:number;w:number;h:number}[]): Uint8ClampedArray {
  const data = new Uint8ClampedArray(w * h * 4);
  // opaque white
  for (let i = 0; i < w*h; i++) { data[i*4]=255; data[i*4+1]=255; data[i*4+2]=255; data[i*4+3]=255; }
  for (const hole of holes) {
    for (let y = hole.y; y < hole.y + hole.h && y < h; y++) {
      for (let x = hole.x; x < hole.x + hole.w && x < w; x++) {
        data[(y*w + x)*4 + 3] = 0; // transparent
      }
    }
  }
  return data;
}

function makeTiltedDiamond(w: number, h: number, cx: number, cy: number, r: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(w*h*4);
  for (let i=0;i<w*h;i++){ data[i*4]=255;data[i*4+1]=255;data[i*4+2]=255;data[i*4+3]=255; }
  for (let y=0;y<h;y++) for (let x=0;x<w;x++) {
    if (Math.abs(x-cx)+Math.abs(y-cy) <= r) data[(y*w+x)*4+3]=0;
  }
  return data;
}

describe("auto-detect slots", () => {
  it("detects 1x6 strip", () => {
    const holes = Array.from({length:6}, (_,i)=>({x:100,y:50+i*500,w:1000,h:450}));
    const data = makeImage(1200, 3050, holes);
    const slots = detectSlotsFromImageData(data, 1200, 3050);
    expect(slots).toHaveLength(6);
    // reading order top->bottom
    for (let i=1;i<slots.length;i++) expect(slots[i].y).toBeGreaterThanOrEqual(slots[i-1].y);
  });

  it("detects 2x3 grid in reading order", () => {
    const holes = [
      {x:50,y:50,w:500,h:500},{x:650,y:50,w:500,h:500},
      {x:50,y:650,w:500,h:500},{x:650,y:650,w:500,h:500},
      {x:50,y:1250,w:500,h:500},{x:650,y:1250,w:500,h:500},
    ];
    const data = makeImage(1200, 1800, holes);
    const slots = detectSlotsFromImageData(data, 1200, 1800);
    expect(slots).toHaveLength(6);
    // rows: first row two left-to-right
    expect(slots[0].x).toBeLessThan(slots[1].x);
    expect(slots[2].x).toBeLessThan(slots[3].x);
  });

  it("handles tilted/diamond hole with warning", () => {
    const data = makeTiltedDiamond(800, 800, 400, 400, 180);
    const slots = detectSlotsFromImageData(data, 800, 800);
    expect(slots.length).toBe(1);
    expect(slots[0].warning).toBeTruthy();
  });

  it("ignores small specks", () => {
    const holes = [{x:200,y:200,w:400,h:400}];
    const data = makeImage(800, 800, holes);
    // add tiny speck
    for (let y=10;y<14;y++) for (let x=10;x<14;x++) data[(y*800+x)*4+3]=0;
    const slots = detectSlotsFromImageData(data, 800, 800);
    expect(slots.length).toBe(1);
  });
});
