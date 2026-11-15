export type FacingMode = "user" | "environment";

export function buildVideoConstraints(
  facingMode: FacingMode
): MediaStreamConstraints {
  return {
    audio: false,
    video: {
      facingMode: { ideal: facingMode },
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    },
  };
}
