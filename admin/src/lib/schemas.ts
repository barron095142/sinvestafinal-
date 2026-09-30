import { z } from "zod";
import { CONTENT_FIELDS } from "./content-schema";
import { DEFAULT_NOTIFICATION_EMAIL } from "./constants";
import { PAGE_IDS, type PageId } from "./pages";
import { isSafeImageSrc } from "./sanitize";

const str = (max: number) => z.string().trim().max(max);
const optUrl = z.union([z.literal(""), z.url({ protocol: /^https?$/ }).max(500)]);
const imageSrc = z.union([z.literal(""), z.string().refine(isSafeImageSrc, "Pick an image from the library or an assets/img path")]);

/* ---------------- Global settings ---------------- */
const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export const DAY_LABELS: Record<(typeof DAYS)[number], string> = {
  mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday",
};
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour HH:MM");

export const settingsSchema = z.object({
  businessName: str(120).min(1, "Required"),
  legalName: str(160),
  abn: z.union([z.literal(""), z.string().regex(/^\d{2}\s?\d{3}\s?\d{3}\s?\d{3}$/, "An ABN is 11 digits")]),
  siteUrl: z.url({ protocol: /^https$/ }).max(200),
  founder: str(120),
  foundingYear: z.union([z.literal(""), z.string().regex(/^(19|20)\d{2}$/, "A year, e.g. 2016")]),
  phoneDisplay: str(40).min(6, "Required"),
  email: z.email().max(160),
  notificationEmail: z.email().max(160),
  address: z.object({
    street: str(160),
    locality: str(80),
    region: str(20),
    postcode: z.string().regex(/^\d{4}$/, "4-digit postcode"),
    country: z.string().length(2),
  }),
  hours: z.object(
    Object.fromEntries(
      DAYS.map((d) => [d, z.object({ open: z.boolean(), from: time, to: time })]),
    ) as Record<(typeof DAYS)[number], z.ZodObject<{ open: z.ZodBoolean; from: typeof time; to: typeof time }>>,
  ),
  social: z.object({
    facebook: optUrl, instagram: optUrl, linkedin: optUrl, youtube: optUrl, tiktok: optUrl, googleBusiness: optUrl,
  }),
  branding: z.object({ logo: imageSrc, ogDefaultImage: imageSrc, themeColor: z.string().regex(/^#[0-9a-f]{6}$/i) }),
});
export type Settings = z.infer<typeof settingsSchema>;

const weekday = { open: true, from: "08:00", to: "17:00" };
export const settingsDefaults: Settings = {
  businessName: "Sinvesta Group",
  legalName: "Solar Investment Australia Pty Ltd",
  abn: "",
  siteUrl: "https://www.sinvesta.com.au",
  founder: "Dr. Phong Vo",
  foundingYear: "2016",
  phoneDisplay: "0415 301 979",
  email: "phong@sinvesta.com.au",
  notificationEmail: DEFAULT_NOTIFICATION_EMAIL,
  address: { street: "107 Gilbert Rd", locality: "Castle Hill", region: "NSW", postcode: "2154", country: "AU" },
  hours: {
    mon: weekday, tue: weekday, wed: weekday, thu: weekday, fri: weekday,
    sat: { open: true, from: "09:00", to: "13:00" },
    sun: { open: false, from: "09:00", to: "13:00" },
  },
  social: { facebook: "", instagram: "", linkedin: "", youtube: "", tiktok: "", googleBusiness: "" },
  branding: { logo: "assets/img/logo.png", ogDefaultImage: "assets/img/hero-jacaranda.webp", themeColor: "#0B5FA5" },
};

/** "0415 301 979" → "+61415301979" (Australian numbers). */
export function toE164(display: string) {
  const digits = display.replace(/\D/g, "");
  if (digits.startsWith("61")) return "+" + digits;
  if (digits.startsWith("0")) return "+61" + digits.slice(1);
  return "+" + digits;
}

/* ---------------- Per-page SEO ---------------- */
export const SCHEMA_TYPES = ["none", "LocalBusiness", "Product", "Service", "FAQPage", "custom"] as const;

const pageSeoSchema = z.object({
  title: str(120),
  description: str(320),
  keywords: z.array(str(60)).max(20),
  canonical: optUrl,
  ogTitle: str(120),
  ogDescription: str(320),
  ogImage: imageSrc,
  noindex: z.boolean(),
  nofollow: z.boolean(),
  schema: z.object({
    type: z.enum(SCHEMA_TYPES),
    product: z.object({
      name: str(120), description: str(500), brand: str(80), sku: str(60),
      price: z.number().min(0).max(10_000_000), priceCurrency: z.literal("AUD"), image: imageSrc,
    }),
    service: z.object({ serviceType: str(120), description: str(500), areaServed: str(120) }),
    faq: z.array(z.object({ q: str(300), a: str(2000) })).max(30),
    custom: z.string().max(20_000).refine((s) => {
      if (!s.trim()) return true;
      try { JSON.parse(s); return true; } catch { return false; }
    }, "Must be valid JSON"),
  }),
});
export type PageSeo = z.infer<typeof pageSeoSchema>;
export const seoSchema = z.object({
  pages: z.object(Object.fromEntries(PAGE_IDS.map((id) => [id, pageSeoSchema])) as Record<PageId, typeof pageSeoSchema>),
});
export type SeoConfig = z.infer<typeof seoSchema>;

const emptySchema: PageSeo["schema"] = {
  type: "none",
  product: { name: "", description: "", brand: "", sku: "", price: 0, priceCurrency: "AUD", image: "" },
  service: { serviceType: "Solar panel installation", description: "", areaServed: "New South Wales" },
  faq: [],
  custom: "",
};
const page = (p: Partial<PageSeo> & Pick<PageSeo, "title" | "description" | "canonical">): PageSeo => ({
  keywords: [], ogTitle: "", ogDescription: "", ogImage: "", noindex: false, nofollow: false,
  schema: emptySchema, ...p,
});
const SITE = "https://www.sinvesta.com.au";
export const seoDefaults: SeoConfig = {
  pages: {
    home: page({
      title: "Sinvesta Group — Solar, Battery & EV Charging in Sydney",
      description: "Sydney solar specialists since 2016. Residential and commercial solar systems from 6.6kW to 100kW, Tesla Powerwall and SigEnergy batteries, off-grid systems and EV charger installs. 2,500+ projects completed. Free quote: 0415 301 979.",
      canonical: `${SITE}/`,
      keywords: ["solar installer Sydney", "solar battery Sydney", "Tesla Powerwall installer", "EV charger installation"],
      ogTitle: "Sinvesta Group — Solar, Battery & EV Charging in Sydney",
      ogDescription: "Save money from day one with solar that's simple and built to last. 2,500+ projects across Sydney since 2016.",
      ogImage: "assets/img/hero-jacaranda.webp",
      schema: { ...emptySchema, type: "LocalBusiness" },
    }),
    packages: page({
      title: "Solar Packages — 6.6kW to 100kW | Sinvesta Group Sydney",
      description: "Residential solar and battery packages from 6.6kW + 13.5kWh to 13kW + 36kWh, plus 50kW, 100kW and custom 200kW+ commercial systems. 510W panels, Fronius, Sungrow and Solis inverters, installed across Sydney by CEC-accredited electricians.",
      canonical: `${SITE}/packages.html`,
      keywords: ["6.6kW solar system", "10kW solar and battery", "commercial solar Sydney"],
    }),
    rebates: page({
      title: "Solar & Battery Rebates and Finance | Sinvesta Group Sydney",
      description: "Estimate your Australian Government solar and battery rebates: STCs, the Cheaper Home Batteries Program and state incentives for NSW, VIC, QLD, SA, WA, TAS, ACT and NT, plus the NSW commercial battery incentive and business finance options. Updated September 2026.",
      canonical: `${SITE}/rebates.html`,
      keywords: ["solar rebate NSW", "Cheaper Home Batteries Program", "solar finance"],
    }),
    projects: page({
      title: "Solar Projects & Installations Across Sydney | Sinvesta Group",
      description: "Real Sinvesta Group solar installations across Sydney — residential and commercial arrays, Fronius and Solis inverters, Sungrow and Tesla battery systems, and EV charger fit-outs.",
      canonical: `${SITE}/projects.html`,
    }),
    about: page({
      title: "About Sinvesta Group — Sydney Solar Since 2016",
      description: "Sinvesta Group (Solar Investment Australia Pty Ltd) was founded in 2016 by Dr. Phong Vo in Top Ryde. Today: 4,000+ clients and 2,500+ solar projects across Sydney and NSW.",
      canonical: `${SITE}/about.html`,
    }),
    contact: page({
      title: "Contact Sinvesta Group — Free Solar Quote | Castle Hill, Sydney",
      description: "Get a free, no-obligation solar quote. Call 0415 301 979, email phong@sinvesta.com.au, or visit our main office at 107 Gilbert Rd, Castle Hill NSW 2154.",
      canonical: `${SITE}/contact.html`,
    }),
  },
};

/* ---------------- Integrations & scripts ---------------- */
const VERIFY_NAMES = ["google-site-verification", "msvalidate.01", "facebook-domain-verification", "p:domain_verify", "yandex-verification"];
export const verificationTagSchema = z.object({ name: z.enum(VERIFY_NAMES), content: z.string().regex(/^[\w.:-]{4,200}$/) });

export const integrationsSchema = z.object({
  analytics: z.object({
    mode: z.enum(["off", "id", "snippet"]),
    measurementId: z.union([z.literal(""), z.string().regex(/^G-[A-Z0-9]{4,16}$/, "Looks like G-XXXXXXXXXX")]),
    snippet: z.string().max(10_000),
  }),
  gtmId: z.union([z.literal(""), z.string().regex(/^GTM-[A-Z0-9]{4,12}$/, "Looks like GTM-XXXXXXX")]),
  verification: z.array(verificationTagSchema).max(10),
  map: z.object({
    embedSrc: z.union([
      z.literal(""),
      z.string().max(2000).regex(/^https:\/\/(www\.)?google\.[a-z.]+\/maps(\/embed)?\?/, "Paste a Google Maps embed link or <iframe> code"),
    ]),
    lat: z.union([z.literal(""), z.string().regex(/^-?\d{1,2}(\.\d+)?$/)]),
    lng: z.union([z.literal(""), z.string().regex(/^-?\d{1,3}(\.\d+)?$/)]),
    zoom: z.number().int().min(3).max(21),
  }),
  customHead: z.string().max(20_000),
  customBodyStart: z.string().max(20_000),
  customBodyEnd: z.string().max(20_000),
});
export type Integrations = z.infer<typeof integrationsSchema>;

// Seeded from the reference admin screenshot.
export const integrationsDefaults: Integrations = {
  analytics: { mode: "id", measurementId: "G-J3NLLM1YLQ", snippet: "" },
  gtmId: "",
  verification: [
    { name: "google-site-verification", content: "VugY_mt719e594VMC0qUaDKxjzs5Ay1TImD2JVMFuCg" },
    { name: "google-site-verification", content: "FiYsDuLq1p4kE99uVNvBah8S6o-bymw6w-UbASIW6dk" },
  ],
  // Empty = keep the map already on contact.html (107 Gilbert Rd). The embed in the
  // old admin pointed at coordinates in Ho Chi Minh City, so it isn't carried over.
  map: { embedSrc: "", lat: "", lng: "", zoom: 16 },
  customHead: "",
  customBodyStart: "",
  customBodyEnd: "",
};

/* ---------------- Sitemap & robots ---------------- */
const CHANGEFREQ = ["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"] as const;
const sitemapEntrySchema = z.object({ include: z.boolean(), changefreq: z.enum(CHANGEFREQ), priority: z.number().min(0).max(1) });
export const indexingSchema = z.object({
  sitemap: z.object(Object.fromEntries(PAGE_IDS.map((id) => [id, sitemapEntrySchema])) as Record<PageId, typeof sitemapEntrySchema>),
  extraUrls: z.array(z.url({ protocol: /^https$/ })).max(200),
  robots: z.object({ blockAll: z.boolean(), extraRules: z.string().max(5000) }),
});
export type Indexing = z.infer<typeof indexingSchema>;
export { CHANGEFREQ };
export const indexingDefaults: Indexing = {
  sitemap: {
    home: { include: true, changefreq: "weekly", priority: 1 },
    packages: { include: true, changefreq: "weekly", priority: 0.9 },
    rebates: { include: true, changefreq: "monthly", priority: 0.8 },
    projects: { include: true, changefreq: "monthly", priority: 0.7 },
    about: { include: true, changefreq: "yearly", priority: 0.6 },
    contact: { include: true, changefreq: "yearly", priority: 0.8 },
  },
  extraUrls: [],
  robots: { blockAll: false, extraRules: "" },
};

/* ---------------- Page content ---------------- */
/** Only keys the schema knows; values validated per field type. */
export const contentSchema = z
  .record(z.string(), z.union([z.string().max(5000), z.number()]))
  // Fields retired from the schema are dropped rather than rejected.
  .transform((obj) => Object.fromEntries(Object.entries(obj).filter(([k]) => CONTENT_FIELDS.has(k))))
  .superRefine((obj, ctx) => {
  for (const [key, value] of Object.entries(obj)) {
    const field = CONTENT_FIELDS.get(key)!;
    if (field.type === "price" ? typeof value !== "number" || value < 0 || value > 10_000_000 : typeof value !== "string") {
      ctx.addIssue({ code: "custom", path: [key], message: "Wrong value type" });
    } else if (field.type === "image" && typeof value === "string" && value && !isSafeImageSrc(value)) {
      ctx.addIssue({ code: "custom", path: [key], message: "Pick an image from the media library" });
    }
  }
});
export type Content = z.infer<typeof contentSchema>;

/* ---------------- Enquiries ---------------- */
export const INQUIRY_STATUSES = ["new", "contacted", "quoted", "won", "lost"] as const;
export const publicInquirySchema = z.object({
  name: str(120).min(1),
  phone: str(40).min(6),
  email: z.union([z.literal(""), z.email().max(160)]),
  suburb: str(120).optional().default(""),
  property: str(80).optional().default(""),
  system: str(120).optional().default(""),
  bill: str(40).optional().default(""),
  message: str(3000).optional().default(""),
  source: z.enum(["contact-form", "promo-popup"]).default("contact-form"),
  page: str(200).optional().default(""),
  website: z.string().max(500).optional(), // honeypot: real people never fill it
});
export interface Inquiry extends Omit<z.infer<typeof publicInquirySchema>, "website"> {
  id: string;
  createdAt: string;
  status: (typeof INQUIRY_STATUSES)[number];
  emailed: boolean;
  notes: string;
}
