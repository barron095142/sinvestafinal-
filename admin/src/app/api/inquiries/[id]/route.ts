import { z } from "zod";
import { logActivity } from "@/lib/cms";
import { adminRoute, HttpError, json } from "@/lib/http";
import { getInquiry, saveInquiry } from "@/lib/inquiries";
import { INQUIRY_STATUSES } from "@/lib/schemas";

type Ctx = { params: Promise<{ id: string }> };
const patch = z.object({ status: z.enum(INQUIRY_STATUSES).optional(), notes: z.string().max(5000).optional() });

export const PATCH = adminRoute<Ctx>(async (req, { params, session }) => {
  const { id } = await params;
  const inq = await getInquiry(id);
  if (!inq) throw new HttpError(404, "Enquiry not found");
  const parsed = patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) throw new HttpError(422, "Invalid update");
  const next = { ...inq, ...parsed.data };
  await saveInquiry(next);
  if (parsed.data.status && parsed.data.status !== inq.status) {
    await logActivity(session.email, `Marked ${inq.name}'s enquiry as ${parsed.data.status}`);
  }
  return json({ item: next });
});
