"use client";

import { RotateCcw, Save } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ZodType } from "zod";
import { apiFetch, type ApiError } from "@/lib/client";
import { contentSchema, indexingSchema, integrationsSchema, seoSchema, settingsSchema } from "@/lib/schemas";
import { Button } from "./ui/primitives";
import { useToast } from "./ui/toast";

type Path = string;

const SECTION_SCHEMAS: Record<string, ZodType> = {
  settings: settingsSchema, content: contentSchema, seo: seoSchema, integrations: integrationsSchema, indexing: indexingSchema,
};

export function getIn(obj: unknown, path: Path): unknown {
  return path.split(".").reduce<unknown>((o, k) => (o == null ? o : (o as Record<string, unknown>)[k]), obj);
}
export function setIn<T>(obj: T, path: Path, value: unknown): T {
  const [head, ...rest] = path.split(".");
  const src = (obj ?? {}) as Record<string, unknown>;
  const copy = (Array.isArray(src) ? [...src] : { ...src }) as Record<string, unknown>;
  copy[head] = rest.length ? setIn(src[head], rest.join("."), value) : value;
  return copy as T;
}

/**
 * State for one CMS section: edit locally, see what's dirty, save with one
 * PUT, map server validation errors back onto fields.
 */
export function useSectionForm<T>(section: string, initial: T, opts: { label: string }) {
  const [value, setValue] = useState<T>(initial);
  const [saved, setSaved] = useState<T>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const dirty = useMemo(() => JSON.stringify(value) !== JSON.stringify(saved), [value, saved]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = useCallback((path: Path, v: unknown) => {
    setValue((prev) => setIn(prev, path, v));
    setErrors((e) => {
      if (!(path in e)) return e;
      const { [path]: _, ...rest } = e;
      return rest;
    });
  }, []);

  const save = useCallback(async () => {
    // Validate here first for instant field errors; the PHP API re-checks everything.
    const schema = SECTION_SCHEMAS[section];
    const parsed = schema.safeParse(value);
    if (!parsed.success) {
      const map: Record<string, string> = {};
      for (const i of parsed.error.issues) map[i.path.join(".")] ??= i.message;
      setErrors(map);
      const n = Object.keys(map).length;
      toast("error", "Some fields need fixing", `${n} field${n > 1 ? "s" : ""} need attention.`);
      return;
    }
    setSaving(true);
    try {
      await apiFetch(`/cms/${section}`, { method: "PUT", body: JSON.stringify(parsed.data) });
      setSaved(value);
      setErrors({});
      toast("success", `${opts.label} saved`, "Live on the website straight away.");
    } catch (e) {
      const err = e as ApiError;
      const map: Record<string, string> = {};
      for (const d of err.details ?? []) map[d.path] = d.message;
      setErrors(map);
      toast("error", err.message || "Couldn't save", err.status === 0 ? "Check your connection and try again." : undefined);
    } finally {
      setSaving(false);
    }
  }, [section, value, toast, opts.label]);

  // ⌘S / Ctrl+S saves
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (dirty && !saving) void save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dirty, saving, save]);

  const reset = useCallback(() => {
    setValue(saved);
    setErrors({});
  }, [saved]);

  return { value, setValue, set, errors, dirty, saving, save, reset };
}

export function SaveBar({ dirty, saving, onSave, onReset }: { dirty: boolean; saving: boolean; onSave: () => void; onReset: () => void }) {
  return (
    <div
      aria-hidden={!dirty}
      className={`fixed inset-x-0 bottom-0 z-40 transition-transform duration-200 lg:left-[272px] ${dirty ? "translate-y-0" : "pointer-events-none translate-y-full"}`}
    >
      <div className="mx-auto mb-4 flex max-w-3xl items-center gap-3 rounded-2xl bg-navy-800/95 px-4 py-3 text-white shadow-lift ring-1 ring-white/10 backdrop-blur sm:px-5">
        <span className="relative flex size-2.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-gold-400 opacity-60" />
          <span className="relative inline-flex size-2.5 rounded-full bg-gold-500" />
        </span>
        <p className="flex-1 text-sm font-medium">
          Unsaved changes<span className="hidden text-slate-400 sm:inline"> · ⌘S to save</span>
        </p>
        <Button variant="ghost" size="sm" onClick={onReset} disabled={saving} className="text-slate-300 hover:bg-white/10 hover:text-white" icon={<RotateCcw className="size-3.5" />}>
          Discard
        </Button>
        <Button variant="amber" size="sm" onClick={onSave} loading={saving} icon={<Save className="size-3.5" />}>
          Save changes
        </Button>
      </div>
    </div>
  );
}
