"use client";

import {
  ArrowUpRight, ChartColumn, CircleAlert, CircleCheck, FileText, Gauge, Inbox, MapPin, Network, Search, ShieldCheck, Tag,
} from "lucide-react";
import Link from "next/link";
import { InquiryStatusBadge } from "./inquiry-status";
import { PageError, PageSkeleton } from "./page-state";
import { Badge, Card, CardHeader, PageHeader } from "./ui/primitives";
import { useApi } from "@/lib/client";
import { CONTENT_DEFAULTS } from "@/lib/content-schema";
import { dateTime, timeAgo } from "@/lib/format";
import type { Content, Indexing, Inquiry, Integrations, SeoConfig, Settings } from "@/lib/schemas";
import { SITE_PAGES } from "@/lib/pages";
import { seoScore } from "@/lib/seo";

interface DashboardData {
  inquiries: Inquiry[];
  settings: { data: Settings };
  seo: { data: SeoConfig };
  integrations: { data: Integrations };
  indexing: { data: Indexing };
  content: { data: Content };
  activity: { at: string; by: string; action: string }[];
  emailConfigured: boolean;
}

export function DashboardScreen() {
  const { data, error, reload } = useApi<[DashboardData]>(["/dashboard"]);
  if (error) return <PageError message={error} onRetry={reload} />;
  if (!data) return <PageSkeleton />;
  return <Dashboard {...data[0]} />;
}

