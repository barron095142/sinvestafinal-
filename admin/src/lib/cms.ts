import "server-only";
import type { ZodType } from "zod";
import { CONTENT_DEFAULTS } from "./content-schema";
import {
  contentSchema, indexingDefaults, indexingSchema, integrationsDefaults, integrationsSchema,
  seoDefaults, seoSchema, settingsDefaults, settingsSchema,
  type Content, type Indexing, type Integrations, type SeoConfig, type Settings,
} from "./schemas";
import { store } from "./store";

interface SectionMap {
  settings: Settings;
  content: Content;
  seo: SeoConfig;
  integrations: Integrations;
  indexing: Indexing;
}
export type SectionName = keyof SectionMap;

const SECTIONS: { [K in SectionName]: { schema: ZodType<SectionMap[K]>; defaults: SectionMap[K]; label: string } } = {
  settings: { schema: settingsSchema, defaults: settingsDefaults, label: "Global settings" },
  content: { schema: contentSchema, defaults: CONTENT_DEFAULTS, label: "Page content" },
  seo: { schema: seoSchema, defaults: seoDefaults, label: "SEO" },
  integrations: { schema: integrationsSchema, defaults: integrationsDefaults, label: "Integrations & scripts" },
  indexing: { schema: indexingSchema, defaults: indexingDefaults, label: "Sitemap & robots" },
};

export function isSection(name: string): name is SectionName {
  return name in SECTIONS;
}
export function sectionSchema<K extends SectionName>(name: K) {
  return SECTIONS[name].schema;
}

interface Stored<T> {
  data: T;
  updatedAt: string;
  updatedBy: string;
}

/** Stored values win; anything added to the defaults since then is filled in. */
function merge<T>(defaults: T, stored: unknown): T {
  if (Array.isArray(defaults) || typeof defaults !== "object" || defaults === null) {
    return (stored === undefined ? defaults : stored) as T;
  }
  const out: Record<string, unknown> = { ...(defaults as Record<string, unknown>) };
  if (stored && typeof stored === "object" && !Array.isArray(stored)) {
    for (const [k, v] of Object.entries(stored)) out[k] = k in out ? merge(out[k], v) : v;
  }
  return out as T;
}

export async function getSection<K extends SectionName>(name: K) {
  const rec = await store().getJSON<Stored<SectionMap[K]>>(`cms/${name}`);
  return {
    data: merge(SECTIONS[name].defaults, rec?.data),
    updatedAt: rec?.updatedAt ?? null,
    updatedBy: rec?.updatedBy ?? null,
  };
}

export async function saveSection<K extends SectionName>(name: K, data: SectionMap[K], by: string) {
  const rec: Stored<SectionMap[K]> = { data, updatedAt: new Date().toISOString(), updatedBy: by };
  await store().setJSON(`cms/${name}`, rec);
  await logActivity(by, `Updated ${SECTIONS[name].label}`);
  return rec;
}

/* ---------------- Activity log ---------------- */
export interface Activity {
  at: string;
  by: string;
  action: string;
}
export async function logActivity(by: string, action: string) {
  const at = new Date().toISOString();
  // Keys sort by time, so the newest entries are simply the last ones.
  await store().setJSON(`activity/${at.replace(/[:.]/g, "-")}-${crypto.randomUUID().slice(0, 6)}`, { at, by, action });
}
export async function recentActivity(limit = 8) {
  const keys = (await store().list("activity/")).sort().reverse().slice(0, limit);
  const rows = await Promise.all(keys.map((k) => store().getJSON<Activity>(k)));
  return rows.filter((r): r is Activity => !!r);
}
