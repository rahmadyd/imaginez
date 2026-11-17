export type FacingMode = "user" | "environment";

export type CameraRequest =
  | { kind: "facing"; facing: FacingMode; exact?: boolean }
  | { kind: "device"; deviceId: string };

export function buildVideoConstraints(
  request: CameraRequest | FacingMode
): MediaStreamConstraints {
  const req: CameraRequest =
    typeof request === "string" ? { kind: "facing", facing: request } : request;
  if (req.kind === "device") {
    return {
      audio: false,
      video: {
        deviceId: { exact: req.deviceId },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
    };
  }
  const facingConstraint = req.exact
    ? { exact: req.facing }
    : { ideal: req.facing };
  return {
    audio: false,
    video: {
      facingMode: facingConstraint,
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    },
  };
}
