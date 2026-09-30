"use client";

import { Check, Copy, ImageOff, LoaderCircle, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/constants";
import { timeAgo } from "@/lib/format";
import { Button, cx } from "./ui/primitives";
import { useToast } from "./ui/toast";

export interface MediaItem {
  id: string;
  name: string;
  contentType: string;
  size: number;
  uploadedAt: string;
  url: string;
}

const kb = (n: number) => (n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.round(n / 1e3)} KB`);

export function useMedia() {
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [uploading, setUploading] = useState(0);
  const toast = useToast();

  const load = useCallback(async () => {
    const res = await fetch(api("/media"));
    if (res.ok) setItems((await res.json()).items);
    else setItems([]);
  }, []);
  useEffect(() => void load(), [load]);

  const upload = useCallback(
    async (files: FileList | File[]) => {
      const uploaded: MediaItem[] = [];
      for (const file of Array.from(files)) {
        setUploading((n) => n + 1);
        try {
          const body = new FormData();
          body.append("file", file);
          const res = await fetch(api("/media"), { method: "POST", body });
          const json = await res.json().catch(() => ({}));
          if (!res.ok) toast("error", `Couldn't upload ${file.name}`, json.error);
          else uploaded.push(json.item);
        } finally {
          setUploading((n) => n - 1);
        }
      }
      if (uploaded.length) {
        setItems((prev) => [...uploaded, ...(prev ?? [])]);
        toast("success", uploaded.length === 1 ? "Image uploaded" : `${uploaded.length} images uploaded`);
      }
      return uploaded;
    },
    [toast],
  );

  const remove = useCallback(
    async (id: string) => {
      const res = await fetch(api(`/media/${id}`), { method: "DELETE" });
      if (res.ok) {
        setItems((prev) => prev?.filter((m) => m.id !== id) ?? null);
        toast("success", "Image deleted");
      } else toast("error", "Couldn't delete image");
    },
    [toast],
  );

  return { items, uploading, upload, remove, reload: load };
}

export function Dropzone({ onFiles, busy, compact }: { onFiles: (f: FileList) => void; busy: boolean; compact?: boolean }) {
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files);
      }}
      className={cx(
        "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed text-center transition-colors",
        compact ? "px-4 py-6" : "px-6 py-10",
        over ? "border-royal-500 bg-royal-50" : "border-slate-300 bg-slate-50/60 hover:border-slate-400",
      )}
    >
      <span className="grid size-11 place-items-center rounded-xl bg-white text-royal-600 shadow-card">
        {busy ? <LoaderCircle className="size-5 animate-spin" /> : <Upload className="size-5" />}
      </span>
      <p className="mt-3 text-sm font-semibold text-navy-800">{busy ? "Uploading…" : "Drop images here"}</p>
      <p className="mt-1 text-xs text-slate-500">PNG with transparency for 3D product renders · JPG or WebP for photos · up to 8 MB</p>
      <Button type="button" variant="secondary" size="sm" className="mt-4" onClick={() => input.current?.click()} disabled={busy}>
        Browse files
      </Button>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files?.length) onFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

export function MediaGrid({
  items, selected, onSelect, onDelete,
}: {
  items: MediaItem[]; selected?: string; onSelect?: (m: MediaItem) => void; onDelete?: (m: MediaItem) => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  if (!items.length)
    return (
      <div className="py-12 text-center">
        <ImageOff className="mx-auto size-8 text-slate-300" />
        <p className="mt-2 text-sm text-slate-500">No uploads yet.</p>
      </div>
    );
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {items.map((m) => {
        const isSel = selected === m.url;
        return (
          <li key={m.id} className={cx("group overflow-hidden rounded-xl border bg-white transition", isSel ? "border-royal-600 ring-2 ring-royal-600/30" : "border-slate-200 hover:border-slate-300")}>
            <button
              type="button"
              onClick={() => onSelect?.(m)}
              disabled={!onSelect}
              className="relative block aspect-[4/3] w-full bg-[conic-gradient(#f1f5f9_25%,#fff_0_50%,#f1f5f9_0_75%,#fff_0)] bg-[length:16px_16px]"
              aria-label={onSelect ? `Use ${m.name}` : m.name}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.url} alt="" loading="lazy" className="absolute inset-0 size-full object-contain" />
              {isSel && (
                <span className="absolute top-2 right-2 grid size-6 place-items-center rounded-full bg-royal-600 text-white">
                  <Check className="size-3.5" />
                </span>
              )}
            </button>
            <div className="flex items-center gap-1 p-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-navy-800" title={m.name}>{m.name}</p>
                <p className="text-[11px] text-slate-500">{kb(m.size)} · {timeAgo(m.uploadedAt)}</p>
              </div>
              <button
                type="button"
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-navy-800"
                aria-label="Copy URL"
                onClick={() => {
                  void navigator.clipboard.writeText(m.url);
                  setCopied(m.id);
                  setTimeout(() => setCopied(null), 1500);
                }}
              >
                {copied === m.id ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
              </button>
              {onDelete && (
                <button type="button" className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label={`Delete ${m.name}`} onClick={() => onDelete(m)}>
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
