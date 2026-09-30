import "server-only";
import { env } from "./env";
import { escapeHtml } from "./sanitize";
import type { Inquiry } from "./schemas";

/** Email a new enquiry via Resend. Returns false (never throws) if not configured or it fails. */
export async function emailInquiry(inq: Inquiry, to: string, adminUrl: string) {
  if (!env.resendApiKey) return false;
  const rows: [string, string][] = [
    ["Name", inq.name], ["Phone", inq.phone], ["Email", inq.email], ["Suburb / postcode", inq.suburb],
    ["Property", inq.property], ["Interested in", inq.system], ["Quarterly bill", inq.bill],
    ["Source", inq.source === "promo-popup" ? "Quote pop-up" : "Contact form"],
  ];
  const html = `<div style="font-family:system-ui,sans-serif;max-width:560px">
  <h2 style="color:#0F172A;margin:0 0 12px">New solar enquiry — ${escapeHtml(inq.name)}</h2>
  <table style="border-collapse:collapse;width:100%">${rows
    .filter(([, v]) => v)
    .map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#64748B;white-space:nowrap">${k}</td><td style="padding:6px 0;color:#0F172A"><strong>${escapeHtml(v)}</strong></td></tr>`)
    .join("")}</table>
  ${inq.message ? `<p style="white-space:pre-wrap;background:#F1F5F9;padding:12px;border-radius:8px">${escapeHtml(inq.message)}</p>` : ""}
  <p><a href="${adminUrl}" style="color:#0052FF">Open in the admin dashboard →</a></p></div>`;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: env.resendFrom,
        to: [to],
        reply_to: inq.email || undefined,
        subject: `Solar enquiry — ${inq.name}${inq.system ? ` (${inq.system})` : ""}`,
        html,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) console.error("Resend failed", res.status, await res.text());
    return res.ok;
  } catch (e) {
    console.error("Resend error", e);
    return false;
  }
}
