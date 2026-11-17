import { describe, expect, it } from "vitest";
import { detectCameraMode, deviceLabel, resolveEffectiveMode } from "../../src/features/camera/mode";

describe("camera mode", () => {
  it("mobile when coarse pointer and touch", () => {
    expect(detectCameraMode(() => ({ matches: true }), { maxTouchPoints: 5 })).toBe("mobile");
  });
  it("desktop when not coarse", () => {
    expect(detectCameraMode(() => ({ matches: false }), { maxTouchPoints: 5 })).toBe("desktop");
  });
  it("desktop when no touch points", () => {
    expect(detectCameraMode(() => ({ matches: true }), { maxTouchPoints: 0 })).toBe("desktop");
  });
  it("desktop fallback when facingMode empty on active stream", () => {
    expect(resolveEffectiveMode("mobile", undefined, true)).toBe("desktop");
    expect(resolveEffectiveMode("mobile", "", true)).toBe("desktop");
  });
  it("keeps base mode when facingMode known", () => {
    expect(resolveEffectiveMode("mobile", "user", true)).toBe("mobile");
  });
});

describe("device labels", () => {
  it("uses label when present", () => {
    expect(deviceLabel({ deviceId: "1", label: "USB Cam", kind: "videoinput", groupId: "", toJSON: () => ({}) }, 0)).toBe("USB Cam");
  });
  it("falls back to Kamera N when empty", () => {
    expect(deviceLabel({ deviceId: "1", label: "", kind: "videoinput", groupId: "", toJSON: () => ({}) }, 0)).toBe("Kamera 1");
    expect(deviceLabel({ deviceId: "2", label: "", kind: "videoinput", groupId: "", toJSON: () => ({}) }, 2)).toBe("Kamera 3");
  });
});
