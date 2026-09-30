import "server-only";

/**
 * Fixed-window limiter held in memory. On serverless each warm instance has
 * its own window, so treat this as a speed bump, not a guarantee — bcrypt's
 * cost and the login delay do the heavy lifting against brute force.
 */
const hits = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  entry.count++;
  if (hits.size > 5000) for (const [k, v] of hits) if (v.resetAt < now) hits.delete(k);
  return { ok: entry.count <= limit, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
}

export function resetRateLimit(key: string) {
  hits.delete(key);
}
