"use client";

import { useCallback, useEffect, useState } from "react";
import { api, BASE_PATH } from "./constants";

/** What GET /cms/{section} returns: stored values merged with defaults. */
export interface SectionResponse<T> {
  data: T;
  updatedAt: string | null;
  updatedBy: string | null;
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: { path: string; message: string }[]) {
    super(message);
  }
}

export function goToLogin() {
  const here = window.location.pathname.replace(new RegExp(`^${BASE_PATH}`), "").replace(/\/$/, "");
  const next = here && here !== "/login" ? `?next=${encodeURIComponent(here)}` : "";
  window.location.replace(`${BASE_PATH}/login/${next}`);
}

/** JSON call to the PHP API. A 401 anywhere except auth sends the user to the login screen. */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const isForm = init.body instanceof FormData;
  const res = await fetch(api(path), {
    credentials: "same-origin",
    ...init,
    headers: { Accept: "application/json", ...(init.body && !isForm ? { "Content-Type": "application/json" } : {}), ...init.headers },
  });
  const body = await res.json().catch(() => ({}));
  if (res.status === 401 && !path.startsWith("/auth/")) {
    goToLogin();
    throw new ApiError(401, "Your session has ended. Please sign in again.");
  }
  if (!res.ok) throw new ApiError(res.status, body.error ?? "Something went wrong on the server.", body.details);
  return body as T;
}

/** Load several endpoints at once; `data` is null until all have arrived. */
export function useApi<T extends unknown[]>(paths: string[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const key = paths.join("|");

  useEffect(() => {
    let alive = true;
    setError(null);
    Promise.all(key.split("|").map((p) => apiFetch(p)))
      .then((r) => alive && setData(r as T))
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [key, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, reload };
}
