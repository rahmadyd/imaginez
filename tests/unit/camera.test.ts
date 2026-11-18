// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildVideoConstraints } from "../../src/features/camera/constraints";
import { classifyCameraError } from "../../src/features/camera/errors";
import { stopStream } from "../../src/features/camera/stream";
import { useCamera } from "../../src/features/camera/useCamera";

type MockTrack = MediaStreamTrack & { stop: ReturnType<typeof vi.fn>; getSettings?: () => MediaTrackSettings };

const getUserMedia = vi.fn();
const enumerateDevices = vi.fn();
const addEventListener = vi.fn();
const removeEventListener = vi.fn();
let originalMediaDevices: PropertyDescriptor | undefined;
let originalSecureContext: PropertyDescriptor | undefined;
let originalMatchMedia: typeof window.matchMedia | undefined;

function createTrack(settings: MediaTrackSettings = {}): MockTrack {
  return { stop: vi.fn(), kind: "video", getSettings: () => settings } as unknown as MockTrack;
}

function createStream(tracks: MockTrack[]): MediaStream {
  return {
    getTracks: () => tracks,
    getVideoTracks: () => tracks,
  } as unknown as MediaStream;
}

beforeEach(() => {
  getUserMedia.mockReset();
  enumerateDevices.mockReset();
  addEventListener.mockReset();
  removeEventListener.mockReset();
  localStorage.clear();
  originalMediaDevices = Object.getOwnPropertyDescriptor(navigator, "mediaDevices");
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia, enumerateDevices, addEventListener, removeEventListener },
  });
  originalSecureContext = Object.getOwnPropertyDescriptor(window, "isSecureContext");
  Object.defineProperty(window, "isSecureContext", { configurable: true, value: true });
  originalMatchMedia = window.matchMedia;
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({ matches: false, media: q })) as unknown as typeof window.matchMedia;
  Object.defineProperty(navigator, "maxTouchPoints", { configurable: true, value: 0 });
  enumerateDevices.mockResolvedValue([]);
  Object.defineProperty(HTMLMediaElement.prototype, "play", { configurable: true, writable: true, value: vi.fn().mockResolvedValue(undefined) });
  Object.defineProperty(HTMLMediaElement.prototype, "srcObject", { configurable: true, writable: true, value: null });
});

