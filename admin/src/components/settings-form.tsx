"use client";

import { Building2, Clock, Globe, MapPin, Palette, Phone, Share2 } from "lucide-react";
import { DAY_LABELS, toE164, type Settings } from "@/lib/schemas";
import { timeAgo } from "@/lib/format";
import { ImagePicker } from "./image-picker";
import { SaveBar, useSectionForm } from "./use-section-form";
import { Badge, Card, CardBody, CardHeader, Field, Input, PageHeader, Toggle } from "./ui/primitives";

const SOCIALS: { key: keyof Settings["social"]; label: string; placeholder: string }[] = [
  { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/sinvesta" },
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/sinvesta" },
  { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/company/sinvesta" },
  { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@sinvesta" },
  { key: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@sinvesta" },
  { key: "googleBusiness", label: "Google Business Profile", placeholder: "https://g.page/r/…" },
];

export function SettingsForm({ initial, updatedAt, updatedBy }: { initial: Settings; updatedAt: string | null; updatedBy: string | null }) {
  const f = useSectionForm("settings", initial, { label: "Global settings" });
  const v = f.value;
  const bind = (path: string, value: string) => ({
    id: path,
    value,
    invalid: !!f.errors[path],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => f.set(path, e.target.value),
  });

  return (
    <>
      <PageHeader
        eyebrow="Website"
        title="Global Settings"
        description="Business details used across every page: header, footer, contact page, structured data and enquiry routing."
        actions={updatedAt && <Badge>Last saved {timeAgo(updatedAt)}{updatedBy ? ` by ${updatedBy}` : ""}</Badge>}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title="Business identity" description="Shown in search results and structured data." icon={<Building2 className="size-[18px]" />} />
          <CardBody className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Trading name" htmlFor="businessName" error={f.errors.businessName}>
              <Input {...bind("businessName", v.businessName)} />
            </Field>
            <Field label="Legal entity" htmlFor="legalName" error={f.errors.legalName}>
              <Input {...bind("legalName", v.legalName)} />
            </Field>
            <Field label="ABN" htmlFor="abn" error={f.errors.abn} hint="Builds trust and is expected on Australian trade sites.">
              <Input {...bind("abn", v.abn)} placeholder="12 345 678 901" mono inputMode="numeric" />
            </Field>
            <Field label="Founder" htmlFor="founder" error={f.errors.founder}>
              <Input {...bind("founder", v.founder)} />
            </Field>
            <Field label="Year founded" htmlFor="foundingYear" error={f.errors.foundingYear}>
              <Input {...bind("foundingYear", v.foundingYear)} mono inputMode="numeric" maxLength={4} />
            </Field>
            <Field label="Website URL" htmlFor="siteUrl" error={f.errors.siteUrl} hint="Used for canonical links, sitemap and share images.">
              <Input {...bind("siteUrl", v.siteUrl)} mono />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Contact details" description="Updated automatically on every page where they appear." icon={<Phone className="size-[18px]" />} />
          <CardBody className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Phone" htmlFor="phoneDisplay" error={f.errors.phoneDisplay} hint={<>Links dial <span className="font-mono">{toE164(v.phoneDisplay)}</span></>}>
              <Input {...bind("phoneDisplay", v.phoneDisplay)} inputMode="tel" />
            </Field>
            <Field label="Public email" htmlFor="email" error={f.errors.email}>
              <Input {...bind("email", v.email)} type="email" />
            </Field>
            <Field
              className="sm:col-span-2"
              label="Send quote enquiries to"
              htmlFor="notificationEmail"
              error={f.errors.notificationEmail}
              hint="Every contact-form and pop-up enquiry is emailed here and saved to Quote Enquiries. Not shown on the website."
            >
              <Input {...bind("notificationEmail", v.notificationEmail)} type="email" />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Business address" icon={<MapPin className="size-[18px]" />} />
          <CardBody className="grid grid-cols-6 gap-5">
            <Field className="col-span-6" label="Street" htmlFor="address.street" error={f.errors["address.street"]}>
              <Input {...bind("address.street", v.address.street)} />
            </Field>
            <Field className="col-span-6 sm:col-span-3" label="Suburb" htmlFor="address.locality" error={f.errors["address.locality"]}>
              <Input {...bind("address.locality", v.address.locality)} />
            </Field>
            <Field className="col-span-3 sm:col-span-1" label="State" htmlFor="address.region" error={f.errors["address.region"]}>
              <Input {...bind("address.region", v.address.region)} />
            </Field>
            <Field className="col-span-3 sm:col-span-2" label="Postcode" htmlFor="address.postcode" error={f.errors["address.postcode"]}>
              <Input {...bind("address.postcode", v.address.postcode)} mono inputMode="numeric" />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Opening hours" description="Published to Google through LocalBusiness structured data." icon={<Clock className="size-[18px]" />} />
          <CardBody className="space-y-2.5">
            {(Object.keys(DAY_LABELS) as (keyof typeof DAY_LABELS)[]).map((d) => {
              const h = v.hours[d];
              return (
                <div key={d} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 sm:grid-cols-[130px_auto_1fr]">
                  <span className="text-sm font-medium text-navy-800">{DAY_LABELS[d]}</span>
                  <Toggle checked={h.open} onChange={(x) => f.set(`hours.${d}.open`, x)} />
                  {h.open ? (
                    <div className="col-span-2 flex items-center gap-2 sm:col-span-1">
                      <Input type="time" aria-label={`${DAY_LABELS[d]} opens`} value={h.from} onChange={(e) => f.set(`hours.${d}.from`, e.target.value)} className="h-9 min-w-0 flex-1 sm:max-w-[130px]" mono />
                      <span className="text-slate-400">–</span>
                      <Input type="time" aria-label={`${DAY_LABELS[d]} closes`} value={h.to} onChange={(e) => f.set(`hours.${d}.to`, e.target.value)} className="h-9 min-w-0 flex-1 sm:max-w-[130px]" mono />
                    </div>
                  ) : (
                    <span className="col-span-2 text-sm text-slate-400 sm:col-span-1">Closed</span>
                  )}
                </div>
              );
            })}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Social profiles" description="Linked to your business in Google's Knowledge Panel (sameAs)." icon={<Share2 className="size-[18px]" />} />
          <CardBody className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {SOCIALS.map((s) => (
              <Field key={s.key} label={s.label} htmlFor={`social.${s.key}`} error={f.errors[`social.${s.key}`]}>
                <Input {...bind(`social.${s.key}`, v.social[s.key])} placeholder={s.placeholder} type="url" />
              </Field>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Branding assets" icon={<Palette className="size-[18px]" />} />
          <CardBody className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Logo" hint="Used in structured data." error={f.errors["branding.logo"]}>
              <ImagePicker value={v.branding.logo} onChange={(x) => f.set("branding.logo", x)} />
            </Field>
            <Field label="Default share image" hint="Pages without their own image use this. 1200×630 works best." error={f.errors["branding.ogDefaultImage"]}>
              <ImagePicker value={v.branding.ogDefaultImage} onChange={(x) => f.set("branding.ogDefaultImage", x)} />
            </Field>
            <Field label="Browser theme colour" htmlFor="themeColor" error={f.errors["branding.themeColor"]}>
              <div className="flex items-center gap-2">
                <input type="color" aria-label="Pick colour" value={v.branding.themeColor} onChange={(e) => f.set("branding.themeColor", e.target.value)} className="h-10 w-12 cursor-pointer rounded-lg border border-slate-300 bg-white p-1" />
                <Input id="themeColor" value={v.branding.themeColor} onChange={(e) => f.set("branding.themeColor", e.target.value)} mono className="max-w-[140px]" />
              </div>
            </Field>
            <div className="flex items-end">
              <p className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">
                <Globe className="mt-0.5 size-4 shrink-0 text-slate-400" />
                Colours and fonts of the public site are part of its design system and stay in code.
              </p>
            </div>
          </CardBody>
        </Card>
      </div>

      <SaveBar dirty={f.dirty} saving={f.saving} onSave={f.save} onReset={f.reset} />
    </>
  );
}
