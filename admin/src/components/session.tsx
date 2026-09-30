"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { apiFetch, goToLogin, type ApiError } from "@/lib/client";
import { Shell } from "./shell";

interface Me {
  email: string;
  newInquiries: number;
  emailConfigured: boolean;
}

const Ctx = createContext<{ me: Me; refresh: () => void } | null>(null);

/** Session for the whole dashboard; also refreshes the sidebar's "new enquiries" badge. */
export function useSession() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSession outside SessionGate");
  return ctx;
}

/**
 * The static admin pages contain no data; this asks the PHP API who is signed
 * in. Without a session apiFetch() sends the browser to the login screen.
 */
export function SessionGate({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const refresh = useCallback(() => {
    apiFetch<Me>("/auth/me")
      .then(setMe)
      .catch((e: ApiError) => {
        if (e.status === 401) goToLogin();
      });
  }, []);
  useEffect(refresh, [refresh]);

  if (!me) {
    return (
      <div className="grid min-h-dvh place-items-center bg-canvas" aria-busy="true">
        <div className="flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/admin/logo-mark.png" alt="" className="h-9 w-auto animate-pulse" />
          <p className="text-sm text-slate-500">Checking your session…</p>
        </div>
      </div>
    );
  }
  return (
    <Ctx.Provider value={{ me, refresh }}>
      <Shell email={me.email} newInquiries={me.newInquiries}>
        {children}
      </Shell>
    </Ctx.Provider>
  );
}
