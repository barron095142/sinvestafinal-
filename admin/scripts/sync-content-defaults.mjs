// Reads every data-cms hook in the public HTML and writes its current value to
// src/lib/content-defaults.json, so the Content Manager always opens on what
// the live pages actually say. Re-run after editing the HTML by hand:
//   npm run sync-content
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(here, "../../SINVESTA MODERN FINAL WEB");
const OUT = path.resolve(here, "../src/lib/content-defaults.json");

/** innerHTML of the element whose opening tag starts at `start`, honouring nesting. */
function innerHtml(html, start) {
  const open = /^<([a-z0-9]+)\b[^>]*>/i.exec(html.slice(start));
  const tag = open[1].toLowerCase();
  const re = new RegExp(`<(/?)${tag}\\b[^>]*>`, "gi");
  re.lastIndex = start + open[0].length;
  let depth = 1, m;
  while ((m = re.exec(html))) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) return html.slice(start + open[0].length, m.index);
  }
  throw new Error("Unclosed <" + tag + ">");
}

const decode = (s) =>
  s.replace(/&nbsp;/g, " ").replace(/&rsquo;/g, "’").replace(/&middot;/g, "·")
   .replace(/&times;/g, "×").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
   .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const tidy = (s) => s.replace(/\s+/g, " ").trim();

const out = {};
for (const file of fs.readdirSync(SITE).filter((f) => f.endsWith(".html"))) {
  const html = fs.readFileSync(path.join(SITE, file), "utf8");
  for (const m of html.matchAll(/<[a-z0-9]+\b[^>]*\sdata-cms(-src|-aria)?="([^"]+)"[^>]*>/gi)) {
    const [tagText, kind, key] = m;
    if (key in out) continue; // first occurrence wins (packages page is read after index for shared keys)
    if (kind === "-src") out[key] = /\ssrc="([^"]*)"/.exec(tagText)[1];
    else if (kind === "-aria" || key.endsWith(".save")) continue; // derived from prices
    else out[key] = tidy(innerHtml(html, m.index));
  }
}
// Plain-text fields are stored decoded; rich fields keep their tags.
for (const k of Object.keys(out)) {
  if (!/\.(title|note)$/.test(k) && !out[k].includes("<")) out[k] = decode(out[k]);
  if (/\.(now|was)$/.test(k)) out[k] = Number(out[k].replace(/[^\d.]/g, "")) || 0;
}
const sorted = Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
fs.writeFileSync(OUT, JSON.stringify(sorted, null, 2) + "\n");
console.log(`Wrote ${Object.keys(sorted).length} content defaults to ${path.relative(process.cwd(), OUT)}`);
