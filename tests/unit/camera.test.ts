// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildVideoConstraints } from "../../src/features/camera/constraints";
import { classifyCameraError } from "../../src/features/camera/errors";
import { stopStream } from "../../src/features/camera/stream";
import { useCamera } from "../../src/features/camera/useCamera";

type MockTrack = MediaStreamTrack & { stop: ReturnType<typeof vi.fn> };

const getUserMedia = vi.fn();
const enumerateDevices = vi.fn();
let originalMediaDevices: PropertyDescriptor | undefined;
let originalSecureContext: PropertyDescriptor | undefined;

function createTrack(): MockTrack {
  return { stop: vi.fn(), kind: "video" } as unknown as MockTrack;
}

function createStream(tracks: MockTrack[]): MediaStream {
  return {
    getTracks: () => tracks,
    getVideoTracks: () => tracks,
  } as unknown as MediaStream;
}

beforeEach(() => {
  vi.clearAllMocks();

  originalMediaDevices = Object.getOwnPropertyDescriptor(navigator, "mediaDevices");
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia, enumerateDevices },
  });

  originalSecureContext = Object.getOwnPropertyDescriptor(
    window,
    "isSecureContext"
  );
  Object.defineProperty(window, "isSecureContext", {
    configurable: true,
    value: true,
  });

  enumerateDevices.mockResolvedValue([]);
  Object.defineProperty(HTMLMediaElement.prototype, "play", {
    configurable: true,
    writable: true,
    value: vi.fn().mockResolvedValue(undefined),
  });
  Object.defineProperty(HTMLMediaElement.prototype, "srcObject", {
    configurable: true,
    writable: true,
    value: null,
  });
});

afterEach(() => {
  if (originalMediaDevices) {
    Object.defineProperty(navigator, "mediaDevices", originalMediaDevices);
  } else {
    Reflect.deleteProperty(navigator, "mediaDevices");
  }

  if (originalSecureContext) {
    Object.defineProperty(window, "isSecureContext", originalSecureContext);
  } else {
    Reflect.deleteProperty(window, "isSecureContext");
  }
});

describe("helper kamera", () => {
  it.each([
    ["NotAllowedError", "denied"],
    ["PermissionDeniedError", "denied"],
    ["SecurityError", "denied"],
    ["NotFoundError", "not-found"],
    ["DevicesNotFoundError", "not-found"],
    ["NotReadableError", "in-use"],
    ["TrackStartError", "in-use"],
    ["InsecureContextError", "insecure-context"],
    ["SomethingElse", "unknown"],
    [undefined, "unknown"],
  ])("memetakan error %s menjadi %s", (name, expected) => {
    expect(classifyCameraError(name === undefined ? new Error("x") : { name })).toBe(
      expected
    );
  });

  it("memakai constraint awal user 1920x1080 tanpa audio", () => {
    expect(buildVideoConstraints("user")).toEqual({
      audio: false,
      video: {
        facingMode: { ideal: "user" },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
    });
  });

  it("stopStream menghentikan semua track", () => {
    const tracks = [createTrack(), createTrack()];

    stopStream(createStream(tracks));

    for (const track of tracks) {
      expect(track.stop).toHaveBeenCalledTimes(1);
    }
  });
});

describe("useCamera", () => {
  it("start memasang stream ke video dan menjadi active", async () => {
    const stream = createStream([createTrack()]);
    getUserMedia.mockResolvedValue(stream);

    const { result } = renderHook(() => useCamera());
    const video = document.createElement("video");
    result.current.videoRef.current = video;

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.status).toBe("active");
    expect(result.current.error).toBeNull();
    expect(video.srcObject).toBe(stream);
    expect(getUserMedia).toHaveBeenCalledWith(buildVideoConstraints("user"));
  });

  it("stop menghentikan track, melepas video, dan kembali idle", async () => {
    const tracks = [createTrack(), createTrack()];
    getUserMedia.mockResolvedValue(createStream(tracks));

    const { result } = renderHook(() => useCamera());
    const video = document.createElement("video");
    result.current.videoRef.current = video;

    await act(async () => {
      await result.current.start();
    });

    act(() => {
      result.current.stop();
    });

    for (const track of tracks) {
      expect(track.stop).toHaveBeenCalled();
    }
    expect(video.srcObject).toBeNull();
    expect(result.current.status).toBe("idle");
    expect(result.current.error).toBeNull();
  });

  it("switchCamera meminta facingMode environment dan melepas stream lama", async () => {
    const firstTracks = [createTrack()];
    getUserMedia
      .mockResolvedValueOnce(createStream(firstTracks))
      .mockResolvedValueOnce(createStream([createTrack()]));

    const { result } = renderHook(() => useCamera());

    await act(async () => {
      await result.current.start();
    });
    await act(async () => {
      await result.current.switchCamera();
    });

    expect(getUserMedia).toHaveBeenNthCalledWith(
      2,
      buildVideoConstraints("environment")
    );
    expect(firstTracks[0].stop).toHaveBeenCalled();
    expect(result.current.status).toBe("active");
  });

  it.each([
    ["NotAllowedError", "denied"],
    ["NotFoundError", "not-found"],
    ["NotReadableError", "in-use"],
    ["UnknownError", "unknown"],
  ])("error %s menghasilkan state %s", async (name, expected) => {
    getUserMedia.mockRejectedValue(new DOMException("gagal", name));

    const { result } = renderHook(() => useCamera());

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe(expected);
  });

  it("konteks tidak aman menghasilkan insecure-context tanpa memanggil kamera", async () => {
    Object.defineProperty(window, "isSecureContext", {
      configurable: true,
      value: false,
    });

    const { result } = renderHook(() => useCamera());

    await act(async () => {
      await result.current.start();
    });

    expect(getUserMedia).not.toHaveBeenCalled();
    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe("insecure-context");
  });

  it("unmount menghentikan stream yang masih aktif", async () => {
    const track = createTrack();
    getUserMedia.mockResolvedValue(createStream([track]));

    const { result, unmount } = renderHook(() => useCamera());

    await act(async () => {
      await result.current.start();
    });

    unmount();

    expect(track.stop).toHaveBeenCalled();
  });
});
