export type IdleOptions = {
  timeoutMs?: number;
  onIdle: () => void;
};

export function createIdleTimer({ timeoutMs = 180_000, onIdle }: IdleOptions) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let active = false;

  const clear = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const schedule = () => {
    clear();
    if (!active) return;
    timer = setTimeout(() => {
      if (active) onIdle();
    }, timeoutMs);
  };

  const activity = () => {
    if (!active) return;
    schedule();
  };

  const events: (keyof WindowEventMap)[] = [
    "pointerdown",
    "keydown",
    "touchstart",
    "mousemove",
  ];

  const start = () => {
    if (active) return;
    active = true;
    events.forEach((e) => window.addEventListener(e, activity, { passive: true }));
    window.addEventListener("pagehide", onIdle);
    schedule();
  };

  const stop = () => {
    active = false;
    clear();
    events.forEach((e) => window.removeEventListener(e, activity));
    window.removeEventListener("pagehide", onIdle);
  };

  return { start, stop, reset: activity };
}
