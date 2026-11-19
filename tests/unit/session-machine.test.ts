import { describe, expect, it } from "vitest";
import { initialSessionState, transition } from "../../src/features/session/machine";

function template(slots = 2) {
  return {
    id: "t1",
    name: "Test",
    canvas: { w: 100, h: 100 },
    slots: Array.from({ length: slots }, (_, i) => ({ x: i * 10, y: 0, w: 10, h: 10, rotate: 0, radius: 0 })),
    bleed: 0,
    background: "#ffffff",
    photoPosition: "behind" as const,
    published: true,
    isActive: true,
    usageCount: 0,
    sort: 0,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  };
}

function bmp(): ImageBitmap {
  return { close: () => {} } as unknown as ImageBitmap;
}

describe("session machine", () => {
  it("idle -> choosing", () => {
    const s = transition(initialSessionState, { type: "ENTER_CHOOSING" });
    expect(s.phase).toBe("choosing");
  });

  it("rejects illegal transitions", () => {
    expect(() => transition(initialSessionState, { type: "GRANT_PERMISSION" })).toThrow();
    expect(() => transition({ ...initialSessionState, phase: "choosing" }, { type: "START_CAPTURE" })).toThrow();
  });

  it("full flow to reviewing", () => {
    let s = transition(initialSessionState, { type: "ENTER_CHOOSING" });
    s = transition(s, { type: "SELECT_TEMPLATE", template: template(2) });
    expect(s.photos).toHaveLength(2);
    s = transition(s, { type: "GRANT_PERMISSION" });
    s = transition(s, { type: "START_CAPTURE" });
    s = transition(s, { type: "CAPTURE_PHOTO", slot: 0, photo: bmp() });
    s = transition(s, { type: "CAPTURE_PHOTO", slot: 1, photo: bmp() });
    s = transition(s, { type: "CAPTURE_COMPLETE" });
    expect(s.phase).toBe("reviewing");
  });

  it("cannot complete before all filled", () => {
    let s = transition(initialSessionState, { type: "ENTER_CHOOSING" });
    s = transition(s, { type: "SELECT_TEMPLATE", template: template(2) });
    s = transition(s, { type: "GRANT_PERMISSION" });
    s = transition(s, { type: "START_CAPTURE" });
    s = transition(s, { type: "CAPTURE_PHOTO", slot: 0, photo: bmp() });
    expect(() => transition(s, { type: "CAPTURE_COMPLETE" })).toThrow();
  });

  it("retake slot and retake all", () => {
    let s = transition(initialSessionState, { type: "ENTER_CHOOSING" });
    s = transition(s, { type: "SELECT_TEMPLATE", template: template(2) });
    s = transition(s, { type: "GRANT_PERMISSION" });
    s = transition(s, { type: "START_CAPTURE" });
    s = transition(s, { type: "CAPTURE_PHOTO", slot: 0, photo: bmp() });
    s = transition(s, { type: "CAPTURE_PHOTO", slot: 1, photo: bmp() });
    s = transition(s, { type: "CAPTURE_COMPLETE" });
    s = transition(s, { type: "RETAKE_SLOT", slot: 1 });
    expect(s.phase).toBe("capturing");
    expect(s.activeSlot).toBe(1);
    s = transition(s, { type: "CAPTURE_PHOTO", slot: 1, photo: bmp() });
    s = transition(s, { type: "CAPTURE_COMPLETE" });
    s = transition(s, { type: "RETAKE_ALL" });
    expect(s.phase).toBe("capturing");
    expect(s.photos.every((p) => p === null)).toBe(true);
  });

  it("finish and reset", () => {
    let s = transition(initialSessionState, { type: "ENTER_CHOOSING" });
    s = transition(s, { type: "SELECT_TEMPLATE", template: template(1) });
    s = transition(s, { type: "GRANT_PERMISSION" });
    s = transition(s, { type: "START_CAPTURE" });
    s = transition(s, { type: "CAPTURE_PHOTO", slot: 0, photo: bmp() });
    s = transition(s, { type: "CAPTURE_COMPLETE" });
    s = transition(s, { type: "FINISH" });
    expect(s.phase).toBe("done");
    expect(s.photos).toEqual([]);
  });

  it("alur galeri: permission -> filling -> reviewing tanpa kamera", () => {
    let s = transition(initialSessionState, { type: "ENTER_CHOOSING" });
    s = transition(s, { type: "SELECT_TEMPLATE", template: template(2) });
    s = transition(s, { type: "GRANT_PERMISSION" });
    s = transition(s, { type: "START_GALLERY" });
    expect(s.phase).toBe("filling");
    expect(s.mode).toBe("gallery");
    s = transition(s, { type: "CAPTURE_PHOTO", slot: 0, photo: bmp() });
    expect(s.phase).toBe("filling");
    s = transition(s, { type: "CAPTURE_PHOTO", slot: 1, photo: bmp() });
    s = transition(s, { type: "CAPTURE_COMPLETE" });
    expect(s.phase).toBe("reviewing");
    expect(s.mode).toBe("gallery");
  });

  it("retake pada sesi galeri kembali ke filling, bukan capturing", () => {
    let s = transition(initialSessionState, { type: "ENTER_CHOOSING" });
    s = transition(s, { type: "SELECT_TEMPLATE", template: template(2) });
    s = transition(s, { type: "GRANT_PERMISSION" });
    s = transition(s, { type: "START_GALLERY" });
    s = transition(s, { type: "CAPTURE_PHOTO", slot: 0, photo: bmp() });
    s = transition(s, { type: "CAPTURE_PHOTO", slot: 1, photo: bmp() });
    s = transition(s, { type: "CAPTURE_COMPLETE" });
    s = transition(s, { type: "RETAKE_SLOT", slot: 1 });
    expect(s.phase).toBe("filling");
    expect(s.activeSlot).toBe(1);
    expect(s.photos[1]).toBeNull();
    s = transition(s, { type: "CAPTURE_PHOTO", slot: 1, photo: bmp() });
    s = transition(s, { type: "CAPTURE_COMPLETE" });
    s = transition(s, { type: "RETAKE_ALL" });
    expect(s.phase).toBe("filling");
    expect(s.photos.every((p) => p === null)).toBe(true);
  });

  it("galeri bisa beralih ke kamera secara sadar", () => {
    let s = transition(initialSessionState, { type: "ENTER_CHOOSING" });
    s = transition(s, { type: "SELECT_TEMPLATE", template: template(2) });
    s = transition(s, { type: "GRANT_PERMISSION" });
    s = transition(s, { type: "START_GALLERY" });
    s = transition(s, { type: "CAPTURE_PHOTO", slot: 0, photo: bmp() });
    s = transition(s, { type: "START_CAPTURE" });
    expect(s.phase).toBe("capturing");
    expect(s.mode).toBe("camera");
    expect(s.activeSlot).toBe(1);
  });

  it("menolak mulai galeri dari fase selain permission", () => {
    expect(() => transition(initialSessionState, { type: "START_GALLERY" })).toThrow();
  });
});
