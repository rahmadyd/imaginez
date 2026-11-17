import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { createIdleTimer } from "../../src/features/session/idle";

describe("idle timer", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("fires onIdle after timeout and resets on activity", () => {
    const onIdle = vi.fn();
    const t = createIdleTimer({ timeoutMs: 1000, onIdle });
    const listeners: Record<string, Array<() => void>> = {};
    const w = globalThis as unknown as { window: unknown };
    w.window = {
      addEventListener: (e: string, fn: () => void) => { (listeners[e] ||= []).push(fn); },
      removeEventListener: (e: string, fn: () => void) => { listeners[e] = (listeners[e] || []).filter(f => f !== fn); },
    };
    t.start();
    vi.advanceTimersByTime(900);
    expect(onIdle).not.toHaveBeenCalled();
    (listeners["pointerdown"] || []).forEach(f => f());
    vi.advanceTimersByTime(900);
    expect(onIdle).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(onIdle).toHaveBeenCalledOnce();
    t.stop();
  });
});
