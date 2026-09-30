"use client";

import {
  Braces, CircleCheck, CircleAlert, ExternalLink, Eye, Globe, Monitor, Plus, Search, Share2, Smartphone, Sparkles, Trash2, X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { previewSrc, timeAgo } from "@/lib/format";
import { SITE_PAGES, type PageId } from "@/lib/pages";
import { SCHEMA_TYPES, type Integrations, type PageSeo, type SeoConfig, type Settings } from "@/lib/schemas";
import { buildJsonLd, LIMITS, pageUrl, seoChecks, seoScore } from "@/lib/seo";
import { ImagePicker } from "./image-picker";
import { SaveBar, useSectionForm } from "./use-section-form";
import { Badge, Button, Card, CardBody, CardHeader, CharCounter, cx, Field, Input, PageHeader, Select, Textarea, Toggle } from "./ui/primitives";

const SCHEMA_LABELS: Record<(typeof SCHEMA_TYPES)[number], string> = {
  none: "None",
  LocalBusiness: "Local Business (ElectricalContractor)",
  Product: "Product (solar package)",
  Service: "Service (solar installation)",
  FAQPage: "FAQ page",
  custom: "Custom JSON-LD",
};

export function SeoEditor({
  initial, updatedAt, settings, integrations, initialPage,
}: {
  initial: SeoConfig; updatedAt: string | null; settings: Settings; integrations: Integrations; initialPage?: string;
}) {
  const f = useSectionForm("seo", initial, { label: "SEO settings" });
  const router = useRouter();
  const [pageId, setPageId] = useState<PageId>(SITE_PAGES.some((p) => p.id === initialPage) ? (initialPage as PageId) : "home");
  const p = f.value.pages[pageId];
  const base = `pages.${pageId}`;
  const err = (k: string) => f.errors[`${base}.${k}`];
  const set = (k: string, v: unknown) => f.set(`${base}.${k}`, v);

  const select = (id: PageId) => {
    setPageId(id);
    router.replace(`/seo?page=${id}`, { scroll: false });
  };

  return (
    <>
      <PageHeader
        eyebrow="Search & Growth"
        title="SEO Manager"
        description="Control exactly how each page appears in Google and when shared on social media."
        actions={updatedAt && <Badge>Last saved {timeAgo(updatedAt)}</Badge>}
      />

      {/* Page tabs with live score */}
      <div className="-mx-4 mb-6 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div role="tablist" aria-label="Page" className="inline-flex min-w-full gap-1 rounded-2xl bg-white p-1.5 shadow-card ring-1 ring-slate-200/80 sm:min-w-0">
          {SITE_PAGES.map((pg) => {
            const score = seoScore(f.value.pages[pg.id], settings);
            const active = pg.id === pageId;
            return (
              <button
                key={pg.id}
                role="tab"
                aria-selected={active}
                type="button"
                onClick={() => select(pg.id)}
                className={cx(
                  "flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold whitespace-nowrap transition",
                  active ? "bg-navy-800 text-white" : "text-slate-600 hover:bg-slate-100",
                )}
              >
                {pg.label}
                <span className={cx("rounded-md px-1.5 font-mono text-[11px]", score >= 85 ? "bg-emerald-500/15 text-emerald-600" : score >= 60 ? "bg-amber-500/15 text-amber-600" : "bg-red-500/15 text-red-500", active && "bg-white/15 text-white")}>
                  {score}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader title="Search appearance" description="The blue link and snippet on Google." icon={<Search className="size-[18px]" />} />
            <CardBody className="space-y-5">
              <Field label="Meta title" htmlFor="title" error={err("title")} counter={<CharCounter value={p.title} {...LIMITS.title} />} hint="Lead with the service and location. Google truncates around 60 characters.">
                <Input id="title" value={p.title} onChange={(e) => set("title", e.target.value)} invalid={!!err("title")} />
              </Field>
              <Field label="Meta description" htmlFor="description" error={err("description")} counter={<CharCounter value={p.description} {...LIMITS.description} />} hint="A reason to click: the benefit, a proof point, a call to action.">
                <Textarea id="description" rows={3} value={p.description} onChange={(e) => set("description", e.target.value)} invalid={!!err("description")} />
              </Field>
              <Field label="Focus keywords" hint="The first keyword is treated as primary. Press Enter or comma to add." error={err("keywords")}>
                <TagInput value={p.keywords} onChange={(v) => set("keywords", v)} />
              </Field>
              <Field label="Canonical URL" htmlFor="canonical" error={err("canonical")} hint="The one address Google should index for this content.">
                <div className="flex gap-2">
                  <Input id="canonical" mono value={p.canonical} onChange={(e) => set("canonical", e.target.value)} invalid={!!err("canonical")} />
                  <Button type="button" variant="secondary" onClick={() => set("canonical", pageUrl(settings.siteUrl, pageId))} className="shrink-0">
                    Reset
                  </Button>
                </div>
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Social sharing" description="Open Graph and X/Twitter cards: what people see when the page is shared in Facebook, WhatsApp, LinkedIn or iMessage." icon={<Share2 className="size-[18px]" />} />
            <CardBody className="space-y-5">
              <Field label="Share title" htmlFor="ogTitle" hint="Leave blank to reuse the meta title." counter={<CharCounter value={p.ogTitle || p.title} min={20} max={70} />}>
                <Input id="ogTitle" value={p.ogTitle} placeholder={p.title} onChange={(e) => set("ogTitle", e.target.value)} />
              </Field>
              <Field label="Share description" htmlFor="ogDescription" hint="Leave blank to reuse the meta description.">
                <Textarea id="ogDescription" rows={2} value={p.ogDescription} placeholder={p.description} onChange={(e) => set("ogDescription", e.target.value)} />
              </Field>
              <Field label="Share image" hint="1200 × 630 px. Falls back to the default share image in Global Settings." error={err("ogImage")}>
                <ImagePicker value={p.ogImage} onChange={(v) => set("ogImage", v)} />
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Indexing" description="Whether search engines may list this page." icon={<Globe className="size-[18px]" />} />
            <CardBody className="space-y-4">
              <Toggle checked={!p.noindex} onChange={(v) => set("noindex", !v)} label="Show in search results" description="Off adds noindex and removes the page from sitemap.xml." />
              <Toggle checked={!p.nofollow} onChange={(v) => set("nofollow", !v)} label="Let search engines follow links on this page" />
              {p.noindex && (
                <p className="flex gap-2 rounded-xl bg-red-50 p-3 text-[13px] text-red-700">
                  <CircleAlert className="mt-0.5 size-4 shrink-0" /> This page will drop out of Google within days of saving.
                </p>
              )}
            </CardBody>
          </Card>

          <SchemaBuilder p={p} set={set} err={err} />
        </div>

        {/* Live previews */}
        <div className="min-w-0 space-y-6 xl:sticky xl:top-24 xl:self-start">
          <SerpPreview p={p} url={p.canonical || pageUrl(settings.siteUrl, pageId)} />
          <SocialPreview p={p} settings={settings} />
          <Checks p={p} settings={settings} />
          <JsonLdPreview json={safeLd(pageId, p, settings, integrations)} />
        </div>
      </div>

      <SaveBar dirty={f.dirty} saving={f.saving} onSave={f.save} onReset={f.reset} />
    </>
  );
}

function safeLd(id: PageId, p: PageSeo, s: Settings, i: Integrations) {
  try {
    return buildJsonLd(id, p, s, i);
  } catch {
    return { error: "Custom JSON is not valid yet" };
  }
}

/* ---------------- Tag input ---------------- */
function TagInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const parts = draft.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length) onChange([...value, ...parts.filter((x) => !value.includes(x))].slice(0, 20));
    setDraft("");
  };
  return (
    <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-slate-300/90 bg-white px-2 py-1.5 focus-within:border-royal-500 focus-within:ring-4 focus-within:ring-royal-600/15">
      {value.map((k, i) => (
        <span key={k} className={cx("inline-flex items-center gap-1 rounded-md py-0.5 pr-1 pl-2 text-[12.5px] font-medium", i === 0 ? "bg-royal-600 text-white" : "bg-slate-100 text-navy-800")}>
          {k}
          <button type="button" onClick={() => onChange(value.filter((x) => x !== k))} className="rounded p-0.5 opacity-70 hover:opacity-100" aria-label={`Remove ${k}`}>
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add();
          } else if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
        }}
        onBlur={add}
        placeholder={value.length ? "" : "solar installer Sydney"}
        className="min-w-[140px] flex-1 border-0 bg-transparent px-1 text-sm outline-none placeholder:text-slate-400"
        aria-label="Add keyword"
      />
    </div>
  );
}

/* ---------------- Google SERP preview ---------------- */
function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;
}
function SerpPreview({ p, url }: { p: PageSeo; url: string }) {
  const [mobile, setMobile] = useState(false);
  const u = (() => {
    try {
      const x = new URL(url);
      return { host: x.host.replace(/^www\./, ""), crumbs: x.pathname.split("/").filter(Boolean).map((c) => c.replace(/\.html$/, "")) };
    } catch {
      return { host: "sinvesta.com.au", crumbs: [] };
    }
  })();
  const kw = p.keywords[0]?.toLowerCase();
  const desc = truncate(p.description || "Google will pick text from the page when there is no description.", mobile ? 120 : 158);
  const bolded = kw ? desc.split(new RegExp(`(${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "i")) : [desc];

  return (
    <Card>
      <CardHeader
        title="Google preview"
        icon={<Eye className="size-[18px]" />}
        actions={
          <div className="flex rounded-lg bg-slate-100 p-0.5">
            {[{ m: false, I: Monitor, l: "Desktop" }, { m: true, I: Smartphone, l: "Mobile" }].map(({ m, I, l }) => (
              <button key={l} type="button" onClick={() => setMobile(m)} aria-pressed={mobile === m} className={cx("rounded-md p-1.5", mobile === m ? "bg-white text-navy-800 shadow-sm" : "text-slate-500")} aria-label={l}>
                <I className="size-4" />
              </button>
            ))}
          </div>
        }
      />
      <CardBody>
        <div className={cx("mx-auto rounded-xl bg-white font-[Arial,sans-serif]", mobile ? "max-w-[360px] p-4 shadow-lift ring-1 ring-slate-200" : "")}>
          <div className="flex items-center gap-3">
            <span className="grid size-7 place-items-center rounded-full bg-slate-100 ring-1 ring-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/admin/logo-mark.png" alt="" className="size-4 object-contain" />
            </span>
            <div className="min-w-0 leading-tight">
              <p className="text-[14px] text-[#202124]">Sinvesta Group</p>
              <p className="truncate text-[12px] text-[#4d5156]">
                https://{u.host}
                {u.crumbs.map((c) => ` › ${c}`)}
              </p>
            </div>
          </div>
          <p className={cx("mt-2 leading-snug text-[#1a0dab] hover:underline", mobile ? "text-[18px]" : "text-[20px]")}>{truncate(p.title || "Untitled page", mobile ? 70 : 60)}</p>
          <p className="mt-1 text-[14px] leading-[1.58] text-[#4d5156]">
            {bolded.map((part, i) => (part.toLowerCase() === kw ? <b key={i}>{part}</b> : <span key={i}>{part}</span>))}
          </p>
        </div>
      </CardBody>
    </Card>
  );
}

/* ---------------- Social card preview ---------------- */
function SocialPreview({ p, settings }: { p: PageSeo; settings: Settings }) {
  const img = previewSrc(p.ogImage || settings.branding.ogDefaultImage);
  const host = settings.siteUrl.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "").toUpperCase();
  return (
    <Card>
      <CardHeader title="Share preview" description="Facebook / LinkedIn / WhatsApp" icon={<Share2 className="size-[18px]" />} />
      <CardBody>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-[#f0f2f5]">
          <div className="relative aspect-[1.91/1] bg-slate-200">
            {img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={img} alt="" className="absolute inset-0 size-full object-cover" />
            ) : (
              <span className="absolute inset-0 grid place-items-center text-xs text-slate-500">No image</span>
            )}
          </div>
          <div className="border-t border-slate-200 px-3.5 py-2.5">
            <p className="text-[11.5px] tracking-wide text-[#65676b]">{host}</p>
            <p className="mt-0.5 line-clamp-2 text-[15px] leading-5 font-semibold text-[#050505]">{p.ogTitle || p.title}</p>
            <p className="mt-0.5 line-clamp-1 text-[13.5px] text-[#65676b]">{p.ogDescription || p.description}</p>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function Checks({ p, settings }: { p: PageSeo; settings: Settings }) {
  const checks = seoChecks(p, settings);
  const score = seoScore(p, settings);
  return (
    <Card>
      <CardHeader title="Page checklist" icon={<CircleCheck className="size-[18px]" />} actions={<Badge tone={score >= 85 ? "green" : score >= 60 ? "amber" : "red"}>{score}/100</Badge>} />
      <ul className="divide-y divide-slate-100">
        {checks.map((c) => (
          <li key={c.label} className="flex items-center gap-3 px-5 py-2.5 text-[13px] sm:px-6">
            {c.ok ? <CircleCheck className="size-4 shrink-0 text-emerald-500" /> : <CircleAlert className={cx("size-4 shrink-0", c.warn ? "text-amber-500" : "text-red-500")} />}
            <span className={c.ok ? "text-slate-700" : "font-medium text-navy-800"}>{c.label}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ---------------- Structured data ---------------- */
function SchemaBuilder({ p, set, err }: { p: PageSeo; set: (k: string, v: unknown) => void; err: (k: string) => string | undefined }) {
  const sc = p.schema;
  return (
    <Card>
      <CardHeader
        title="Structured data (JSON-LD)"
        description="Helps Google show rich results: business details, prices, FAQs."
        icon={<Braces className="size-[18px]" />}
      />
      <CardBody className="space-y-5">
        <Field label="Schema type" htmlFor="schemaType">
          <Select id="schemaType" value={sc.type} onChange={(e) => set("schema.type", e.target.value)}>
            {SCHEMA_TYPES.map((t) => <option key={t} value={t}>{SCHEMA_LABELS[t]}</option>)}
          </Select>
        </Field>

        {sc.type === "none" && <p className="text-[13px] text-slate-500">No structured data is added, and any already in the page&rsquo;s HTML is left as it is.</p>}
        {sc.type === "LocalBusiness" && (
          <p className="flex gap-2 rounded-xl bg-royal-50 p-3 text-[13px] leading-5 text-royal-800">
            <Sparkles className="mt-0.5 size-4 shrink-0" />
            Built automatically from Global Settings: name, ABN, address, phone, opening hours, social profiles and map coordinates.
          </p>
        )}
        {sc.type === "Product" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Product name" htmlFor="pname"><Input id="pname" value={sc.product.name} placeholder="10kW Solar + 27kWh SigEnergy Battery" onChange={(e) => set("schema.product.name", e.target.value)} /></Field>
            <Field label="Brand" htmlFor="pbrand"><Input id="pbrand" value={sc.product.brand} placeholder="Sigenergy" onChange={(e) => set("schema.product.brand", e.target.value)} /></Field>
            <Field label="Price (AUD, incl. GST)" htmlFor="pprice"><Input id="pprice" type="number" mono min={0} value={sc.product.price || ""} onChange={(e) => set("schema.product.price", Number(e.target.value) || 0)} /></Field>
            <Field label="SKU / package code" htmlFor="psku"><Input id="psku" mono value={sc.product.sku} placeholder="SV-10-27" onChange={(e) => set("schema.product.sku", e.target.value)} /></Field>
            <Field className="sm:col-span-2" label="Description" htmlFor="pdesc"><Textarea id="pdesc" rows={2} value={sc.product.description} placeholder={p.description} onChange={(e) => set("schema.product.description", e.target.value)} /></Field>
            <Field className="sm:col-span-2" label="Product image"><ImagePicker value={sc.product.image} onChange={(v) => set("schema.product.image", v)} /></Field>
          </div>
        )}
        {sc.type === "Service" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Service type" htmlFor="stype"><Input id="stype" value={sc.service.serviceType} onChange={(e) => set("schema.service.serviceType", e.target.value)} /></Field>
            <Field label="Area served" htmlFor="sarea"><Input id="sarea" value={sc.service.areaServed} onChange={(e) => set("schema.service.areaServed", e.target.value)} /></Field>
            <Field className="sm:col-span-2" label="Description" htmlFor="sdesc"><Textarea id="sdesc" rows={2} value={sc.service.description} placeholder={p.description} onChange={(e) => set("schema.service.description", e.target.value)} /></Field>
          </div>
        )}
        {sc.type === "FAQPage" && (
          <div className="space-y-3">
            {sc.faq.map((item, i) => (
              <div key={i} className="rounded-xl border border-slate-200 p-3">
                <div className="flex gap-2">
                  <Input aria-label={`Question ${i + 1}`} value={item.q} placeholder="How long does installation take?" onChange={(e) => set(`schema.faq.${i}.q`, e.target.value)} />
                  <Button type="button" variant="ghost" onClick={() => set("schema.faq", sc.faq.filter((_, j) => j !== i))} aria-label="Remove question"><Trash2 className="size-4" /></Button>
                </div>
                <Textarea aria-label={`Answer ${i + 1}`} className="mt-2" rows={2} value={item.a} placeholder="Most homes are done in a single day…" onChange={(e) => set(`schema.faq.${i}.a`, e.target.value)} />
              </div>
            ))}
            <Button type="button" variant="secondary" size="sm" icon={<Plus className="size-3.5" />} onClick={() => set("schema.faq", [...sc.faq, { q: "", a: "" }])}>Add question</Button>
            <p className="text-xs text-slate-500">Only add questions that are visibly answered on the page. Google ignores FAQ markup that doesn&rsquo;t match the content.</p>
          </div>
        )}
        {sc.type === "custom" && (
          <Field label="JSON-LD" htmlFor="custom" error={err("schema.custom")} hint="Paste a JSON object; the <script> wrapper is added for you.">
            <Textarea id="custom" mono rows={10} value={sc.custom} placeholder='{ "@context": "https://schema.org", "@type": "…" }' onChange={(e) => set("schema.custom", e.target.value)} />
          </Field>
        )}
      </CardBody>
    </Card>
  );
}

function JsonLdPreview({ json }: { json: object | null }) {
  const text = useMemo(() => (json ? JSON.stringify(json, null, 2) : ""), [json]);
  if (!json) return null;
  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Generated JSON-LD"
        icon={<Braces className="size-[18px]" />}
        actions={
          <a href="https://search.google.com/test/rich-results" target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-[13px] font-semibold text-royal-600 hover:text-royal-700">
            Rich Results Test <ExternalLink className="size-3.5" />
          </a>
        }
      />
      <pre className="max-h-80 overflow-auto bg-navy-900 p-4 font-mono text-[11.5px] leading-5 text-royal-100">{text}</pre>
    </Card>
  );
}
