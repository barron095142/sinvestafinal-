import { getSection } from "@/lib/cms";
import { BASE_PATH } from "@/lib/constants";
import { isTrustedOrigin } from "@/lib/origin";
import { clientIp, errorResponse, HttpError, json } from "@/lib/http";
import { newInquiryId, saveInquiry } from "@/lib/inquiries";
import { emailInquiry } from "@/lib/mail";
import { rateLimit } from "@/lib/rate-limit";
import { publicInquirySchema, type Inquiry } from "@/lib/schemas";

/** Quote forms on the public site post here (same origin, via the /admin proxy). */
export async function POST(req: Request) {
  try {
    if (!(await isTrustedOrigin(req))) throw new HttpError(403, "Origin not allowed");
    const { data: settings } = await getSection("settings");

    if (!rateLimit(`inq:${clientIp(req)}`, 5, 10 * 60_000).ok) throw new HttpError(429, "Too many enquiries — please call us instead.");

    const parsed = publicInquirySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new HttpError(422, "Please check the form and try again.");
    const { website: honeypot, ...fields } = parsed.data;
    // Bots fill every field. Pretend it worked so they don't adapt.
    if (honeypot) return json({ ok: true, emailed: true }, { status: 201 });

    const inq: Inquiry = { ...fields, id: newInquiryId(), createdAt: new Date().toISOString(), status: "new", emailed: false, notes: "" };
    inq.emailed = await emailInquiry(inq, settings.notificationEmail, `${settings.siteUrl.replace(/\/$/, "")}${BASE_PATH}/inquiries`);
    await saveInquiry(inq);
    return json({ ok: true, emailed: inq.emailed }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
