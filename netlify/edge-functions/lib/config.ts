import type { SiteConfig } from "./transform.ts";

/**
 * Fetches the admin's public config through the site's own /admin proxy,
 * with an in-memory cache per edge isolate. If the admin is unreachable the
 * last good copy is used; with none, callers serve the page untouched.
 */
const TTL_MS = 30_000;
const TIMEOUT_MS = 1500;

let cached: { at: number; data: SiteConfig } | null = null;
let inflight: Promise<SiteConfig | null> | null = null;

async function load(origin: string): Promise<SiteConfig | null> {
  try {
    const res = await fetch(new URL("/admin/api/public/site-config", origin), {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { accept: "application/json" },
    });
    if (!res.ok) throw new Error(`site-config ${res.status}`);
    const data = (await res.json()) as SiteConfig;
    cached = { at: Date.now(), data };
    return data;
  } catch (err) {
    console.log("[cms] using fallback config:", String(err));
    return cached?.data ?? null;
  } finally {
    inflight = null;
  }
}

export async function getConfig(origin: string) {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.data;
  inflight ??= load(origin);
  return inflight;
}

export async function getText(origin: string, path: string) {
  const res = await fetch(new URL(path, origin), { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.text();
}
