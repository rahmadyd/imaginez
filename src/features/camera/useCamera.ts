"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  buildVideoConstraints,
  type FacingMode,
} from "./constraints";
import { classifyCameraError, type CameraErrorType } from "./errors";
import { stopStream } from "./stream";

export type CameraStatus = "idle" | "starting" | "active" | "error";

export type UseCameraOptions = {
  facingMode?: FacingMode;
};

export type UseCameraResult = {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  status: CameraStatus;
  error: CameraErrorType | null;
  start: () => Promise<void>;
  stop: () => void;
  switchCamera: () => Promise<void>;
  devices: MediaDeviceInfo[];
};

export function useCamera({ facingMode = "user" }: UseCameraOptions = {}): UseCameraResult {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const facingModeRef = useRef<FacingMode>(facingMode);
  const requestRef = useRef(0);
  const mountedRef = useRef(false);

  const [status, setStatus] = useState<CameraStatus>("idle");
  const [error, setError] = useState<CameraErrorType | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      requestRef.current += 1;
      stopStream(streamRef.current);
      streamRef.current = null;
    };
  }, []);

  const refreshDevices = useCallback(async () => {
    const mediaDevices =
      typeof navigator === "undefined" ? undefined : navigator.mediaDevices;

    if (!mediaDevices?.enumerateDevices) return;

    try {
      const allDevices = await mediaDevices.enumerateDevices();
      if (!mountedRef.current) return;
      setDevices(allDevices.filter((device) => device.kind === "videoinput"));
    } catch {
      // Daftar perangkat hanya untuk tombol ganti kamera; kegagalan tidak
      // boleh membatalkan sesi kamera yang sudah aktif.
    }
  }, []);

  const start = useCallback(async () => {
    const mediaDevices =
      typeof navigator === "undefined" ? undefined : navigator.mediaDevices;
    const secureContext =
      typeof window === "undefined" || window.isSecureContext !== false;

    if (!secureContext || !mediaDevices?.getUserMedia) {
      if (!mountedRef.current) return;
      setError("insecure-context");
      setStatus("error");
      return;
    }

    const requestId = ++requestRef.current;

    setError(null);
    setStatus("starting");

    stopStream(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    try {
      const stream = await mediaDevices.getUserMedia(
        buildVideoConstraints(facingModeRef.current)
      );

      if (!mountedRef.current || requestId !== requestRef.current) {
        stopStream(stream);
        return;
      }

      streamRef.current = stream;

      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        try {
          await video.play();
        } catch {
          // Autoplay bisa ditolak; stream tetap valid dan bisa dipakai capture.
        }
      }

      if (!mountedRef.current || requestId !== requestRef.current) {
        stopStream(stream);
        if (streamRef.current === stream) streamRef.current = null;
        return;
      }

      setStatus("active");
      await refreshDevices();
    } catch (cause) {
      if (!mountedRef.current || requestId !== requestRef.current) return;
      setError(classifyCameraError(cause));
      setStatus("error");
    }
  }, [refreshDevices]);

  const stop = useCallback(() => {
    requestRef.current += 1;

    stopStream(streamRef.current);
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    if (!mountedRef.current) return;
    setError(null);
    setStatus("idle");
  }, []);

  const switchCamera = useCallback(async () => {
    facingModeRef.current =
      facingModeRef.current === "user" ? "environment" : "user";
    await start();
  }, [start]);

  return {
    videoRef,
    status,
    error,
    start,
    stop,
    switchCamera,
    devices,
  };
}
