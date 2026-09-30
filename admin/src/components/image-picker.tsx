"use client";

import { ImagePlus, RotateCcw, X } from "lucide-react";
import { useEffect, useState } from "react";
import { previewSrc } from "@/lib/format";
import { Dropzone, MediaGrid, useMedia } from "./media-library";
import { Button, Input } from "./ui/primitives";

/** Thumbnail + "Change" → modal with upload and the media library. */
export function ImagePicker({ value, onChange, defaultValue }: { value: string; onChange: (v: string) => void; defaultValue?: string }) {
  const [open, setOpen] = useState(false);
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [value]);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-2.5">
      <div className="relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-lg bg-[conic-gradient(#f1f5f9_25%,#fff_0_50%,#f1f5f9_0_75%,#fff_0)] bg-[length:12px_12px] ring-1 ring-slate-200">
        {value && !broken ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewSrc(value)} alt="" className="size-full object-cover" onError={() => setBroken(true)} />
        ) : (
          <ImagePlus className="size-5 text-slate-400" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-mono text-[11.5px] text-slate-600" title={value}>
          {value ? value.replace(/^\/uploads\//, "library/") : "No image"}
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <Button type="button" size="sm" variant="secondary" onClick={() => setOpen(true)}>
            {value ? "Replace" : "Choose image"}
          </Button>
          {defaultValue !== undefined && value !== defaultValue && (
            <Button type="button" size="sm" variant="ghost" onClick={() => onChange(defaultValue)} icon={<RotateCcw className="size-3" />}>
              Original
            </Button>
          )}
        </div>
      </div>
      {open && <PickerModal value={value} onClose={() => setOpen(false)} onPick={(v) => { onChange(v); setOpen(false); }} />}
    </div>
  );
}

function PickerModal({ value, onPick, onClose }: { value: string; onPick: (v: string) => void; onClose: () => void }) {
  const media = useMedia();
  const [path, setPath] = useState(value.startsWith("assets/") ? value : "");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Choose image">
      <div className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[92dvh] w-full max-w-5xl animate-fade-up flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <header className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
          <h2 className="flex-1 text-base font-semibold text-navy-800">Choose an image</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close">
            <X className="size-5" />
          </button>
        </header>
        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          <Dropzone
            compact
            busy={media.uploading > 0}
            onFiles={async (files) => {
              const up = await media.upload(files);
              if (up.length === 1) onPick(up[0].url);
            }}
          />
          <div>
            <h3 className="mb-3 text-[13px] font-semibold text-navy-800">Media library</h3>
            {media.items === null ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => <div key={i} className="aspect-[4/3] animate-pulse rounded-xl bg-slate-100" />)}
              </div>
            ) : (
              <MediaGrid items={media.items} selected={value} onSelect={(m) => onPick(m.url)} />
            )}
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <label htmlFor="asset-path" className="text-[13px] font-semibold text-navy-800">Or use an image already on the site</label>
            <div className="mt-2 flex gap-2">
              <Input id="asset-path" mono value={path} onChange={(e) => setPath(e.target.value)} placeholder="assets/img/kit-sigenergy.webp" />
              <Button type="button" variant="secondary" disabled={!/^assets\/img\/[\w./-]+\.(png|jpe?g|webp|avif|gif)$/i.test(path)} onClick={() => onPick(path)}>
                Use path
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
