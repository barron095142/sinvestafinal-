import type { Config, Context } from "@netlify/edge-functions";
import { getConfig } from "./lib/config.ts";
import { transformHtml } from "./lib/transform.ts";

/**
 * Applies content, SEO and tracking settings from the /admin CMS to every
 * HTML page as it is served. The static files stay the source of truth for
 * layout; the CMS only swaps the values it owns.
 */
export default async (request: Request, context: Context) => {
  const response = await context.next();
  if (!response.headers.get("content-type")?.includes("text/html")) return response;

  const url = new URL(request.url);
  const config = await getConfig(url.origin);
  if (!config) return response;

  const html = transformHtml(await response.text(), url.pathname, config);
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.delete("etag");
  headers.set("x-cms-version", config.version);
  return new Response(html, { status: response.status, headers });
};

export const config: Config = {
  path: "/*",
  excludedPath: ["/admin", "/admin/*", "/assets/*", "/sitemap.xml", "/robots.txt", "/*.ico", "/*.png", "/*.jpg", "/*.webp", "/*.css", "/*.js"],
  // Any failure here serves the original static page instead of an error.
  onError: "bypass",
};
