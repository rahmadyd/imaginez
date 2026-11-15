export const CAMERA_ERROR_TYPES = [
  "denied",
  "not-found",
  "in-use",
  "insecure-context",
  "unknown",
] as const;

export type CameraErrorType = (typeof CAMERA_ERROR_TYPES)[number];

export function classifyCameraError(error: unknown): CameraErrorType {
  const name =
    typeof error === "object" && error !== null && "name" in error
      ? String((error as { name?: unknown }).name)
      : "";

  switch (name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
    case "SecurityError":
      return "denied";
    case "NotFoundError":
    case "DevicesNotFoundError":
      return "not-found";
    case "NotReadableError":
    case "TrackStartError":
      return "in-use";
    case "InsecureContextError":
      return "insecure-context";
    default:
      return "unknown";
  }
}
