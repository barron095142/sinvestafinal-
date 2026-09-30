"use client";

import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { useApi, type SectionResponse } from "@/lib/client";
import type { Content, Indexing, Inquiry, Integrations, SeoConfig, Settings } from "@/lib/schemas";
import { ContentEditor } from "./content-editor";
import { InquiriesInbox } from "./inquiries-inbox";
import { IntegrationsForm } from "./integrations-form";
import { PageError, PageSkeleton } from "./page-state";
import { SeoEditor } from "./seo-editor";
import { SettingsForm } from "./settings-form";
import { SitemapEditor } from "./sitemap-editor";

/** Fetch, then render; skeleton while loading, retry card on failure. */
function Load<T extends unknown[]>({ paths, children }: { paths: string[]; children: (data: T) => ReactNode }) {
  const { data, error, reload } = useApi<T>(paths);
  if (error) return <PageError message={error} onRetry={reload} />;
  if (!data) return <PageSkeleton />;
  return <>{children(data)}</>;
}

type S<T> = SectionResponse<T>;

export function SettingsScreen() {
  return (
    <Load<[S<Settings>]> paths={["/cms/settings"]}>
      {([s]) => <SettingsForm initial={s.data} updatedAt={s.updatedAt} updatedBy={s.updatedBy} />}
    </Load>
  );
}

export function ContentScreen() {
  const group = useSearchParams().get("group") ?? undefined;
  return (
    <Load<[S<Content>, S<Settings>]> paths={["/cms/content", "/cms/settings"]}>
      {([c, s]) => <ContentEditor initial={c.data} updatedAt={c.updatedAt} siteUrl={s.data.siteUrl} initialGroup={group} />}
    </Load>
  );
}

export function SeoScreen() {
  const page = useSearchParams().get("page") ?? undefined;
  return (
    <Load<[S<SeoConfig>, S<Settings>, S<Integrations>]> paths={["/cms/seo", "/cms/settings", "/cms/integrations"]}>
      {([seo, s, i]) => <SeoEditor initial={seo.data} updatedAt={seo.updatedAt} settings={s.data} integrations={i.data} initialPage={page} />}
    </Load>
  );
}

export function SitemapScreen() {
  return (
    <Load<[S<Indexing>, S<SeoConfig>, S<Settings>]> paths={["/cms/indexing", "/cms/seo", "/cms/settings"]}>
      {([idx, seo, s]) => <SitemapEditor initial={idx.data} updatedAt={idx.updatedAt} seo={seo.data} settings={s.data} />}
    </Load>
  );
}

export function IntegrationsScreen() {
  return (
    <Load<[S<Integrations>, S<Settings>]> paths={["/cms/integrations", "/cms/settings"]}>
      {([i, s]) => <IntegrationsForm initial={i.data} updatedAt={i.updatedAt} address={s.data.address} />}
    </Load>
  );
}

export function InquiriesScreen() {
  const sp = useSearchParams();
  return (
    <Load<[{ items: Inquiry[]; notificationEmail: string; emailConfigured: boolean }]> paths={["/inquiries"]}>
      {([r]) => (
        <InquiriesInbox
          initial={r.items}
          notificationEmail={r.notificationEmail}
          emailConfigured={r.emailConfigured}
          initialId={sp.get("id") ?? undefined}
          initialStatus={sp.get("status") ?? undefined}
        />
      )}
    </Load>
  );
}
