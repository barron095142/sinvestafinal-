"use client";

import {
  ExternalLink, FileText, Images, Inbox, LayoutDashboard, LogOut, Menu, Network, Plug, Search, Settings, X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/constants";
import { cx } from "./ui/primitives";
import { ToastProvider } from "./ui/toast";

const NAV: { heading: string; items: { href: string; label: string; icon: typeof Settings; badgeKey?: "inquiries" }[] }[] = [
  {
    heading: "Overview",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/inquiries", label: "Quote Enquiries", icon: Inbox, badgeKey: "inquiries" },
    ],
  },
  {
    heading: "Website",
    items: [
      { href: "/content", label: "Page Content", icon: FileText },
      { href: "/media", label: "Media Library", icon: Images },
      { href: "/settings", label: "Global Settings", icon: Settings },
    ],
  },
  {
    heading: "Search & Growth",
    items: [
      { href: "/seo", label: "SEO Manager", icon: Search },
      { href: "/seo/sitemap", label: "Sitemap & Robots", icon: Network },
      { href: "/integrations", label: "Integrations & Scripts", icon: Plug },
    ],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/seo") return pathname === "/seo";
  return pathname === href || pathname.startsWith(href + "/");
}

function Sidebar({ newInquiries, onNavigate }: { newInquiries: number; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col bg-navy-900 bg-[radial-gradient(120%_60%_at_0%_0%,rgba(0,82,255,0.18),transparent_60%)] text-slate-300">
      <Link href="/" onClick={onNavigate} className="flex items-center gap-3 px-5 pt-6 pb-7">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/admin/logo-mark.png" alt="" width={46} height={32} className="h-8 w-auto" />
        <span className="leading-tight">
          <span className="block text-[15px] font-semibold tracking-tight text-white italic">SINVESTA</span>
          <span className="block text-[11px] font-medium tracking-wider text-royal-300 uppercase">Control Centre</span>
        </span>
      </Link>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-6" aria-label="Admin">
        {NAV.map((group) => (
          <div key={group.heading}>
            <p className="mb-2 px-3 text-[10.5px] font-semibold tracking-[0.16em] text-slate-500 uppercase">{group.heading}</p>
            <ul className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon, badgeKey }) => {
                const active = isActive(pathname, href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cx(
                        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-colors",
                        active ? "bg-royal-600 text-white shadow-glow" : "hover:bg-white/[0.06] hover:text-white",
                      )}
                    >
                      <Icon className={cx("size-[18px]", active ? "text-white" : "text-slate-400 group-hover:text-royal-300")} aria-hidden />
                      <span className="flex-1">{label}</span>
                      {badgeKey === "inquiries" && newInquiries > 0 && (
                        <span className="min-w-5 rounded-full bg-gold-500 px-1.5 text-center font-mono text-[11px] leading-5 font-semibold text-navy-900">
                          {newInquiries}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/[0.06] p-3">
        <a href="/" target="_blank" rel="noopener" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium hover:bg-white/[0.06] hover:text-white">
          <ExternalLink className="size-[18px] text-slate-400" aria-hidden />
          View live website
        </a>
      </div>
    </div>
  );
}

export function Shell({ email, newInquiries, children }: { email: string; newInquiries: number; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function logout() {
    await fetch(api("/auth/logout"), { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <ToastProvider>
      <div className="min-h-dvh lg:pl-[272px]">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-[272px] lg:block">
          <Sidebar newInquiries={newInquiries} />
        </aside>

        {/* Mobile drawer */}
        <div className={cx("fixed inset-0 z-50 lg:hidden", open ? "" : "pointer-events-none")} aria-hidden={!open}>
          <div className={cx("absolute inset-0 bg-navy-950/60 backdrop-blur-sm transition-opacity", open ? "opacity-100" : "opacity-0")} onClick={() => setOpen(false)} />
          <div className={cx("absolute inset-y-0 left-0 w-[280px] max-w-[85vw] shadow-2xl transition-transform duration-200", open ? "translate-x-0" : "-translate-x-full")} role="dialog" aria-modal="true" aria-label="Menu">
            <Sidebar newInquiries={newInquiries} onNavigate={() => setOpen(false)} />
            <button type="button" onClick={() => setOpen(false)} className="absolute top-5 right-3 rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Close menu">
              <X className="size-5" />
            </button>
          </div>
        </div>

        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200/70 bg-white/80 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <button type="button" onClick={() => setOpen(true)} className="-ml-1 rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Open menu">
            <Menu className="size-5" />
          </button>
          <p className="text-[13px] font-medium text-slate-500">
            <span className="hidden sm:inline">Solar Investment Australia · </span>Website admin
          </p>
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden text-right sm:block">
              <p className="text-[13px] leading-4 font-semibold text-navy-800">{email}</p>
              <p className="text-[11px] text-slate-500">Administrator</p>
            </div>
            <span className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-royal-500 to-royal-800 text-sm font-semibold text-white uppercase">
              {email[0]}
            </span>
            <button type="button" onClick={logout} className="ml-1 inline-flex h-9 items-center gap-2 rounded-lg px-3 text-[13px] font-semibold text-slate-600 hover:bg-slate-100 hover:text-navy-800">
              <LogOut className="size-4" aria-hidden />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1400px] px-4 pt-6 pb-32 sm:px-6 lg:px-8 lg:pt-8">{children}</main>
      </div>
    </ToastProvider>
  );
}
