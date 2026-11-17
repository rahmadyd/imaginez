type Entry = { count: number; resetAt: number };
const buckets = new Map<string, Entry>();

export function checkRateLimit(key: string, limit = 5, windowMs = 10 * 60 * 1000): { ok: boolean; remaining: number } {
  const now = Date.now();
  const e = buckets.get(key);
  if (!e || now > e.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }
  if (e.count >= limit) return { ok: false, remaining: 0 };
  e.count += 1;
  return { ok: true, remaining: limit - e.count };
}
