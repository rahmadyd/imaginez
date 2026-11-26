export type FacingMode = "user" | "environment";

export type CameraRequest =
  | { kind: "facing"; facing: FacingMode; exact?: boolean }
  | { kind: "device"; deviceId: string };

export type CameraFeatures = {
  lowLight?: boolean;
  flawless?: boolean;
};

export function buildVideoConstraints(
  request: CameraRequest | FacingMode,
  features: CameraFeatures = {}
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
        ...(features.lowLight && {
          torch: true,
          exposureCompensation: { ideal: 1.0 },
        }),
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
      ...(features.lowLight && {
        torch: true,
        exposureCompensation: { ideal: 1.0 },
      }),
    },
  };
}
