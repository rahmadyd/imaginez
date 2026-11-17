export type CameraMode = "mobile" | "desktop";

export function detectCameraMode(
  matchMedia?: (query: string) => { matches: boolean },
  nav?: { maxTouchPoints?: number }
): CameraMode {
  const mm =
    matchMedia ??
    ((q: string) =>
      typeof window !== "undefined" && typeof window.matchMedia === "function"
        ? window.matchMedia(q)
        : { matches: false });
  const n: { maxTouchPoints?: number } =
    nav ?? (typeof navigator !== "undefined" ? navigator : { maxTouchPoints: 0 });
  const coarse = Boolean(mm("(pointer: coarse)").matches);
  const touch = (n.maxTouchPoints ?? 0) > 0;
  return coarse && touch ? "mobile" : "desktop";
}

export function deviceLabel(device: MediaDeviceInfo, index: number): string {
  const label = (device.label || "").trim();
  return label || `Kamera ${index + 1}`;
}

export function resolveEffectiveMode(
  baseMode: CameraMode,
  facingModeSetting: string | undefined | null,
  streamActive: boolean
): CameraMode {
  if (streamActive && !facingModeSetting) return "desktop";
  return baseMode;
}
