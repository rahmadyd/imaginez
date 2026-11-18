"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { buildVideoConstraints, type CameraRequest, type FacingMode } from "./constraints";
import { classifyCameraError, type CameraErrorType } from "./errors";
import { detectCameraMode, resolveEffectiveMode, type CameraMode } from "./mode";
import { stopStream } from "./stream";

export type CameraStatus = "idle" | "starting" | "active" | "error";

export type UseCameraOptions = {
  initialFacing?: FacingMode;
};

export type UseCameraResult = {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  setVideoElement: (el: HTMLVideoElement | null) => void;
  status: CameraStatus;
  error: CameraErrorType | null;
  start: (request?: CameraRequest) => Promise<void>;
  stop: () => void;
  mode: CameraMode;
  facing: FacingMode;
  devices: MediaDeviceInfo[];
  activeDeviceId: string | null;
  previewMirrored: boolean;
  setPreviewMirrored: (v: boolean) => void;
  mirrored: boolean;
  switchFacing: () => Promise<void>;
  selectDevice: (id: string) => Promise<void>;
  refreshDevices: () => Promise<MediaDeviceInfo[]>;
  notice: string | null;
  clearNotice: () => void;
};

const STORAGE_KEY = "pb:camera";

type StoredPref = { mode?: CameraMode; facing?: FacingMode; deviceId?: string; mirrorPreview?: boolean };

function readPref(): StoredPref {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const v = JSON.parse(raw) as StoredPref;
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

function writePref(pref: StoredPref) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pref)); } catch { /* ignore */ }
}

