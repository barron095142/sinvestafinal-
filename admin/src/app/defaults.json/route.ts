import { CONTENT_DEFAULTS, CONTENT_FIELDS } from "@/lib/content-schema";
import { SITE_PAGES } from "@/lib/pages";
import { indexingDefaults, integrationsDefaults, seoDefaults, settingsDefaults } from "@/lib/schemas";

/**
 * Written to out/defaults.json at build time. The Bluehost build moves it into
 * the PHP folder: it is the single source of every default value and of which
 * content fields exist (and their type), so the PHP side never duplicates them.
 */
export const dynamic = "force-static";

export function GET() {
  return Response.json({
    settings: settingsDefaults,
    seo: seoDefaults,
    integrations: integrationsDefaults,
    indexing: indexingDefaults,
    content: CONTENT_DEFAULTS,
    contentFields: Object.fromEntries([...CONTENT_FIELDS].map(([k, f]) => [k, f.type])),
    pages: SITE_PAGES,
  });
}
