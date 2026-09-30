"use client";

import { ChartColumn, CircleAlert, CircleCheck, CodeXml, ExternalLink, MapPin, ShieldCheck, Tag, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { timeAgo } from "@/lib/format";
import type { Integrations, Settings } from "@/lib/schemas";
import { SaveBar, useSectionForm } from "./use-section-form";
import { Badge, Card, CardBody, CardHeader, cx, Field, Input, PageHeader, Textarea } from "./ui/primitives";

/* ---------------- Parsers for pasted snippets ---------------- */
type Verification = Integrations["verification"][number];
const VERIFY_NAMES = ["google-site-verification", "msvalidate.01", "facebook-domain-verification", "p:domain_verify", "yandex-verification"];

function parseVerification(text: string) {
  const tags: Verification[] = [];
  const bad: string[] = [];
  for (const raw of text.split("\n").map((l) => l.trim()).filter(Boolean)) {
    const name = /name\s*=\s*["']([^"']+)["']/i.exec(raw)?.[1];
    const content = /content\s*=\s*["']([^"']+)["']/i.exec(raw)?.[1];
    if (name && content && VERIFY_NAMES.includes(name) && /^[\w.:-]{4,200}$/.test(content)) tags.push({ name: name as Verification["name"], content });
    else if (!raw.startsWith("<") && /^[\w-]{20,200}$/.test(raw)) tags.push({ name: "google-site-verification", content: raw }); // bare Google code
    else bad.push(raw);
  }
  return { tags, bad };
}
const verificationText = (v: Verification[]) => v.map((t) => `<meta name="${t.name}" content="${t.content}" />`).join("\n");

function extractIframeSrc(text: string) {
  const t = text.trim();
  if (!t) return "";
  return (/src\s*=\s*["']([^"']+)["']/i.exec(t)?.[1] ?? t).replace(/&amp;/g, "&");
}
/** Google's pb= embed format carries the pin as !3d<lat>!2d<lng>. */
function embedCoords(src: string) {
  const lat = /!3d(-?\d+\.\d+)/.exec(src)?.[1];
  const lng = /!2d(-?\d+\.\d+)/.exec(src)?.[1];
  return lat && lng ? { lat: Number(lat), lng: Number(lng) } : null;
}
const inAustralia = (c: { lat: number; lng: number }) => c.lat < -9 && c.lat > -44 && c.lng > 112 && c.lng < 154;

export function IntegrationsForm({ initial, updatedAt, address }: { initial: Integrations; updatedAt: string | null; address: Settings["address"] }) {
  const f = useSectionForm("integrations", initial, { label: "Integrations" });
  const v = f.value;
  const [verifyText, setVerifyText] = useState(verificationText(v.verification));
  const [mapText, setMapText] = useState(v.map.embedSrc ? `<iframe src="${v.map.embedSrc}" width="600" height="450" style="border:0;" allowfullscreen loading="lazy"></iframe>` : "");
  const parsedVerify = useMemo(() => parseVerification(verifyText), [verifyText]);
  const coords = v.map.embedSrc ? embedCoords(v.map.embedSrc) : null;
  const detectedId = /G-[A-Z0-9]{4,16}/.exec(v.analytics.snippet)?.[0];

  const mapPreview = v.map.embedSrc
    || (v.map.lat && v.map.lng ? `https://www.google.com/maps?q=${v.map.lat},${v.map.lng}&z=${v.map.zoom}&output=embed` : "")
    || `https://www.google.com/maps?q=${encodeURIComponent(`${address.street}, ${address.locality} ${address.region} ${address.postcode}, Australia`)}&output=embed`;

  const gaConnected = v.analytics.mode === "id" ? !!v.analytics.measurementId : v.analytics.mode === "snippet" && !!v.analytics.snippet.trim();

  return (
    <>
      <PageHeader
        eyebrow="Search & Growth"
        title="Integrations & Scripts"
        description="Analytics, Search Console verification, the contact-page map and any custom tracking code. Injected into every page of the live site."
        actions={updatedAt && <Badge>Last saved {timeAgo(updatedAt)}</Badge>}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* ---- Google Analytics ---- */}
        <Card>
          <CardHeader
            title="Google Analytics 4"
            description="Visitor and conversion tracking."
            icon={<ChartColumn className="size-[18px]" />}
            actions={gaConnected ? <Badge tone="green" dot>Active</Badge> : <Badge>Off</Badge>}
          />
          <CardBody className="space-y-5">
            <div className="inline-flex rounded-xl bg-slate-100 p-1" role="radiogroup" aria-label="Analytics setup">
              {([["id", "Measurement ID"], ["snippet", "Paste snippet"], ["off", "Off"]] as const).map(([m, label]) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={v.analytics.mode === m}
                  onClick={() => f.set("analytics.mode", m)}
                  className={cx("rounded-lg px-3 py-1.5 text-[13px] font-semibold transition", v.analytics.mode === m ? "bg-white text-navy-800 shadow-sm" : "text-slate-500 hover:text-navy-800")}
                >
                  {label}
                </button>
              ))}
            </div>
            {v.analytics.mode === "id" && (
              <Field label="Measurement ID" htmlFor="gaId" error={f.errors["analytics.measurementId"]} hint="GA4 → Admin → Data streams → your web stream. We add the standard gtag.js code for you.">
                <Input id="gaId" mono value={v.analytics.measurementId} placeholder="G-XXXXXXXXXX" onChange={(e) => f.set("analytics.measurementId", e.target.value.trim().toUpperCase())} invalid={!!f.errors["analytics.measurementId"]} />
              </Field>
            )}
            {v.analytics.mode === "snippet" && (
              <Field
                label="Google tag snippet"
                htmlFor="gaSnippet"
                error={f.errors["analytics.snippet"]}
                hint={detectedId ? <>Detected <b className="font-mono">{detectedId}</b>. Pasted into &lt;head&gt; exactly as written.</> : "Paste the full <script>…</script> block from Google."}
              >
                <Textarea
                  id="gaSnippet"
                  mono
                  rows={9}
                  value={v.analytics.snippet}
                  onChange={(e) => f.set("analytics.snippet", e.target.value)}
                  placeholder={`<!-- Google tag (gtag.js) -->\n<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>\n<script>\n  window.dataLayer = window.dataLayer || [];\n  function gtag(){dataLayer.push(arguments);}\n  gtag('js', new Date());\n\n  gtag('config', 'G-XXXXXXXXXX');\n</script>`}
                />
              </Field>
            )}
            {v.analytics.mode === "off" && <p className="text-[13px] text-slate-500">No analytics code is added to the site.</p>}
          </CardBody>
        </Card>

        {/* ---- Search Console ---- */}
        <Card>
          <CardHeader
            title="Google Search Console & Webmaster Tools"
            description="Ownership verification tags for Google, Bing, Meta and Pinterest."
            icon={<ShieldCheck className="size-[18px]" />}
            actions={
              <a href="https://search.google.com/search-console" target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-[13px] font-semibold text-royal-600 hover:text-royal-700">
                Open <ExternalLink className="size-3.5" />
              </a>
            }
          />
          <CardBody className="space-y-4">
            <Field label="Verification meta tags" htmlFor="verify" hint="One per line. Paste the full <meta> tag, or only the Google code." error={f.errors.verification}>
              <Textarea
                id="verify"
                mono
                rows={5}
                value={verifyText}
                onChange={(e) => {
                  setVerifyText(e.target.value);
                  f.set("verification", parseVerification(e.target.value).tags);
                }}
                placeholder={'<meta name="google-site-verification" content="…" />'}
                invalid={parsedVerify.bad.length > 0}
              />
            </Field>
            <ul className="space-y-1.5">
              {parsedVerify.tags.map((t, i) => (
                <li key={i} className="flex items-center gap-2 text-[12.5px]">
                  <CircleCheck className="size-4 shrink-0 text-emerald-500" />
                  <span className="shrink-0 font-semibold whitespace-nowrap text-navy-800">{t.name}</span>
                  <span className="truncate font-mono text-slate-500">{t.content}</span>
                </li>
              ))}
              {parsedVerify.bad.map((b, i) => (
                <li key={`b${i}`} className="flex items-center gap-2 text-[12.5px] text-red-600">
                  <CircleAlert className="size-4 shrink-0" />
                  <span className="truncate font-mono">Ignored: {b}</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        {/* ---- Map ---- */}
        <Card className="xl:col-span-2">
          <CardHeader
            title="Google Maps embed"
            description="The map on the Contact page."
            icon={<MapPin className="size-[18px]" />}
            actions={
              <a href={`https://www.google.com/maps/search/${encodeURIComponent(`${address.street} ${address.locality} ${address.region}`)}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-[13px] font-semibold text-royal-600 hover:text-royal-700">
                Get embed code <ExternalLink className="size-3.5" />
              </a>
            }
          />
          <CardBody className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="space-y-5">
              <Field
                label="Embed code (iframe)"
                htmlFor="mapEmbed"
                error={f.errors["map.embedSrc"]}
                hint="In Google Maps: Share → Embed a map → Copy HTML. Leave empty to show a map of the business address."
              >
                <Textarea
                  id="mapEmbed"
                  mono
                  rows={5}
                  value={mapText}
                  onChange={(e) => {
                    setMapText(e.target.value);
                    f.set("map.embedSrc", extractIframeSrc(e.target.value));
                  }}
                  placeholder={'<iframe src="https://www.google.com/maps/embed?pb=…" width="600" height="450" …></iframe>'}
                  invalid={!!f.errors["map.embedSrc"]}
                />
              </Field>
              {coords && !inAustralia(coords) && (
                <p className="flex gap-2 rounded-xl bg-amber-50 p-3 text-[13px] leading-5 text-amber-800 ring-1 ring-amber-200">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                  <span>
                    This embed is pinned at <b className="font-mono">{coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}</b>, which is outside Australia. Check it&rsquo;s the right location before saving.
                  </span>
                </p>
              )}
              <div className="grid grid-cols-3 gap-3">
                <Field label="Latitude" htmlFor="lat" error={f.errors["map.lat"]}>
                  <Input id="lat" mono value={v.map.lat} placeholder="-33.73" onChange={(e) => f.set("map.lat", e.target.value.trim())} />
                </Field>
                <Field label="Longitude" htmlFor="lng" error={f.errors["map.lng"]}>
                  <Input id="lng" mono value={v.map.lng} placeholder="151.00" onChange={(e) => f.set("map.lng", e.target.value.trim())} />
                </Field>
                <Field label="Zoom" htmlFor="zoom">
                  <Input id="zoom" type="number" min={3} max={21} mono value={v.map.zoom} onChange={(e) => f.set("map.zoom", Number(e.target.value) || 16)} />
                </Field>
              </div>
              <p className="text-xs leading-5 text-slate-500">
                Coordinates are added to your LocalBusiness structured data, and used for the map when no embed code is set.
              </p>
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
              <iframe title="Map preview" src={mapPreview} className="aspect-[4/3] w-full" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
            </div>
          </CardBody>
        </Card>

        {/* ---- GTM ---- */}
        <Card>
          <CardHeader title="Google Tag Manager" description="Optional. Use this if a marketing agency manages your tags." icon={<Tag className="size-[18px]" />} actions={v.gtmId ? <Badge tone="green" dot>Active</Badge> : <Badge>Not used</Badge>} />
          <CardBody>
            <Field label="Container ID" htmlFor="gtm" error={f.errors.gtmId} hint="Adds both the <head> script and the <body> noscript fallback.">
              <Input id="gtm" mono value={v.gtmId} placeholder="GTM-XXXXXXX" onChange={(e) => f.set("gtmId", e.target.value.trim().toUpperCase())} invalid={!!f.errors.gtmId} />
            </Field>
            {v.gtmId && v.analytics.mode !== "off" && (
              <p className="mt-3 text-xs leading-5 text-amber-700">If GA4 is also set up inside this GTM container, switch Google Analytics above to Off to avoid double-counting.</p>
            )}
          </CardBody>
        </Card>

        {/* ---- Custom code ---- */}
        <Card>
          <CardHeader title="Custom code injection" description="Meta Pixel, chat widgets, call tracking and so on." icon={<CodeXml className="size-[18px]" />} />
          <CardBody className="space-y-5">
            <p className="flex gap-2 rounded-xl bg-amber-50 p-3 text-[12.5px] leading-5 text-amber-800 ring-1 ring-amber-200">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              Runs on every page exactly as pasted. Only use code from providers you trust; a broken script can break the site.
            </p>
            <Field label={<>Inside <code className="font-mono">&lt;head&gt;</code></>} htmlFor="ch" error={f.errors.customHead}>
              <Textarea id="ch" mono rows={4} value={v.customHead} onChange={(e) => f.set("customHead", e.target.value)} placeholder="<!-- Meta Pixel Code -->" />
            </Field>
            <Field label={<>Start of <code className="font-mono">&lt;body&gt;</code></>} htmlFor="cbs" error={f.errors.customBodyStart}>
              <Textarea id="cbs" mono rows={3} value={v.customBodyStart} onChange={(e) => f.set("customBodyStart", e.target.value)} />
            </Field>
            <Field label={<>End of <code className="font-mono">&lt;body&gt;</code></>} htmlFor="cbe" error={f.errors.customBodyEnd}>
              <Textarea id="cbe" mono rows={3} value={v.customBodyEnd} onChange={(e) => f.set("customBodyEnd", e.target.value)} placeholder="<script src=&quot;https://widget.example.com/chat.js&quot; async></script>" />
            </Field>
          </CardBody>
        </Card>
      </div>

      <SaveBar
        dirty={f.dirty}
        saving={f.saving}
        onSave={f.save}
        onReset={() => {
          f.reset();
          setVerifyText(verificationText(initial.verification));
          setMapText(initial.map.embedSrc ? `<iframe src="${initial.map.embedSrc}"></iframe>` : "");
        }}
      />
    </>
  );
}
