import type { Metadata } from "next";
import { ContentEditor } from "@/components/content-editor";
import { getSection } from "@/lib/cms";

export const metadata: Metadata = { title: "Page Content" };
export const dynamic = "force-dynamic";

export default async function ContentPage({ searchParams }: { searchParams: Promise<{ group?: string }> }) {
  const [{ data, updatedAt }, settings, { group }] = await Promise.all([getSection("content"), getSection("settings"), searchParams]);
  return <ContentEditor initial={data} updatedAt={updatedAt} siteUrl={settings.data.siteUrl} initialGroup={group} />;
}
