"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import type { ClientTemplate } from "@/features/templates/schema";
import { initialSessionState, transition } from "./machine";
import { wipe } from "./wipe";
import { createIdleTimer } from "./idle";

export function useSession() {
  const [state, baseDispatch] = useReducer(transition, initialSessionState);
  const [idleWarning, setIdleWarning] = useState(false);
  const photosRef = useRef<(ImageBitmap | null)[]>([]);
  const blobUrlsRef = useRef<string[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasesRef = useRef<HTMLCanvasElement[]>([]);
  const idleRef = useRef<ReturnType<typeof createIdleTimer> | null>(null);
  const warnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    photosRef.current = state.photos;
  }, [state.photos]);

  const doWipe = useCallback(() => {
    wipe({
      photos: photosRef.current,
      blobUrls: blobUrlsRef.current,
      canvases: canvasesRef.current,
      stream: streamRef.current,
    });
    photosRef.current = [];
    blobUrlsRef.current = [];
    canvasesRef.current = [];
    streamRef.current = null;
  }, []);

  const reset = useCallback(() => {
    doWipe();
    baseDispatch({ type: "RESET" });
  }, [doWipe]);

  const clearWarn = useCallback(() => {
    setIdleWarning(false);
    if (warnTimerRef.current) { clearTimeout(warnTimerRef.current); warnTimerRef.current = null; }
  }, []);

  const finish = useCallback(() => {
    clearWarn();
    doWipe();
    baseDispatch({ type: "FINISH" });
  }, [doWipe, clearWarn]);

  useEffect(() => {
    idleRef.current = createIdleTimer({ timeoutMs: 300_000, onIdle: finish });
    return () => idleRef.current?.stop();
  }, [finish]);

  useEffect(() => {
    const idle = idleRef.current;
    if (!idle) return;
    const active = state.phase !== "idle" && state.phase !== "done";
    if (active) {
      idle.start();
    } else {
      idle.stop();
      if (warnTimerRef.current) { clearTimeout(warnTimerRef.current); warnTimerRef.current = null; }
    }
  }, [state.phase]);

  const isActivePhase = state.phase !== "idle" && state.phase !== "done";

  useEffect(() => {
    const active = state.phase !== "idle" && state.phase !== "done";
    if (!active) return;
    const activity = () => {
      clearWarn();
      if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
      warnTimerRef.current = setTimeout(() => setIdleWarning(true), 240_000);
    };
    const events: (keyof WindowEventMap)[] = ["pointerdown", "keydown", "touchstart", "mousemove"];
    events.forEach((e) => window.addEventListener(e, activity, { passive: true }));
    activity();
    return () => {
      events.forEach((e) => window.removeEventListener(e, activity));
      if (warnTimerRef.current) { clearTimeout(warnTimerRef.current); warnTimerRef.current = null; }
    };
  }, [state.phase, clearWarn]);

  const enterChoosing = useCallback(() => baseDispatch({ type: "ENTER_CHOOSING" }), []);
  const selectTemplate = useCallback(
    (template: ClientTemplate) => {
      doWipe();
      baseDispatch({ type: "SELECT_TEMPLATE", template });
    },
    [doWipe]
  );
  const grantPermission = useCallback(() => baseDispatch({ type: "GRANT_PERMISSION" }), []);
  const startCapture = useCallback(() => baseDispatch({ type: "START_CAPTURE" }), []);
  const capturePhoto = useCallback(
    (slot: number, photo: ImageBitmap) => baseDispatch({ type: "CAPTURE_PHOTO", slot, photo }),
    []
  );
  const captureComplete = useCallback(() => baseDispatch({ type: "CAPTURE_COMPLETE" }), []);
  const retakeSlot = useCallback((slot: number) => {
    const prev = photosRef.current[slot];
    if (prev) {
      try { prev.close(); } catch { /* ignore */ }
    }
    baseDispatch({ type: "RETAKE_SLOT", slot });
  }, []);
  const retakeAll = useCallback(() => {
    for (const p of photosRef.current) {
      if (p) { try { p.close(); } catch { /* ignore */ } }
    }
    photosRef.current = [];
    baseDispatch({ type: "RETAKE_ALL" });
  }, []);
  const setError = useCallback((error: string) => baseDispatch({ type: "SET_ERROR", error }), []);
  const clearError = useCallback(() => baseDispatch({ type: "CLEAR_ERROR" }), []);
  const registerBlobUrl = useCallback((url: string) => { blobUrlsRef.current.push(url); }, []);
  const registerCanvas = useCallback((c: HTMLCanvasElement) => { canvasesRef.current.push(c); }, []);
  const registerStream = useCallback((s: MediaStream | null) => { streamRef.current = s; }, []);

  const dismissIdleWarning = useCallback(() => {
    clearWarn();
    idleRef.current?.reset();
  }, [clearWarn]);

  return {
    state,
    enterChoosing,
    selectTemplate,
    grantPermission,
    startCapture,
    capturePhoto,
    captureComplete,
    retakeSlot,
    retakeAll,
    finish,
    reset,
    setError,
    clearError,
    registerBlobUrl,
    registerCanvas,
    registerStream,
    idleWarning: idleWarning && isActivePhase,
    dismissIdleWarning,
  };
}
