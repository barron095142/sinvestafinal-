import "server-only";
import { getSection } from "./cms";
import { env } from "./env";

/**
 * Is this request's Origin one of ours? Checked on every state-changing call.
 *
 * Behind the public site's /admin proxy the browser's Origin is the real
 * domain (www.sinvesta.com.au) while this app sees its own *.netlify.app host,
 * so the Site URL from Global Settings is trusted along with the direct host.
 */
export async function isTrustedOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  let o: URL;
  try {
    o = new URL(origin);
  } catch {
    return false;
  }

  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (host && o.host === host) return true;

  if (process.env.NODE_ENV !== "production" && /^(localhost|127\.0\.0\.1)$/.test(o.hostname)) return true;

  const { data } = await getSection("settings");
  const site = new URL(data.siteUrl);
  const twin = site.hostname.startsWith("www.") ? site.hostname.slice(4) : `www.${site.hostname}`;
  const trusted = new Set([site.origin, `${site.protocol}//${twin}`, ...env.allowedOrigins]);
  return trusted.has(o.origin);
}
