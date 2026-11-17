export const TRACK_EVENT_TYPES = [
  "page_view",
  "session_completed",
  "photo_downloaded",
] as const;

export type TrackEventType = (typeof TRACK_EVENT_TYPES)[number];

export type TrackPayload = {
  event_type: TrackEventType;
  template_id?: string | null;
  filter_used?: string | null;
  export_method?: string | null;
  session_code?: string | null;
};

export function trackEvent(payload: TrackPayload): void {
  if (typeof window === "undefined") return;
  const body = JSON.stringify(payload);
  try {
    if (typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      const ok = navigator.sendBeacon("/api/track", blob);
      if (ok) return;
    }
  } catch {
    // fall through to fetch
  }
  try {
    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
      cache: "no-store",
    });
  } catch {
    // fire-and-forget: tracking must never block user flow
  }
}