export function useCamera({ initialFacing = "user" }: UseCameraOptions = {}): UseCameraResult {
  const initialPref = readPref();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestRef = useRef(0);
  const startingRef = useRef(false);
  const mountedRef = useRef(false);
  const prefRef = useRef<StoredPref>(initialPref);

  const [status, setStatus] = useState<CameraStatus>("idle");
  const [error, setError] = useState<CameraErrorType | null>(null);
  const [baseMode, setBaseMode] = useState<CameraMode>(() => detectCameraMode());
  const [facing, setFacing] = useState<FacingMode>(
    initialPref.facing === "user" || initialPref.facing === "environment" ? initialPref.facing : initialFacing
  );
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null);
  const [facingSetting, setFacingSetting] = useState<string | null | undefined>(undefined);
  const [previewMirrored, setPreviewMirroredState] = useState<boolean>(
    typeof initialPref.mirrorPreview === "boolean" ? initialPref.mirrorPreview : true
  );
  const [notice, setNotice] = useState<string | null>(null);
  const statusRef = useRef(status);
  const activeDeviceIdRef = useRef(activeDeviceId);
  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { activeDeviceIdRef.current = activeDeviceId; }, [activeDeviceId]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestRef.current += 1;
      stopStream(streamRef.current);
      streamRef.current = null;
    };
  }, []);

  const setPreviewMirrored = useCallback((v: boolean) => {
    setPreviewMirroredState(v);
    prefRef.current = { ...prefRef.current, mirrorPreview: v };
    writePref(prefRef.current);
  }, []);

  const clearNotice = useCallback(() => setNotice(null), []);

  const refreshDevices = useCallback(async (): Promise<MediaDeviceInfo[]> => {
    const mediaDevices = typeof navigator === "undefined" ? undefined : navigator.mediaDevices;
    if (!mediaDevices?.enumerateDevices) return [];
    try {
      const all = await mediaDevices.enumerateDevices();
      const vids = all.filter((d) => d.kind === "videoinput");
      if (mountedRef.current) setDevices(vids);
      return vids;
    } catch {
      return [];
    }
  }, []);

  const attachStream = useCallback((video: HTMLVideoElement | null) => {
    const stream = streamRef.current;
    if (!video || !stream) return;
    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }
    if (!video.paused) return;
    void video.play().catch(() => {
      window.setTimeout(() => { void video.play().catch(() => { /* autoplay may be blocked */ }); }, 250);
    });
  }, []);

  const setVideoElement = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
    attachStream(el);
  }, [attachStream]);

  const applyStream = useCallback(async (stream: MediaStream) => {
    streamRef.current = stream;
    const track = stream.getVideoTracks()[0];
    const settings = track?.getSettings?.();
    const devId = settings?.deviceId ?? track?.getSettings?.().deviceId ?? null;
    const fm = (settings as MediaTrackSettings | undefined)?.facingMode as string | undefined;
    if (mountedRef.current) {
      setActiveDeviceId(devId ?? null);
      setFacingSetting(fm ?? null);
      if (fm === "user" || fm === "environment") {
        setFacing(fm);
        prefRef.current = { ...prefRef.current, facing: fm };
      }
    }
    attachStream(videoRef.current);
  }, [attachStream]);

  const openStream = useCallback(async (request: CameraRequest): Promise<MediaStream> => {
    const mediaDevices = typeof navigator === "undefined" ? undefined : navigator.mediaDevices;
    if (!mediaDevices?.getUserMedia) throw Object.assign(new Error("no media"), { name: "InsecureContextError" });
    if (request.kind === "facing" && request.exact) {
      try {
        return await mediaDevices.getUserMedia(buildVideoConstraints({ kind: "facing", facing: request.facing, exact: true }));
      } catch (e) {
        const name = (e as { name?: string })?.name;
        if (name === "OverconstrainedError" || name === "ConstraintNotSatisfiedError") {
          return mediaDevices.getUserMedia(buildVideoConstraints({ kind: "facing", facing: request.facing, exact: false }));
        }
        throw e;
      }
    }
    return mediaDevices.getUserMedia(buildVideoConstraints(request));
  }, []);

  const start = useCallback(async (request?: CameraRequest) => {
    const secureContext = typeof window === "undefined" || window.isSecureContext !== false;
    if (!secureContext) {
      if (mountedRef.current) { setError("insecure-context"); setStatus("error"); }
      return;
    }
    if (startingRef.current) return;
    startingRef.current = true;
    const reqId = ++requestRef.current;
    setError(null);
    setStatus("starting");
    stopStream(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    try {
      const effRequest: CameraRequest = request ?? { kind: "facing", facing };
      const stream = await openStream(effRequest);
      if (!mountedRef.current || reqId !== requestRef.current) { stopStream(stream); return; }
      await applyStream(stream);
      if (!mountedRef.current || reqId !== requestRef.current) {
        stopStream(stream); if (streamRef.current === stream) streamRef.current = null; return;
      }
      const vids = await refreshDevices();
      const track = stream.getVideoTracks()[0];
      const s = track?.getSettings?.() as MediaTrackSettings | undefined;
      const fm = s?.facingMode as string | undefined;
      const did = s?.deviceId ?? null;
      if (mountedRef.current) {
        setFacingSetting(fm ?? null);
        setActiveDeviceId(did);
        setStatus("active");
        setBaseMode(detectCameraMode());
        prefRef.current = { ...prefRef.current, facing: fm === "environment" ? "environment" : fm === "user" ? "user" : facing, deviceId: did ?? undefined, mode: detectCameraMode() };
        writePref(prefRef.current);
      }
      void vids;
    } catch (cause) {
      if (!mountedRef.current || reqId !== requestRef.current) return;
      setError(classifyCameraError(cause));
      setStatus("error");
    } finally {
      startingRef.current = false;
    }
  }, [applyStream, facing, openStream, refreshDevices]);

  const stop = useCallback(() => {
    startingRef.current = false;
    requestRef.current += 1;
    stopStream(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    if (!mountedRef.current) return;
    setError(null);
    setStatus("idle");
    setActiveDeviceId(null);
    setFacingSetting(undefined);
  }, []);

  const switchFacing = useCallback(async () => {
    const next: FacingMode = facing === "user" ? "environment" : "user";
    setFacing(next);
    await start({ kind: "facing", facing: next, exact: true });
  }, [facing, start]);

  const selectDevice = useCallback(async (id: string) => {
    await start({ kind: "device", deviceId: id });
  }, [start]);

  useEffect(() => {
    const md = typeof navigator === "undefined" ? undefined : navigator.mediaDevices;
    if (!md?.addEventListener) return;
    const onChange = async () => {
      const vids = await refreshDevices();
      const active = activeDeviceIdRef.current;
      const st = statusRef.current;
      if (active && vids.length > 0 && !vids.some(d => d.deviceId === active)) {
        if (st === "active" || st === "starting") {
          setNotice("Kamera sebelumnya tidak tersedia. Beralih ke kamera lain.");
          await start({ kind: "facing", facing: "user" });
        }
      }
    };
    md.addEventListener("devicechange", onChange);
    return () => md.removeEventListener("devicechange", onChange);
  }, [refreshDevices, start]);

  const mode = resolveEffectiveMode(baseMode, facingSetting, status === "active");

  // Kamera depan (selfie) otomatis cermin, kamera belakang tidak; desktop memakai toggle manual.
  const mirrored = facing === "environment" ? false : baseMode === "mobile" ? true : previewMirrored;

  return {
    videoRef,
    setVideoElement,
    status,
    error,
    start,
    stop,
    mode,
    facing,
    devices,
    activeDeviceId,
    previewMirrored,
    setPreviewMirrored,
    mirrored,
    switchFacing,
    selectDevice,
    refreshDevices,
    notice,
    clearNotice,
  };
}
