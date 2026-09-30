import type { Indexing, Integrations, PageSeo, SeoConfig, Settings } from "./schemas";
import { toE164 } from "./schemas";
import { SITE_PAGES, type PageId } from "./pages";

export const LIMITS = {
  title: { min: 30, max: 60 },
  description: { min: 70, max: 160 },
};

/** Absolute URL for an asset path or media URL, for og:image and JSON-LD. */
export function absolute(siteUrl: string, src: string) {
  if (!src) return "";
  if (/^https?:\/\//.test(src)) return src;
  return siteUrl.replace(/\/$/, "") + "/" + src.replace(/^\//, "");
}

export function pageUrl(siteUrl: string, id: PageId) {
  const p = SITE_PAGES.find((x) => x.id === id)!;
  return siteUrl.replace(/\/$/, "") + p.path;
}

/* ---------------- Structured data ---------------- */
export function localBusinessLd(s: Settings, i?: Integrations) {
  const days = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" };
  const sameAs = Object.values(s.social).filter(Boolean);
  return {
    "@context": "https://schema.org",
    "@type": "ElectricalContractor",
    "@id": s.siteUrl.replace(/\/$/, "") + "/#business",
    name: s.businessName,
    ...(s.legalName && { legalName: s.legalName }),
    ...(s.abn && { taxID: s.abn.replace(/\s/g, "") }),
    url: s.siteUrl.replace(/\/$/, "") + "/",
    ...(s.branding.logo && { logo: absolute(s.siteUrl, s.branding.logo) }),
    ...(s.branding.ogDefaultImage && { image: absolute(s.siteUrl, s.branding.ogDefaultImage) }),
    description: `Solar, battery storage and EV charging installer serving Sydney and NSW${s.foundingYear ? ` since ${s.foundingYear}` : ""}.`,
    ...(s.foundingYear && { foundingDate: s.foundingYear }),
    ...(s.founder && { founder: { "@type": "Person", name: s.founder } }),
    telephone: toE164(s.phoneDisplay),
    email: s.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: s.address.street,
      addressLocality: s.address.locality,
      addressRegion: s.address.region,
      postalCode: s.address.postcode,
      addressCountry: s.address.country,
    },
    ...(i?.map.lat && i.map.lng && { geo: { "@type": "GeoCoordinates", latitude: Number(i.map.lat), longitude: Number(i.map.lng) } }),
    openingHoursSpecification: Object.entries(s.hours)
      .filter(([, h]) => h.open)
      .map(([d, h]) => ({ "@type": "OpeningHoursSpecification", dayOfWeek: days[d as keyof typeof days], opens: h.from, closes: h.to })),
    ...(sameAs.length && { sameAs }),
    areaServed: { "@type": "State", name: "New South Wales" },
    priceRange: "$$",
  };
}

export function buildJsonLd(id: PageId, seo: PageSeo, s: Settings, i: Integrations): object | null {
  const sc = seo.schema;
  const provider = { "@id": s.siteUrl.replace(/\/$/, "") + "/#business" };
  switch (sc.type) {
    case "none":
      return null;
    case "LocalBusiness":
      return localBusinessLd(s, i);
    case "Product":
      return {
        "@context": "https://schema.org",
        "@type": "Product",
        name: sc.product.name || seo.title,
        description: sc.product.description || seo.description,
        ...(sc.product.brand && { brand: { "@type": "Brand", name: sc.product.brand } }),
        ...(sc.product.sku && { sku: sc.product.sku }),
        ...(sc.product.image && { image: absolute(s.siteUrl, sc.product.image) }),
        ...(sc.product.price > 0 && {
          offers: {
            "@type": "Offer",
            price: sc.product.price.toFixed(2),
            priceCurrency: "AUD",
            availability: "https://schema.org/InStock",
            url: pageUrl(s.siteUrl, id),
            seller: { "@type": "Organization", name: s.businessName },
          },
        }),
      };
    case "Service":
      return {
        "@context": "https://schema.org",
        "@type": "Service",
        serviceType: sc.service.serviceType,
        description: sc.service.description || seo.description,
        provider: { "@type": "ElectricalContractor", name: s.businessName, telephone: toE164(s.phoneDisplay), ...provider },
        areaServed: sc.service.areaServed ? { "@type": "State", name: sc.service.areaServed } : undefined,
        url: pageUrl(s.siteUrl, id),
      };
    case "FAQPage":
      return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: sc.faq.filter((f) => f.q && f.a).map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      };
    case "custom":
      return sc.custom.trim() ? JSON.parse(sc.custom) : null;
  }
}

/* ---------------- Sitemap & robots ---------------- */
export function buildSitemap(s: Settings, seo: SeoConfig, idx: Indexing, lastmod: string) {
  const esc = (x: string) => x.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const urls = SITE_PAGES.filter((p) => idx.sitemap[p.id].include && !seo.pages[p.id].noindex).map((p) => {
    const e = idx.sitemap[p.id];
    return `  <url>\n    <loc>${esc(seo.pages[p.id].canonical || pageUrl(s.siteUrl, p.id))}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${e.changefreq}</changefreq>\n    <priority>${e.priority.toFixed(1)}</priority>\n  </url>`;
  });
  for (const u of idx.extraUrls) urls.push(`  <url>\n    <loc>${esc(u)}</loc>\n  </url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}

export function buildRobots(s: Settings, idx: Indexing) {
  const lines = ["User-agent: *", idx.robots.blockAll ? "Disallow: /" : "Allow: /", "Disallow: /admin", "Disallow: /admin/"];
  if (idx.robots.extraRules.trim()) lines.push("", idx.robots.extraRules.trim());
  lines.push("", `Sitemap: ${s.siteUrl.replace(/\/$/, "")}/sitemap.xml`);
  return lines.join("\n") + "\n";
}

/* ---------------- Health checks ---------------- */
export interface SeoCheck {
  label: string;
  ok: boolean;
  warn?: boolean;
}
export function seoChecks(p: PageSeo, s: Settings): SeoCheck[] {
  const t = p.title.length, d = p.description.length;
  return [
    { label: `Title ${t} chars (aim ${LIMITS.title.min}–${LIMITS.title.max})`, ok: t >= LIMITS.title.min && t <= LIMITS.title.max, warn: t > 0 },
    { label: `Description ${d} chars (aim ${LIMITS.description.min}–${LIMITS.description.max})`, ok: d >= LIMITS.description.min && d <= LIMITS.description.max, warn: d > 0 },
    { label: "Canonical URL set", ok: !!p.canonical },
    { label: "Focus keywords added", ok: p.keywords.length > 0 },
    { label: "Share image set", ok: !!(p.ogImage || s.branding.ogDefaultImage) },
    { label: "Indexable by search engines", ok: !p.noindex },
    {
      label: "Primary keyword appears in title",
      ok: !!p.keywords[0] && p.title.toLowerCase().includes(p.keywords[0].toLowerCase().split(" ")[0]),
      warn: true,
    },
  ];
}
export function seoScore(p: PageSeo, s: Settings) {
  const c = seoChecks(p, s);
  return Math.round((c.filter((x) => x.ok).length / c.length) * 100);
}
