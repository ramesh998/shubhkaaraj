/**
 * Small in-memory sliding-window limiter.
 * Good enough for a single Node process (our single-VPS deployment).
 * If you ever run several instances, swap this for Redis.
 */
const buckets = new Map<string, number[]>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): { ok: boolean; remaining: number; retryAfterSeconds: number } {
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    buckets.set(key, recent);
    const retryAfterMs = windowMs - (now - recent[0]);
    return { ok: false, remaining: 0, retryAfterSeconds: Math.ceil(retryAfterMs / 1000) };
  }
  recent.push(now);
  buckets.set(key, recent);

  // Opportunistic cleanup so the map cannot grow without bound.
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      if (v.every((t) => now - t >= windowMs)) buckets.delete(k);
    }
  }
  return { ok: true, remaining: limit - recent.length, retryAfterSeconds: 0 };
}

export function clientIp(headers: Headers): string {
  // Caddy / Cloudflare set these; the first hop is the client.
  const cf = headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return headers.get("x-real-ip")?.trim() || "unknown";
}

/** Test helper. */
export function resetRateLimits() {
  buckets.clear();
}
