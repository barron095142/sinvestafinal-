"use client";

import { ArrowRight, Eye, EyeOff, LoaderCircle, Lock, Mail } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api, BASE_PATH } from "@/lib/constants";

export function LoginForm() {
  const raw = useSearchParams().get("next") ?? "";
  // Only same-app paths; never an open redirect.
  const next = /^\/(?!\/)[\w\-/]*$/.test(raw) ? raw : "/";
  const target = `${BASE_PATH}${next.replace(/\/?$/, "/")}`;

  // Already signed in? Skip the form.
  useEffect(() => {
    fetch(api("/auth/me"), { credentials: "same-origin" }).then((r) => r.ok && window.location.replace(target)).catch(() => {});
  }, [target]);
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setPending(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch(api("/auth/login"), {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
      });
      if (res.ok) {
        window.location.replace(target);
        return;
      }
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Sign-in failed.");
    } catch {
      setError("Can't reach the server. Check your connection.");
    }
    setPending(false);
  }

  const input =
    "h-12 w-full rounded-xl border border-white/10 bg-navy-950/60 pr-4 pl-11 text-[15px] text-white placeholder:text-slate-500 transition focus:border-royal-500 focus:bg-navy-950/80 focus:ring-4 focus:ring-royal-600/25 focus:outline-none";

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div>
        <label htmlFor="email" className="mb-2 block text-[13px] font-medium text-slate-300">Email</label>
        <div className="relative">
          <Mail className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-slate-500" aria-hidden />
          <input id="email" name="email" type="email" autoComplete="username" required autoFocus placeholder="you@sinvesta.com.au" className={input} />
        </div>
      </div>
      <div>
        <label htmlFor="password" className="mb-2 block text-[13px] font-medium text-slate-300">Password</label>
        <div className="relative">
          <Lock className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-slate-500" aria-hidden />
          <input id="password" name="password" type={show ? "text" : "password"} autoComplete="current-password" required placeholder="••••••••••••" className={`${input} pr-12`} />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute top-1/2 right-2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-slate-400 hover:bg-white/5 hover:text-white"
            aria-label={show ? "Hide password" : "Show password"}
            aria-pressed={show}
          >
            {show ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-red-400/20 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-200">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-royal-600 text-[15px] font-semibold text-white shadow-glow transition hover:bg-royal-500 disabled:opacity-70"
      >
        {pending ? <LoaderCircle className="size-5 animate-spin" /> : <>Sign in <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" /></>}
      </button>
    </form>
  );
}
