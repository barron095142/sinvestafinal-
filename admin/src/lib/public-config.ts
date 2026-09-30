import "server-only";
import { getSection } from "./cms";
import { CONTENT_DEFAULTS, CONTENT_FIELDS } from "./content-schema";
import { SITE_PAGES } from "./pages";
import { escapeHtml, isSafeImageSrc, sanitizeRich } from "./sanitize";
import { settingsDefaults, toE164, type Content, type Integrations, type Settings } from "./schemas";
import { absolute, buildJsonLd } from "./seo";

/**
 * Everything the public site's edge function needs, pre-rendered, so the edge
 * code stays small and dumb. Contains nothing that isn't public anyway once
 * it's on the page (no notification email, no inquiries).
 */
export async function buildPublicConfig() {
  const [settings, content, seo, integrations] = await Promise.all([
    getSection("settings"), getSection("content"), getSection("seo"), getSection("integrations"),
  ]);
  const s = settings.data;
  const i = integrations.data;
  const version = [settings, content, seo, integrations].map((x) => x.updatedAt ?? "").sort().pop() || "defaults";

  const pages = Object.fromEntries(
    SITE_PAGES.map((p) => {
      const ps = seo.data.pages[p.id];
      const og = {
        title: ps.ogTitle || ps.title,
        description: ps.ogDescription || ps.description,
        image: absolute(s.siteUrl, ps.ogImage || s.branding.ogDefaultImage),
      };
      const robots = [ps.noindex ? "noindex" : "index", ps.nofollow ? "nofollow" : "follow"].join(", ");
      const meta = [
        `<title>${escapeHtml(ps.title)}</title>`,
        `<meta name="description" content="${escapeHtml(ps.description)}">`,
        ps.keywords.length ? `<meta name="keywords" content="${escapeHtml(ps.keywords.join(", "))}">` : "",
        `<meta name="robots" content="${robots}">`,
        ps.canonical ? `<link rel="canonical" href="${escapeHtml(ps.canonical)}">` : "",
        `<meta property="og:type" content="website">`,
        `<meta property="og:site_name" content="${escapeHtml(s.businessName)}">`,
        `<meta property="og:title" content="${escapeHtml(og.title)}">`,
        `<meta property="og:description" content="${escapeHtml(og.description)}">`,
        ps.canonical ? `<meta property="og:url" content="${escapeHtml(ps.canonical)}">` : "",
        og.image ? `<meta property="og:image" content="${escapeHtml(og.image)}">` : "",
        `<meta property="og:locale" content="en_AU">`,
        `<meta name="twitter:card" content="summary_large_image">`,
        `<meta name="twitter:title" content="${escapeHtml(og.title)}">`,
        `<meta name="twitter:description" content="${escapeHtml(og.description)}">`,
        og.image ? `<meta name="twitter:image" content="${escapeHtml(og.image)}">` : "",
      ].filter(Boolean);
      const ld = buildJsonLd(p.id, ps, s, i);
      // "</" inside JSON would close the script tag early.
      const jsonLd = ld ? `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>` : null;
      return [p.id, { headHtml: meta.join("\n"), jsonLd }];
    }),
  );

  return {
    version,
    pages,
    overrides: contentOverrides(content.data),
    replacements: contactReplacements(s),
    mapSrc: mapSrc(i),
    ...integrationHtml(i),
  };
}

const aud = (n: number) => "$" + Math.round(n).toLocaleString("en-AU");

export function contentOverrides(content: Content) {
  const html: Record<string, string> = {};
  const src: Record<string, string> = {};
  const aria: Record<string, string> = {};
  const pricedPackages = new Set<string>();

  for (const [key, value] of Object.entries(content)) {
    const field = CONTENT_FIELDS.get(key);
    if (!field || value === CONTENT_DEFAULTS[key]) continue;
    if (field.type === "text") html[key] = escapeHtml(String(value));
    else if (field.type === "rich") html[key] = sanitizeRich(String(value));
    else if (field.type === "image" && typeof value === "string" && isSafeImageSrc(value)) src[key] = value;
    else if (field.type === "price") pricedPackages.add(key.split(".")[1]);
  }
  // A price change rewrites the whole price badge so "Save $X" never goes stale.
  for (const id of pricedPackages) {
    const now = Number(content[`pkg.${id}.now`]) || 0;
    const was = Number(content[`pkg.${id}.was`]) || 0;
    const saving = was > now ? was - now : 0;
    html[`pkg.${id}.now`] = aud(now);
    html[`pkg.${id}.was`] = saving ? aud(was) : "";
    html[`pkg.${id}.save`] = saving ? `Save ${aud(saving)}` : "";
    aria[`pkg.${id}.aria`] = `${aud(now)} incl. GST` + (saving ? `, was ${aud(was)}, save ${aud(saving)}` : "");
  }
  return { html, src, aria };
}

/** The static HTML hard-codes the original contact details; swap them if they changed. */
function contactReplacements(s: Settings): [string, string][] {
  const d = settingsDefaults;
  const out: [string, string][] = [];
  const add = (from: string, to: string) => from !== to && to && out.push([from, to]);
  const locLine = (x: Settings) => `${x.address.locality} ${x.address.region} ${x.address.postcode}`;
  const q = (x: Settings, sep: string) => `${x.address.street}${sep}${locLine(x)}`.replace(/ /g, "+");

  add(d.phoneDisplay, escapeHtml(s.phoneDisplay));
  add(toE164(d.phoneDisplay), toE164(s.phoneDisplay));
  add("wa.me/" + toE164(d.phoneDisplay).slice(1), "wa.me/" + toE164(s.phoneDisplay).slice(1));
  add(d.email, escapeHtml(s.email));
  add(q(d, "+"), encodeURI(q(s, "+")));
  add(q(d, ",+"), encodeURI(q(s, ",+")));
  add(d.address.street, escapeHtml(s.address.street));
  add(locLine(d), escapeHtml(locLine(s)));
  add(`name="theme-color" content="${d.branding.themeColor}"`, `name="theme-color" content="${s.branding.themeColor}"`);
  return out;
}

function mapSrc(i: Integrations) {
  if (i.map.embedSrc) return i.map.embedSrc;
  if (i.map.lat && i.map.lng) return `https://www.google.com/maps?q=${i.map.lat},${i.map.lng}&z=${i.map.zoom}&output=embed`;
  return "";
}

function integrationHtml(i: Integrations) {
  const head: string[] = [];
  const bodyStart: string[] = [];
  for (const v of i.verification) head.push(`<meta name="${escapeHtml(v.name)}" content="${escapeHtml(v.content)}">`);
  if (i.analytics.mode === "id" && i.analytics.measurementId) {
    const id = i.analytics.measurementId;
    head.push(
      `<script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>`,
      `<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}');</script>`,
    );
  } else if (i.analytics.mode === "snippet" && i.analytics.snippet.trim()) {
    head.push(i.analytics.snippet.trim());
  }
  if (i.gtmId) {
    head.push(
      `<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${i.gtmId}');</script>`,
    );
    bodyStart.push(
      `<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${i.gtmId}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>`,
    );
  }
  if (i.customHead.trim()) head.push(i.customHead.trim());
  if (i.customBodyStart.trim()) bodyStart.push(i.customBodyStart.trim());
  return { headHtml: head.join("\n"), bodyStartHtml: bodyStart.join("\n"), bodyEndHtml: i.customBodyEnd.trim() };
}
