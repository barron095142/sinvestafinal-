"use client";

import { CircleAlert, RotateCcw } from "lucide-react";
import { Button } from "./ui/primitives";

/** Placeholder while a screen's data loads. */
export function PageSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="mb-6 space-y-3">
        <div className="h-3 w-24 animate-pulse rounded bg-royal-100" />
        <div className="h-8 w-64 animate-pulse rounded-lg bg-slate-200" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded bg-slate-200/70" />
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {Array.from({ length: cards }).map((_, i) => (
          <div key={i} className="h-64 animate-pulse rounded-2xl border border-slate-200/80 bg-white" />
        ))}
      </div>
    </div>
  );
}

export function PageError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mx-auto mt-16 max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center shadow-card">
      <CircleAlert className="mx-auto size-8 text-red-500" />
      <p className="mt-3 font-semibold text-navy-800">Couldn&rsquo;t load this page</p>
      <p className="mt-1 text-sm text-slate-500">{message}</p>
      <Button className="mt-4" variant="secondary" onClick={onRetry} icon={<RotateCcw className="size-4" />}>
        Try again
      </Button>
    </div>
  );
}
