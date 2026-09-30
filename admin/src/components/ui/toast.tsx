"use client";

import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type Kind = "success" | "error" | "info";
interface Toast {
  id: number;
  kind: Kind;
  title: string;
  body?: string;
}

const Ctx = createContext<(kind: Kind, title: string, body?: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismiss = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));
  const push = useCallback((kind: Kind, title: string, body?: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-3), { id, kind, title, body }]);
    setTimeout(() => dismiss(id), kind === "error" ? 7000 : 4000);
  }, []);

  return (
    <Ctx.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed top-20 right-4 z-[60] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} role="status" className="pointer-events-auto flex animate-toast-in items-start gap-3 rounded-xl bg-navy-800 p-3.5 pr-2.5 text-white shadow-lift ring-1 ring-white/10">
            {t.kind === "success" ? (
              <CircleCheck className="mt-0.5 size-5 shrink-0 text-emerald-400" aria-hidden />
            ) : t.kind === "error" ? (
              <CircleAlert className="mt-0.5 size-5 shrink-0 text-red-400" aria-hidden />
            ) : (
              <Info className="mt-0.5 size-5 shrink-0 text-royal-300" aria-hidden />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{t.title}</p>
              {t.body && <p className="mt-0.5 text-[13px] leading-5 text-slate-300">{t.body}</p>}
            </div>
            <button type="button" onClick={() => dismiss(t.id)} className="rounded-md p-1 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Dismiss">
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
