"use client";

import { Download, Inbox, Mail, MailCheck, MailX, MessageSquare, Phone, Search, TriangleAlert, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { api } from "@/lib/constants";
import { dateTime, timeAgo } from "@/lib/format";
import { INQUIRY_STATUSES, type Inquiry } from "@/lib/schemas";
import { InquiryStatusBadge, STATUS_LABEL } from "./inquiry-status";
import { Badge, Button, Card, cx, Input, LinkButton, PageHeader, Select, Textarea } from "./ui/primitives";
import { useToast } from "./ui/toast";

type Filter = "all" | Inquiry["status"];

export function InquiriesInbox({
  initial, notificationEmail, emailConfigured, initialId, initialStatus,
}: {
  initial: Inquiry[]; notificationEmail: string; emailConfigured: boolean; initialId?: string; initialStatus?: string;
}) {
  const [items, setItems] = useState(initial);
  const [filter, setFilter] = useState<Filter>((INQUIRY_STATUSES as readonly string[]).includes(initialStatus ?? "") ? (initialStatus as Filter) : "all");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(initial.some((i) => i.id === initialId) ? initialId! : null);
  const toast = useToast();
  const router = useRouter();

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    for (const i of items) c[i.status] = (c[i.status] ?? 0) + 1;
    return c;
  }, [items]);

  const visible = items.filter((i) => {
    if (filter !== "all" && i.status !== filter) return false;
    if (!q) return true;
    const hay = `${i.name} ${i.phone} ${i.email} ${i.suburb} ${i.system} ${i.message}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });
  const open = items.find((i) => i.id === openId) ?? null;

  async function update(id: string, patch: Partial<Pick<Inquiry, "status" | "notes">>) {
    const res = await fetch(api(`/inquiries/${id}`), { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    if (!res.ok) return toast("error", "Couldn't update enquiry");
    const { item } = await res.json();
    setItems((prev) => prev.map((x) => (x.id === id ? item : x)));
    if (patch.status) {
      toast("success", `Marked as ${STATUS_LABEL[patch.status]}`);
      router.refresh(); // sidebar badge
    } else toast("success", "Notes saved");
  }

  function exportCsv() {
    const cols: (keyof Inquiry)[] = ["createdAt", "status", "name", "phone", "email", "suburb", "property", "system", "bill", "message", "source", "notes"];
    const esc = (s: unknown) => `"${String(s ?? "").replace(/"/g, '""')}"`;
    const csv = [cols.join(","), ...visible.map((i) => cols.map((c) => esc(i[c])).join(","))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `sinvesta-enquiries-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Quote Enquiries"
        description={<>Every submission from the contact form and quote pop-up. New ones are emailed to <b className="text-navy-800">{notificationEmail}</b>.</>}
        actions={<Button variant="secondary" onClick={exportCsv} disabled={!visible.length} icon={<Download className="size-4" />}>Export CSV</Button>}
      />

      {!emailConfigured && (
        <div className="mb-6 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <TriangleAlert className="mt-0.5 size-5 shrink-0 text-amber-600" />
          <p>
            <b>Email alerts are off.</b> Enquiries are saved here, but nothing is emailed until <code className="font-mono text-[12.5px]">RESEND_API_KEY</code> is set in the admin site&rsquo;s environment variables. See the README.
          </p>
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
          <div className="-mx-1 flex gap-1 overflow-x-auto px-1">
            {(["all", ...INQUIRY_STATUSES] as Filter[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setFilter(s)}
                aria-pressed={filter === s}
                className={cx("flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold whitespace-nowrap", filter === s ? "bg-navy-800 text-white" : "text-slate-600 hover:bg-slate-100")}
              >
                {s === "all" ? "All" : STATUS_LABEL[s]}
                <span className={cx("font-mono text-[11px]", filter === s ? "text-slate-300" : "text-slate-400")}>{counts[s] ?? 0}</span>
              </button>
            ))}
          </div>
          <div className="relative ml-auto w-full sm:w-64">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, phone, suburb…" className="h-9 pl-9" aria-label="Search enquiries" />
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <Inbox className="mx-auto size-9 text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-navy-800">{items.length ? "Nothing matches" : "No enquiries yet"}</p>
            <p className="mt-1 text-[13px] text-slate-500">{items.length ? "Try another filter or search." : "Quote requests from the website will appear here the moment they're sent."}</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {visible.map((i) => (
              <li key={i.id}>
                <button type="button" onClick={() => setOpenId(i.id)} className={cx("grid w-full grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-4 py-3.5 text-left hover:bg-slate-50 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_auto_auto] sm:px-5", i.status === "new" && "bg-gold-500/[0.04]")}>
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      {i.status === "new" && <span className="size-2 shrink-0 rounded-full bg-gold-500" aria-label="Unread" />}
                      <span className="truncate font-semibold text-navy-800">{i.name}</span>
                    </span>
                    <span className="block truncate font-mono text-xs text-slate-500">{i.phone}</span>
                  </span>
                  <span className="hidden truncate text-sm text-slate-700 sm:block">{i.system || "—"}</span>
                  <span className="hidden truncate text-sm text-slate-500 sm:block">{i.suburb || "—"}</span>
                  <span className="hidden sm:block"><InquiryStatusBadge status={i.status} /></span>
                  <span className="text-right text-xs whitespace-nowrap text-slate-500" title={dateTime(i.createdAt)}>{timeAgo(i.createdAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {open && <Detail key={open.id} inq={open} onClose={() => setOpenId(null)} onUpdate={(p) => update(open.id, p)} />}
    </>
  );
}

function Detail({ inq, onClose, onUpdate }: { inq: Inquiry; onClose: () => void; onUpdate: (p: Partial<Pick<Inquiry, "status" | "notes">>) => void }) {
  const [notes, setNotes] = useState(inq.notes);
  const rows: [string, string][] = [
    ["Email", inq.email], ["Suburb / postcode", inq.suburb], ["Property", inq.property], ["Interested in", inq.system],
    ["Quarterly bill", inq.bill], ["Source", inq.source === "promo-popup" ? "Quote pop-up" : "Contact form"], ["Received", dateTime(inq.createdAt)],
  ];
  const tel = inq.phone.replace(/[^\d+]/g, "");
  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={`Enquiry from ${inq.name}`}>
      <div className="absolute inset-0 bg-navy-950/40 backdrop-blur-[2px]" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-md animate-fade-up flex-col bg-white shadow-2xl">
        <header className="flex items-start gap-3 border-b border-slate-100 px-6 py-5">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold tracking-wider text-royal-600 uppercase">Enquiry</p>
            <h2 className="mt-0.5 truncate text-lg font-semibold text-navy-800">{inq.name}</h2>
            <div className="mt-2 flex items-center gap-2">
              <InquiryStatusBadge status={inq.status} />
              {inq.emailed ? (
                <Badge tone="green"><MailCheck className="size-3" /> Emailed</Badge>
              ) : (
                <Badge><MailX className="size-3" /> Not emailed</Badge>
              )}
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close">
            <X className="size-5" />
          </button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-2 gap-2">
            <LinkButton variant="primary" href={`tel:${tel}`} icon={<Phone className="size-4" />}>Call</LinkButton>
            {inq.email ? (
              <LinkButton href={`mailto:${inq.email}?subject=${encodeURIComponent("Your solar quote — Sinvesta Group")}`} icon={<Mail className="size-4" />}>Email</LinkButton>
            ) : (
              <LinkButton href={`sms:${tel}`} icon={<MessageSquare className="size-4" />}>SMS</LinkButton>
            )}
          </div>
          <p className="text-center font-mono text-lg text-navy-800">{inq.phone}</p>

          <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {rows.filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="grid grid-cols-[130px_1fr] gap-3 px-4 py-2.5 text-sm">
                <dt className="text-slate-500">{k}</dt>
                <dd className="font-medium break-words text-navy-800">{v}</dd>
              </div>
            ))}
          </dl>

          {inq.message && (
            <div>
              <h3 className="mb-2 text-[13px] font-semibold text-navy-800">Message</h3>
              <p className="rounded-xl bg-slate-50 p-4 text-sm leading-6 whitespace-pre-wrap text-slate-700">{inq.message}</p>
            </div>
          )}

          <div>
            <label htmlFor="status" className="mb-1.5 block text-[13px] font-semibold text-navy-800">Status</label>
            <Select id="status" value={inq.status} onChange={(e) => onUpdate({ status: e.target.value as Inquiry["status"] })}>
              {INQUIRY_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </Select>
          </div>
          <div>
            <label htmlFor="notes" className="mb-1.5 block text-[13px] font-semibold text-navy-800">Internal notes</label>
            <Textarea id="notes" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Site visit booked Tue 10am. Wants SigEnergy." />
            <Button className="mt-2" size="sm" variant="secondary" disabled={notes === inq.notes} onClick={() => onUpdate({ notes })}>
              Save notes
            </Button>
          </div>
        </div>
      </aside>
    </div>
  );
}
