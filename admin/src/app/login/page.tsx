import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getSession()) redirect("/");
  const { next } = await searchParams;
  // Only same-app paths; never an open redirect.
  const safeNext = next && /^\/(?!\/)[\w\-/]*$/.test(next) ? next : "/";

  return (
    <main className="relative isolate grid min-h-dvh place-items-center overflow-hidden bg-navy-950 px-4 py-10">
      {/* Electric-ocean glow + blueprint grid */}
      <div aria-hidden className="absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-royal-600/30 blur-[120px]" />
        <div className="absolute right-[-10%] bottom-[-20%] h-[420px] w-[520px] rounded-full bg-royal-800/40 blur-[110px]" />
        <div className="absolute bottom-[-12%] left-[-8%] h-[260px] w-[360px] rounded-full bg-gold-500/10 blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "linear-gradient(#8ab0ff 1px,transparent 1px),linear-gradient(90deg,#8ab0ff 1px,transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          }}
        />
      </div>

      <div className="w-full max-w-[420px] animate-fade-up">
        <div className="mb-8 flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/admin/logo-mark.png" alt="" width={70} height={48} className="h-12 w-auto drop-shadow-[0_6px_24px_rgba(0,82,255,0.55)]" />
          <p className="mt-4 text-[11px] font-semibold tracking-[0.22em] text-royal-300 uppercase">Sinvesta Group</p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-white">Control Centre</h1>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_30px_80px_-20px_rgba(0,20,80,0.8)] backdrop-blur-xl sm:p-8">
          <LoginForm next={safeNext} />
        </div>

        <p className="mt-6 text-center text-xs leading-5 text-slate-500">
          Restricted area. Sign-ins are logged.
          <br />
          <a href="/" className="text-slate-400 underline-offset-4 hover:text-white hover:underline">← Back to sinvesta.com.au</a>
        </p>
      </div>
    </main>
  );
}
