/**
 * Applies the admin's published config to a static HTML page. Pure string
 * work with no Netlify APIs, so it can be unit-tested with plain Node.
 *
 * The admin pre-renders and escapes every value; this file only splices.
 * Every .replace() that inserts a dynamic value uses a function, because a
 * string replacement treats "$1", "$&" etc. specially: prices and pasted
 * scripts contain "$".
 */

export interface PageConfig {
  headHtml: string;
  jsonLd: string | null;
}
export interface SiteConfig {
  version: string;
  pages: Record<string, PageConfig>;
  overrides: { html: Record<string, string>; src: Record<string, string>; aria: Record<string, string> };
  replacements: [string, string][];
  mapSrc: string;
  headHtml: string;
  bodyStartHtml: string;
  bodyEndHtml: string;
}

/** "/", "/index.html", "/packages", "/packages.html" → page id */
export function pageIdFor(pathname: string) {
  const slug = pathname.replace(/^\/+|\/+$/g, "").replace(/\.html$/, "");
  return slug === "" || slug === "index" ? "home" : slug;
}

const attrEsc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/** Index just past the matching close tag of the element opening at `start`. */
function elementEnd(html: string, start: number, tag: string, openEnd: number) {
  const re = new RegExp(`<(/?)${tag}\\b[^>]*>`, "gi");
  re.lastIndex = openEnd;
  let depth = 1;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) return { innerEnd: m.index, end: re.lastIndex };
  }
  return null;
}

function replaceInner(html: string, key: string, inner: string) {
  const open = new RegExp(`<([a-z0-9]+)\\b[^>]*\\sdata-cms="${key.replace(/\./g, "\\.")}"[^>]*>`, "gi");
  let out = "";
  let cursor = 0;
  let m: RegExpExecArray | null;
  while ((m = open.exec(html))) {
    const openEnd = m.index + m[0].length;
    const close = elementEnd(html, m.index, m[1], openEnd);
    if (!close) continue;
    out += html.slice(cursor, openEnd) + inner;
    cursor = close.innerEnd;
    open.lastIndex = close.innerEnd;
  }
  return out + html.slice(cursor);
}

function replaceAttr(html: string, hook: string, key: string, attr: string, fn: (old: string) => string) {
  const re = new RegExp(`<[a-z0-9]+\\b[^>]*\\s${hook}="${key.replace(/\./g, "\\.")}"[^>]*>`, "gi");
  const attrRe = new RegExp(`(\\s${attr}=")([^"]*)(")`, "i");
  return html.replace(re, (tag) => tag.replace(attrRe, (_, a, old, z) => a + fn(old) + z));
}

export function transformHtml(html: string, pathname: string, cfg: SiteConfig) {
  const page = cfg.pages[pageIdFor(pathname)];

  // 1. Page content overrides (data-cms hooks)
  for (const [key, inner] of Object.entries(cfg.overrides.html)) html = replaceInner(html, key, inner);
  for (const [key, src] of Object.entries(cfg.overrides.src)) {
    html = replaceAttr(html, "data-cms-src", key, "src", () => attrEsc(src));
  }
  for (const [key, phrase] of Object.entries(cfg.overrides.aria)) {
    html = replaceAttr(html, "data-cms-aria", key, "aria-label", (old) =>
      old.replace(/\$[\d,]+ incl\. GST(, was \$[\d,]+, save \$[\d,]+)?/, () => attrEsc(phrase)),
    );
  }

  // 2. Contact map
  if (cfg.mapSrc) {
    html = html.replace(/(<iframe\b[^>]*\ssrc=")https:\/\/www\.google\.[^"]*\/maps[^"]*(")/i, (_, a, z) => a + attrEsc(cfg.mapSrc) + z);
  }

  // 3. SEO head: drop what the CMS owns, then insert the CMS version
  if (page) {
    html = html
      .replace(/<title>[\s\S]*?<\/title>\s*/i, "")
      .replace(/<meta\s+(?:name|property)="(?:description|keywords|robots|og:[^"]+|twitter:[^"]+)"[^>]*>\s*/gi, "")
      .replace(/<link\s+rel="canonical"[^>]*>\s*/gi, "");
    if (page.jsonLd) html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\s*/gi, "");
  }
  const head = [page?.headHtml, page?.jsonLd, cfg.headHtml].filter(Boolean).join("\n");
  if (head) html = html.replace(/<\/head>/i, () => `${head}\n</head>`);

  // 4. Body scripts
  if (cfg.bodyStartHtml) html = html.replace(/<body\b[^>]*>/i, (b) => `${b}\n${cfg.bodyStartHtml}`);
  if (cfg.bodyEndHtml) html = html.replace(/<\/body>(?![\s\S]*<\/body>)/i, () => `${cfg.bodyEndHtml}\n</body>`);

  // 5. Changed phone / email / address, everywhere they're hard-coded (runs last
  //    so SEO text inserted above picks up the new details too)
  for (const [from, to] of cfg.replacements) html = html.split(from).join(to);

  return html;
}
