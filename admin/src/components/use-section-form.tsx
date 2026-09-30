"use client";

import { RotateCcw, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/constants";
import { Button } from "./ui/primitives";
import { useToast } from "./ui/toast";

type Path = string;

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
  const router = useRouter();

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
    setSaving(true);
    try {
      const res = await fetch(api(`/cms/${section}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(value),
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 401) {
        toast("error", "Your session expired", "Sign in again — your edits are still on this page.");
        return;
      }
      if (!res.ok) {
        const map: Record<string, string> = {};
        for (const d of (body.details as { path: string; message: string }[]) ?? []) map[d.path] = d.message;
        setErrors(map);
        const n = Object.keys(map).length;
        toast("error", body.error ?? "Couldn't save", n ? `${n} field${n > 1 ? "s" : ""} need attention.` : undefined);
        return;
      }
      setSaved(value);
      setErrors({});
      toast("success", `${opts.label} saved`, "Live on the website within about a minute.");
      router.refresh();
    } catch {
      toast("error", "Network error", "Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }, [section, value, toast, opts.label, router]);

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
