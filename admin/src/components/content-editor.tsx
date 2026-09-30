"use client";

import { ExternalLink, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CONTENT_DEFAULTS, CONTENT_GROUPS, type ContentField } from "@/lib/content-schema";
import { timeAgo } from "@/lib/format";
import { sanitizeRich } from "@/lib/sanitize";
import type { Content } from "@/lib/schemas";
import { ImagePicker } from "./image-picker";
import { SaveBar, useSectionForm } from "./use-section-form";
import { Badge, Card, CardBody, CardHeader, cx, Field, Input, LinkButton, PageHeader, Textarea } from "./ui/primitives";

const aud = (n: number) => "$" + Math.round(n).toLocaleString("en-AU");

export function ContentEditor({ initial, updatedAt, siteUrl, initialGroup }: { initial: Content; updatedAt: string | null; siteUrl: string; initialGroup?: string }) {
  const f = useSectionForm("content", initial, { label: "Page content" });
  const router = useRouter();
  const [groupId, setGroupId] = useState(CONTENT_GROUPS.some((g) => g.id === initialGroup) ? initialGroup! : CONTENT_GROUPS[0].id);
  const group = CONTENT_GROUPS.find((g) => g.id === groupId)!;

  const changed = (key: string) => f.value[key] !== CONTENT_DEFAULTS[key];
  const changedIn = (gid: string) =>
    CONTENT_GROUPS.find((g) => g.id === gid)!.sections.flatMap((s) => s.fields).filter((fl) => changed(fl.key)).length;

  const pick = (id: string) => {
    setGroupId(id);
    router.replace(`/content?group=${id}`, { scroll: false });
  };

  return (
    <>
      <PageHeader
        eyebrow="Website"
        title="Page Content"
        description="Edit headlines, package pricing, descriptions and imagery. Only fields you change override the page; everything else stays exactly as designed."
        actions={updatedAt && <Badge>Last saved {timeAgo(updatedAt)}</Badge>}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        {/* Page rail */}
        <nav aria-label="Pages" className="lg:sticky lg:top-24 lg:self-start">
          <ul className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
            {CONTENT_GROUPS.map((g) => {
              const n = changedIn(g.id);
              const active = g.id === groupId;
              return (
                <li key={g.id} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => pick(g.id)}
                    aria-current={active ? "page" : undefined}
                    className={cx(
                      "flex w-full items-center gap-2 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium whitespace-nowrap transition",
                      active ? "bg-white text-navy-800 shadow-card ring-1 ring-slate-200" : "text-slate-600 hover:bg-white/70 hover:text-navy-800",
                    )}
                  >
                    <span className={cx("size-1.5 rounded-full", active ? "bg-royal-600" : "bg-transparent")} />
                    <span className="flex-1">{g.label}</span>
                    {n > 0 && <span className="rounded-full bg-royal-50 px-1.5 font-mono text-[11px] font-semibold text-royal-700">{n}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="min-w-0 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-navy-800">{group.label}</h2>
            <LinkButton size="sm" href={siteUrl.replace(/\/$/, "") + group.pageUrl} target="_blank" rel="noopener" icon={<ExternalLink className="size-3.5" />}>
              View live page
            </LinkButton>
          </div>

          {group.sections.map((section) => (
            <Card key={section.id}>
              <CardHeader title={section.title} description={section.description} />
              <CardBody className={cx("grid grid-cols-1 gap-5", section.id === "gallery" ? "sm:grid-cols-2 xl:grid-cols-3" : "md:grid-cols-2")}>
                {section.fields.map((field) => (
                  <FieldEditor
                    key={field.key}
                    field={field}
                    value={f.value[field.key] ?? CONTENT_DEFAULTS[field.key]}
                    changed={changed(field.key)}
                    error={f.errors[field.key]}
                    onChange={(v) => f.setValue((prev) => ({ ...prev, [field.key]: v }))}
                    all={f.value}
                  />
                ))}
              </CardBody>
            </Card>
          ))}
        </div>
      </div>

      <SaveBar dirty={f.dirty} saving={f.saving} onSave={f.save} onReset={f.reset} />
    </>
  );
}

function FieldEditor({
  field, value, changed, error, onChange, all,
}: {
  field: ContentField; value: string | number; changed: boolean; error?: string; onChange: (v: string | number) => void; all: Content;
}) {
  const def = CONTENT_DEFAULTS[field.key];
  const wide = field.multiline || field.type === "rich";
  const aside = changed ? (
    <span className="flex items-center gap-1.5">
      <Badge tone="blue">Edited</Badge>
      {field.type !== "image" && (
        <button type="button" onClick={() => onChange(def)} className="rounded p-0.5 text-slate-400 hover:text-royal-600" title="Restore original" aria-label={`Restore original ${field.label}`}>
          <RotateCcw className="size-3.5" />
        </button>
      )}
    </span>
  ) : undefined;

  if (field.type === "image") {
    return (
      <Field label={field.label} error={error} aside={aside}>
        <ImagePicker value={String(value)} defaultValue={String(def)} onChange={onChange} />
      </Field>
    );
  }

  if (field.type === "price") {
    const id = field.key.split(".")[1];
    const now = Number(all[`pkg.${id}.now`] ?? CONTENT_DEFAULTS[`pkg.${id}.now`]);
    const was = Number(all[`pkg.${id}.was`] ?? CONTENT_DEFAULTS[`pkg.${id}.was`]);
    const isNow = field.key.endsWith(".now");
    return (
      <Field
        label={field.label}
        htmlFor={field.key}
        error={error}
        aside={aside}
        hint={isNow ? (was > now ? <>Badge shows <b className="text-emerald-700">Save {aud(was - now)}</b></> : "No saving badge (was price not higher).") : field.help}
      >
        <div className="relative">
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 font-mono text-sm text-slate-400">$</span>
          <Input
            id={field.key}
            type="number"
            inputMode="numeric"
            min={0}
            step={100}
            mono
            className="pl-7"
            value={value === 0 && !isNow ? "" : value}
            placeholder="0"
            invalid={!!error}
            onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
          />
        </div>
      </Field>
    );
  }

  return (
    <Field
      className={wide ? "md:col-span-2" : undefined}
      label={field.label}
      htmlFor={field.key}
      error={error}
      aside={aside}
      hint={field.help}
    >
      {field.multiline || field.type === "rich" ? (
        <Textarea id={field.key} rows={field.type === "rich" && !field.multiline ? 2 : 3} value={String(value)} invalid={!!error} mono={field.type === "rich"} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <Input id={field.key} value={String(value)} invalid={!!error} onChange={(e) => onChange(e.target.value)} />
      )}
      {field.type === "rich" && (
        <div className="mt-2 rounded-lg border border-dashed border-slate-200 bg-slate-50/70 px-3 py-2 text-[15px] leading-6 text-navy-800 [&_em]:text-royal-600 [&_em]:not-italic [&_strong]:font-semibold">
          <span className="mr-2 text-[10.5px] font-semibold tracking-wider text-slate-400 uppercase">Preview</span>
          <span dangerouslySetInnerHTML={{ __html: sanitizeRich(String(value)) }} />
        </div>
      )}
    </Field>
  );
}