afterEach(() => {
  if (originalMediaDevices) Object.defineProperty(navigator, "mediaDevices", originalMediaDevices);
  else Reflect.deleteProperty(navigator, "mediaDevices");
  if (originalSecureContext) Object.defineProperty(window, "isSecureContext", originalSecureContext);
  else Reflect.deleteProperty(window, "isSecureContext");
  if (originalMatchMedia) window.matchMedia = originalMatchMedia;
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
    ["AbortError", "in-use"],
    ["InsecureContextError", "insecure-context"],
    ["OverconstrainedError", "not-found"],
    ["ConstraintNotSatisfiedError", "not-found"],
    ["SomethingElse", "unknown"],
    [undefined, "unknown"],
  ])("memetakan error %s menjadi %s", (name, expected) => {
    expect(classifyCameraError(name === undefined ? new Error("x") : { name })).toBe(expected);
  });

  it("constraint facing ideal 1920x1080", () => {
    expect(buildVideoConstraints("user")).toEqual({
      audio: false,
      video: { facingMode: { ideal: "user" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
    });
  });
  it("constraint facing exact", () => {
    expect(buildVideoConstraints({ kind: "facing", facing: "environment", exact: true })).toEqual({
      audio: false,
      video: { facingMode: { exact: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
    });
  });
  it("constraint deviceId exact", () => {
    expect(buildVideoConstraints({ kind: "device", deviceId: "cam2" })).toEqual({
      audio: false,
      video: { deviceId: { exact: "cam2" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
    });
  });

  it("stopStream menghentikan semua track", () => {
    const tracks = [createTrack(), createTrack()];
    stopStream(createStream(tracks));
    for (const track of tracks) expect(track.stop).toHaveBeenCalledTimes(1);
  });
});

describe("useCamera", () => {
  it("start memasang stream ke video dan menjadi active", async () => {
    const stream = createStream([createTrack({ facingMode: "user", deviceId: "d1" })]);
    getUserMedia.mockResolvedValue(stream);
    const { result } = renderHook(() => useCamera());
    const video = document.createElement("video");
    result.current.videoRef.current = video;
    await act(async () => { await result.current.start(); });
    expect(result.current.status).toBe("active");
    expect(result.current.error).toBeNull();
    expect(video.srcObject).toBe(stream);
    expect(result.current.activeDeviceId).toBe("d1");
  });

  it("stop menghentikan track, melepas video, dan kembali idle", async () => {
    const tracks = [createTrack(), createTrack()];
    getUserMedia.mockResolvedValue(createStream(tracks));
    const { result } = renderHook(() => useCamera());
    await act(async () => { await result.current.start(); });
    act(() => { result.current.stop(); });
    for (const track of tracks) expect(track.stop).toHaveBeenCalled();
    expect(result.current.status).toBe("idle");
    expect(result.current.error).toBeNull();
  });

  it("switchFacing coba exact lalu fallback ideal bila overconstrained", async () => {
    const first = createStream([createTrack({ facingMode: "user" })]);
    const second = createStream([createTrack({ facingMode: "environment" })]);
    getUserMedia
      .mockResolvedValueOnce(first)
      .mockRejectedValueOnce(Object.assign(new Error("x"), { name: "OverconstrainedError" }))
      .mockResolvedValueOnce(second);
    const { result } = renderHook(() => useCamera());
    await act(async () => { await result.current.start(); });
    await act(async () => { await result.current.switchFacing(); });
    expect(getUserMedia).toHaveBeenNthCalledWith(2, buildVideoConstraints({ kind: "facing", facing: "environment", exact: true }));
    expect(getUserMedia).toHaveBeenNthCalledWith(3, buildVideoConstraints({ kind: "facing", facing: "environment", exact: false }));
    expect(first.getTracks()[0].stop).toHaveBeenCalled();
    expect(result.current.facing).toBe("environment");
  });

  it("selectDevice memakai deviceId exact dan melepas stream lama", async () => {
    const first = createStream([createTrack({ deviceId: "a" })]);
    const second = createStream([createTrack({ deviceId: "b" })]);
    getUserMedia.mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    const { result } = renderHook(() => useCamera());
    await act(async () => { await result.current.start(); });
    await act(async () => { await result.current.selectDevice("b"); });
    expect(getUserMedia).toHaveBeenLastCalledWith(buildVideoConstraints({ kind: "device", deviceId: "b" }));
    expect(first.getTracks()[0].stop).toHaveBeenCalled();
  });

  it("refreshDevices mengisi videoinput setelah start", async () => {
    getUserMedia.mockResolvedValue(createStream([createTrack()]));
    enumerateDevices.mockResolvedValue([
      { kind: "videoinput", deviceId: "1", label: "", groupId: "", toJSON: () => ({}) },
      { kind: "audioinput", deviceId: "a", label: "mic", groupId: "", toJSON: () => ({}) },
    ]);
    const { result } = renderHook(() => useCamera());
    await act(async () => { await result.current.start(); });
    expect(result.current.devices).toHaveLength(1);
    expect(result.current.devices[0].deviceId).toBe("1");
  });

  it("devicechange memicu fallback saat kamera aktif hilang", async () => {
    const first = createStream([createTrack({ deviceId: "a", facingMode: "user" })]);
    const fallback = createStream([createTrack({ deviceId: "b", facingMode: "user" })]);
    getUserMedia.mockResolvedValueOnce(first).mockResolvedValueOnce(fallback);
    enumerateDevices
      .mockResolvedValueOnce([{ kind: "videoinput", deviceId: "a", label: "A", groupId: "", toJSON: () => ({}) }])
      .mockResolvedValueOnce([{ kind: "videoinput", deviceId: "b", label: "B", groupId: "", toJSON: () => ({}) }])
      .mockResolvedValue([{ kind: "videoinput", deviceId: "b", label: "B", groupId: "", toJSON: () => ({}) }]);
    const { result } = renderHook(() => useCamera());
    await act(async () => { await result.current.start(); });
    const call = addEventListener.mock.calls.find((c) => c[0] === "devicechange");
    expect(call).toBeTruthy();
    const handler = call![1] as () => Promise<void>;
    await act(async () => { await handler(); });
    await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(2));
    expect(first.getTracks()[0].stop).toHaveBeenCalled();
  });

  it.each([
    ["NotAllowedError", "denied"],
    ["NotFoundError", "not-found"],
    ["NotReadableError", "in-use"],
    ["UnknownError", "unknown"],
  ])("error %s menghasilkan state %s", async (name, expected) => {
    getUserMedia.mockRejectedValue(new DOMException("gagal", name));
    const { result } = renderHook(() => useCamera());
    await act(async () => { await result.current.start(); });
    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe(expected);
  });

  it("konteks tidak aman menghasilkan insecure-context", async () => {
    Object.defineProperty(window, "isSecureContext", { configurable: true, value: false });
    const { result } = renderHook(() => useCamera());
    await act(async () => { await result.current.start(); });
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(result.current.error).toBe("insecure-context");
  });

  it("unmount menghentikan stream aktif", async () => {
    const track = createTrack();
    getUserMedia.mockResolvedValue(createStream([track]));
    const { result, unmount } = renderHook(() => useCamera());
    await act(async () => { await result.current.start(); });
    unmount();
    expect(track.stop).toHaveBeenCalled();
  });

  it("setVideoElement memasang stream yang sudah terbuka pada video yang mount belakangan", async () => {
    const stream = createStream([createTrack()]);
    getUserMedia.mockResolvedValue(stream);
    const { result } = renderHook(() => useCamera());
    await act(async () => { await result.current.start(); });
    const video = document.createElement("video");
    act(() => { result.current.setVideoElement(video); });
    expect(video.srcObject).toBe(stream);
  });

  it("start paralel hanya membuka satu stream", async () => {
    const stream = createStream([createTrack()]);
    getUserMedia.mockResolvedValue(stream);
    const { result } = renderHook(() => useCamera());
    await act(async () => { await Promise.all([result.current.start(), result.current.start()]); });
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe("active");
  });

  it("stop saat start berjalan menutup stream yang telat tiba", async () => {
    let resolveStream: (s: MediaStream) => void = () => {};
    getUserMedia.mockImplementation(() => new Promise<MediaStream>((resolve) => { resolveStream = resolve; }));
    const { result } = renderHook(() => useCamera());
    let pending: Promise<void> = Promise.resolve();
    act(() => { pending = result.current.start(); });
    act(() => { result.current.stop(); });
    const late = createStream([createTrack()]);
    resolveStream(late);
    await act(async () => { await pending; });
    expect(late.getTracks()[0].stop).toHaveBeenCalled();
    expect(result.current.status).toBe("idle");
  });

  it("start setelah switch tidak menyisakan stream lama hidup", async () => {
    const first = createStream([createTrack({ deviceId: "a" })]);
    const second = createStream([createTrack({ deviceId: "b" })]);
    getUserMedia.mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    const { result } = renderHook(() => useCamera());
    await act(async () => { await result.current.start(); });
    await act(async () => { await result.current.selectDevice("b"); });
    expect(first.getTracks()[0].stop).toHaveBeenCalledTimes(1);
    expect(second.getTracks()[0].stop).not.toHaveBeenCalled();
  });
});

