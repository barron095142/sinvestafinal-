import type { Metadata } from "next";
import { SeoEditor } from "@/components/seo-editor";
import { getSection } from "@/lib/cms";

export const metadata: Metadata = { title: "SEO Manager" };
export const dynamic = "force-dynamic";

export default async function SeoPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const [seo, settings, integrations, { page }] = await Promise.all([
    getSection("seo"), getSection("settings"), getSection("integrations"), searchParams,
  ]);
  return <SeoEditor initial={seo.data} updatedAt={seo.updatedAt} settings={settings.data} integrations={integrations.data} initialPage={page} />;
}
