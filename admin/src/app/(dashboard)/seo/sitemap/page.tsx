import type { Metadata } from "next";
import { SitemapEditor } from "@/components/sitemap-editor";
import { getSection } from "@/lib/cms";

export const metadata: Metadata = { title: "Sitemap & Robots" };
export const dynamic = "force-dynamic";

export default async function SitemapPage() {
  const [indexing, seo, settings] = await Promise.all([getSection("indexing"), getSection("seo"), getSection("settings")]);
  return <SitemapEditor initial={indexing.data} updatedAt={indexing.updatedAt} seo={seo.data} settings={settings.data} />;
}
