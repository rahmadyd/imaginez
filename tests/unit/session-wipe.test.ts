import { describe, expect, it, vi } from "vitest";
import { wipeBitmaps, revokeUrls, clearCanvases, stopMediaStream, wipe } from "../../src/features/session/wipe";

describe("wipe helpers", () => {
  it("closes bitmaps", () => {
    const close = vi.fn();
    wipeBitmaps([{ close } as unknown as ImageBitmap, null]);
    expect(close).toHaveBeenCalledOnce();
  });
  it("revokes blob urls only", () => {
    const revoke = vi.fn();
    const orig = URL.revokeObjectURL;
    URL.revokeObjectURL = revoke as typeof URL.revokeObjectURL;
    revokeUrls(["blob:abc", "https://x"]);
    expect(revoke).toHaveBeenCalledTimes(1);
    URL.revokeObjectURL = orig;
  });
  it("clears canvases", () => {
    const c = { width: 100, height: 50 } as HTMLCanvasElement;
    clearCanvases([c]);
    expect(c.width).toBe(0);
    expect(c.height).toBe(0);
  });
  it("stops media stream tracks", () => {
    const stop = vi.fn();
    stopMediaStream({ getTracks: () => [{ stop }] } as unknown as MediaStream);
    expect(stop).toHaveBeenCalledOnce();
  });
  it("wipe aggregates", () => {
    const close = vi.fn();
    const stop = vi.fn();
    wipe({ photos: [{ close } as unknown as ImageBitmap], stream: { getTracks: () => [{ stop }] } as unknown as MediaStream });
    expect(close).toHaveBeenCalled();
    expect(stop).toHaveBeenCalled();
  });
});
