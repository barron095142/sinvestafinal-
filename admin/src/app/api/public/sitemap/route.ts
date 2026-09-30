import { getSection } from "@/lib/cms";
import { buildSitemap } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function GET() {
  const [s, seo, idx, content] = await Promise.all([getSection("settings"), getSection("seo"), getSection("indexing"), getSection("content")]);
  const lastmod = ([seo.updatedAt, content.updatedAt].filter(Boolean).sort().pop() ?? new Date().toISOString()).slice(0, 10);
  return new Response(buildSitemap(s.data, seo.data, idx.data, lastmod), {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=300" },
  });
}
