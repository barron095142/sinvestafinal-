"use client";

import { Bot, Copy, ExternalLink, FileCode, Network } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { timeAgo } from "@/lib/format";
import { SITE_PAGES } from "@/lib/pages";
import { CHANGEFREQ, type Indexing, type SeoConfig, type Settings } from "@/lib/schemas";
import { buildRobots, buildSitemap } from "@/lib/seo";
import { SaveBar, useSectionForm } from "./use-section-form";
import { Badge, Button, Card, CardBody, CardHeader, Field, LinkButton, PageHeader, Select, Textarea, Toggle } from "./ui/primitives";
import { useToast } from "./ui/toast";

export function SitemapEditor({ initial, updatedAt, seo, settings }: { initial: Indexing; updatedAt: string | null; seo: SeoConfig; settings: Settings }) {
  const f = useSectionForm("indexing", initial, { label: "Sitemap & robots" });
  const v = f.value;
  const origin = settings.siteUrl.replace(/\/$/, "");
  const today = new Date().toISOString().slice(0, 10);
  const [extra, setExtra] = useState(v.extraUrls.join("\n"));

  const sitemapXml = buildSitemap(settings, seo, v, today);
  const robotsTxt = buildRobots(settings, v);
  const searchConsole = `https://search.google.com/search-console/sitemaps?resource_id=${encodeURIComponent(origin + "/")}`;

  return (
    <>
      <PageHeader
        eyebrow="Search & Growth"
        title="Sitemap & Robots"
        description={<>Served live at <code className="font-mono text-[13px] text-navy-800">/sitemap.xml</code> and <code className="font-mono text-[13px] text-navy-800">/robots.txt</code>. Updates as soon as you save.</>}
        actions={
          <>
            {updatedAt && <Badge>Last saved {timeAgo(updatedAt)}</Badge>}
            <LinkButton href={searchConsole} target="_blank" rel="noopener" variant="primary" icon={<ExternalLink className="size-4" />}>
              Submit in Search Console
            </LinkButton>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader title="Pages in sitemap.xml" description="Priority and change frequency are hints to crawlers, not commands." icon={<Network className="size-[18px]" />} />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-[11.5px] tracking-wide text-slate-500 uppercase">
                    <th className="px-6 py-3 font-semibold">Page</th>
                    <th className="px-3 py-3 font-semibold">Include</th>
                    <th className="px-3 py-3 font-semibold">Changes</th>
                    <th className="px-6 py-3 font-semibold">Priority</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {SITE_PAGES.map((p) => {
                    const e = v.sitemap[p.id];
                    const noindex = seo.pages[p.id].noindex;
                    return (
                      <tr key={p.id} className={noindex ? "bg-red-50/40" : undefined}>
                        <td className="px-6 py-3">
                          <p className="font-semibold text-navy-800">{p.label}</p>
                          <p className="font-mono text-[11.5px] text-slate-500">{p.path}</p>
                          {noindex && (
                            <Link href={`/seo?page=${p.id}`} className="mt-1 inline-block">
                              <Badge tone="red">noindex: excluded</Badge>
                            </Link>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <Toggle checked={e.include && !noindex} disabled={noindex} onChange={(x) => f.set(`sitemap.${p.id}.include`, x)} />
                        </td>
                        <td className="px-3 py-3">
                          <Select aria-label={`${p.label} change frequency`} className="h-9 w-[120px]" value={e.changefreq} onChange={(ev) => f.set(`sitemap.${p.id}.changefreq`, ev.target.value)}>
                            {CHANGEFREQ.map((c) => <option key={c}>{c}</option>)}
                          </Select>
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-3">
                            <input type="range" min={0} max={1} step={0.1} value={e.priority} onChange={(ev) => f.set(`sitemap.${p.id}.priority`, Number(ev.target.value))} className="w-24 accent-royal-600" aria-label={`${p.label} priority`} />
                            <span className="w-8 font-mono text-[12.5px] text-navy-800 tabular-nums">{e.priority.toFixed(1)}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <CardBody className="border-t border-slate-100">
              <Field label="Additional URLs" hint="One full https:// URL per line, e.g. a landing page for a campaign." error={Object.entries(f.errors).find(([k]) => k.startsWith("extraUrls"))?.[1]}>
                <Textarea
                  mono
                  rows={3}
                  value={extra}
                  placeholder={`${origin}/solar-castle-hill.html`}
                  onChange={(e) => {
                    setExtra(e.target.value);
                    f.set("extraUrls", e.target.value.split("\n").map((s) => s.trim()).filter(Boolean));
                  }}
                />
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="robots.txt rules" description="The admin area is always blocked from crawlers." icon={<Bot className="size-[18px]" />} />
            <CardBody className="space-y-5">
              <Toggle
                checked={v.robots.blockAll}
                onChange={(x) => f.set("robots.blockAll", x)}
                label="Block all crawlers (staging mode)"
                description="Use only on a test copy of the site. On the live site this removes you from Google."
              />
              {v.robots.blockAll && <p className="rounded-xl bg-red-50 p-3 text-[13px] font-medium text-red-700">All search engines are told not to crawl the website.</p>}
              <Field label="Extra rules" hint="Advanced. Added below the defaults, e.g. rules for a specific bot." error={f.errors["robots.extraRules"]}>
                <Textarea mono rows={4} value={v.robots.extraRules} placeholder={"User-agent: GPTBot\nDisallow: /"} onChange={(e) => f.set("robots.extraRules", e.target.value)} />
              </Field>
              <p className="text-xs leading-5 text-slate-500">
                To hide a single page from Google, switch off &ldquo;Show in search results&rdquo; in the SEO Manager instead of blocking it here. A blocked page can&rsquo;t be crawled, so Google never sees its noindex tag.
              </p>
            </CardBody>
          </Card>
        </div>

        <div className="min-w-0 space-y-6 xl:sticky xl:top-24 xl:self-start">
          <CodePreview title="sitemap.xml" href={`${origin}/sitemap.xml`} code={sitemapXml} />
          <CodePreview title="robots.txt" href={`${origin}/robots.txt`} code={robotsTxt} />
          <Card>
            <CardBody className="text-[13px] leading-6 text-slate-600">
              <p className="font-semibold text-navy-800">Submitting to Google</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5">
                <li>Verify the site under <Link href="/integrations" className="font-semibold text-royal-600">Integrations</Link> (Search Console meta tag).</li>
                <li>Open Search Console → <b>Sitemaps</b>.</li>
                <li>Enter <code className="rounded bg-slate-100 px-1 font-mono">sitemap.xml</code> and press Submit.</li>
              </ol>
            </CardBody>
          </Card>
        </div>
      </div>

      <SaveBar dirty={f.dirty} saving={f.saving} onSave={f.save} onReset={() => { f.reset(); setExtra(initial.extraUrls.join("\n")); }} />
    </>
  );
}

function CodePreview({ title, href, code }: { title: string; href: string; code: string }) {
  const toast = useToast();
  return (
    <Card className="overflow-hidden">
      <CardHeader
        title={<span className="font-mono">{title}</span>}
        description="Preview including unsaved changes"
        icon={<FileCode className="size-[18px]" />}
        actions={
          <>
            <Button type="button" size="sm" variant="ghost" onClick={() => { void navigator.clipboard.writeText(code); toast("info", `${title} copied`); }} aria-label={`Copy ${title}`}>
              <Copy className="size-3.5" />
            </Button>
            <LinkButton size="sm" href={href} target="_blank" rel="noopener" icon={<ExternalLink className="size-3.5" />}>Live</LinkButton>
          </>
        }
      />
      <pre className="max-h-72 overflow-auto bg-navy-900 p-4 font-mono text-[11.5px] leading-5 text-royal-100">{code}</pre>
    </Card>
  );
}