function Dashboard({ inquiries, settings, seo, integrations, indexing, content, activity, emailConfigured }: DashboardData) {

  const now = Date.now();
  const within = (days: number) => inquiries.filter((i) => now - new Date(i.createdAt).getTime() < days * 864e5);
  const week = within(7).length;
  const prevWeek = within(14).length - week;
  const open = inquiries.filter((i) => i.status === "new").length;
  const won = within(90).filter((i) => i.status === "won").length;
  const decided = within(90).filter((i) => i.status === "won" || i.status === "lost").length;

  const scores = SITE_PAGES.map((p) => ({ ...p, score: seoScore(seo.data.pages[p.id], settings.data), noindex: seo.data.pages[p.id].noindex }));
  const avgScore = Math.round(scores.reduce((a, b) => a + b.score, 0) / scores.length);
  const indexed = SITE_PAGES.filter((p) => !seo.data.pages[p.id].noindex && indexing.data.sitemap[p.id].include).length;
  const edited = Object.entries(content.data).filter(([k, v]) => CONTENT_DEFAULTS[k] !== v).length;

  const i = integrations.data;
  const checks = [
    { label: "Google Analytics", ok: i.analytics.mode !== "off" && !!(i.analytics.measurementId || i.analytics.snippet), detail: i.analytics.mode === "id" ? i.analytics.measurementId : i.analytics.mode === "snippet" ? "Custom snippet" : "Off", icon: ChartColumn },
    { label: "Search Console", ok: i.verification.some((v) => v.name === "google-site-verification"), detail: `${i.verification.length} verification tag${i.verification.length === 1 ? "" : "s"}`, icon: ShieldCheck },
    { label: "Google Tag Manager", ok: !!i.gtmId, detail: i.gtmId || "Not used", icon: Tag, optional: true },
    { label: "Contact page map", ok: true, detail: i.map.embedSrc ? "Custom embed" : i.map.lat ? "From coordinates" : "Address map (default)", icon: MapPin },
    { label: "Enquiry emails", ok: emailConfigured, detail: emailConfigured ? `To ${settings.data.notificationEmail}` : "Mail sending is off on this server", icon: Inbox },
  ];

  const stats = [
    { label: "Enquiries this week", value: week, sub: prevWeek === 0 ? "No enquiries the week before" : `${week >= prevWeek ? "+" : ""}${week - prevWeek} vs last week`, icon: Inbox, href: "/inquiries" },
    { label: "Awaiting reply", value: open, sub: open ? "Reply to these first" : "All caught up", icon: CircleAlert, href: "/inquiries?status=new", highlight: open > 0 },
    { label: "SEO health", value: `${avgScore}%`, sub: "Average across 6 pages", icon: Gauge, href: "/seo" },
    { label: "Pages in sitemap", value: `${indexed}/${SITE_PAGES.length}`, sub: decided ? `Win rate ${Math.round((won / decided) * 100)}% (90 days)` : `${edited} content edits live`, icon: Network, href: "/seo/sitemap" },
  ];

  const hour = Number(new Date().toLocaleString("en-AU", { hour: "numeric", hour12: false, timeZone: "Australia/Sydney" }));
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <>
      <PageHeader
        eyebrow="Dashboard"
        title={`${greeting}.`}
        description="Enquiries, search visibility and site status at a glance."
        actions={
          <Link href="/content" className="inline-flex h-10 items-center gap-2 rounded-lg bg-royal-600 px-4 text-sm font-semibold text-white shadow-sm shadow-royal-600/30 hover:bg-royal-700">
            <FileText className="size-4" /> Edit page content
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className={`group relative overflow-hidden rounded-2xl border bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-lift ${s.highlight ? "border-gold-400/60" : "border-slate-200/80"}`}>
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-medium text-slate-500">{s.label}</p>
              <span className={`grid size-8 place-items-center rounded-lg ${s.highlight ? "bg-gold-500/15 text-gold-600" : "bg-royal-50 text-royal-600"}`}>
                <s.icon className="size-4" />
              </span>
            </div>
            <p className="mt-3 font-mono text-3xl font-medium tracking-tight text-navy-800 tabular-nums">{s.value}</p>
            <p className="mt-1 text-xs text-slate-500">{s.sub}</p>
            <ArrowUpRight className="absolute right-4 bottom-4 size-4 text-slate-300 transition group-hover:text-royal-600" />
          </Link>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Recent quote enquiries"
            description={`From the website forms. Emailed to ${settings.data.notificationEmail}.`}
            icon={<Inbox className="size-[18px]" />}
            actions={<Link href="/inquiries" className="text-[13px] font-semibold text-royal-600 hover:text-royal-700">View all →</Link>}
          />
          {inquiries.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <Inbox className="mx-auto size-8 text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-navy-800">No enquiries yet</p>
              <p className="mt-1 text-[13px] text-slate-500">New quote requests from the contact form and pop-up will land here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-[11.5px] font-semibold tracking-wide text-slate-500 uppercase">
                    <th className="px-6 py-3 font-semibold">Customer</th>
                    <th className="px-3 py-3 font-semibold">System</th>
                    <th className="hidden px-3 py-3 font-semibold md:table-cell">Suburb</th>
                    <th className="px-3 py-3 font-semibold">Status</th>
                    <th className="px-6 py-3 text-right font-semibold">Received</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inquiries.slice(0, 6).map((q) => (
                    <tr key={q.id} className="hover:bg-slate-50/70">
                      <td className="px-6 py-3.5">
                        <Link href={`/inquiries?id=${q.id}`} className="font-semibold text-navy-800 hover:text-royal-600">{q.name}</Link>
                        <p className="font-mono text-xs text-slate-500">{q.phone}</p>
                      </td>
                      <td className="px-3 py-3.5 text-slate-700">{q.system || "—"}</td>
                      <td className="hidden px-3 py-3.5 text-slate-600 md:table-cell">{q.suburb || "—"}</td>
                      <td className="px-3 py-3.5"><InquiryStatusBadge status={q.status} /></td>
                      <td className="px-6 py-3.5 text-right text-xs whitespace-nowrap text-slate-500" title={dateTime(q.createdAt)}>{timeAgo(q.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Site status" description="Tracking and delivery checks." icon={<ShieldCheck className="size-[18px]" />} />
          <ul className="divide-y divide-slate-100">
            {checks.map((c) => (
              <li key={c.label} className="flex items-center gap-3 px-5 py-3.5 sm:px-6">
                <c.icon className="size-4 shrink-0 text-slate-400" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-navy-800">{c.label}</p>
                  <p className="truncate font-mono text-[11.5px] text-slate-500">{c.detail}</p>
                </div>
                {c.ok ? (
                  <CircleCheck className="size-5 text-emerald-500" aria-label="OK" />
                ) : c.optional ? (
                  <Badge>Optional</Badge>
                ) : (
                  <Badge tone="amber" dot>Action</Badge>
                )}
              </li>
            ))}
          </ul>
          <div className="border-t border-slate-100 px-5 py-3 sm:px-6">
            <Link href="/integrations" className="text-[13px] font-semibold text-royal-600 hover:text-royal-700">Manage integrations →</Link>
          </div>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader title="SEO health by page" description="Title, description, canonical, keywords, share image and indexing." icon={<Search className="size-[18px]" />} />
          <ul className="grid grid-cols-1 gap-px bg-slate-100 sm:grid-cols-2 lg:grid-cols-3">
            {scores.map((p) => (
              <li key={p.id} className="bg-white">
                <Link href={`/seo?page=${p.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 sm:px-6">
                  <ScoreRing value={p.score} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-navy-800">{p.label}</p>
                    <p className="truncate font-mono text-[11.5px] text-slate-500">{p.path}</p>
                    {p.noindex && <Badge tone="red" className="mt-1">noindex</Badge>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Recent activity" icon={<CircleCheck className="size-[18px]" />} />
          {activity.length === 0 ? (
            <p className="px-6 py-8 text-center text-[13px] text-slate-500">Changes you make will be logged here.</p>
          ) : (
            <ol className="relative space-y-4 px-6 py-5 before:absolute before:top-6 before:bottom-6 before:left-[29px] before:w-px before:bg-slate-200">
              {activity.map((a) => (
                <li key={a.at + a.action} className="relative flex gap-3">
                  <span className="relative z-10 mt-1 size-2.5 shrink-0 rounded-full bg-royal-600 ring-4 ring-white" />
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-navy-800">{a.action}</p>
                    <p className="text-[11.5px] text-slate-500">{timeAgo(a.at)} · {a.by}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </>
  );
}

function ScoreRing({ value }: { value: number }) {
  const r = 18, c = 2 * Math.PI * r;
  const color = value >= 85 ? "#10b981" : value >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" className="shrink-0" role="img" aria-label={`SEO score ${value}%`}>
      <circle cx="24" cy="24" r={r} fill="none" stroke="#eef2f7" strokeWidth="5" />
      <circle cx="24" cy="24" r={r} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${(value / 100) * c} ${c}`} transform="rotate(-90 24 24)" />
      <text x="24" y="28" textAnchor="middle" className="fill-navy-800 font-mono text-[11px] font-medium">{value}</text>
    </svg>
  );
}
