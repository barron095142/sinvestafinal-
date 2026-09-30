import bcrypt from "bcryptjs";
import { z } from "zod";
import { createSessionToken, sessionCookie } from "@/lib/auth";
import { logActivity } from "@/lib/cms";
import { env } from "@/lib/env";
import { clientIp, errorResponse, HttpError, json } from "@/lib/http";
import { isTrustedOrigin } from "@/lib/origin";
import { rateLimit, resetRateLimit } from "@/lib/rate-limit";

const body = z.object({ email: z.string().trim().toLowerCase().max(160), password: z.string().min(1).max(200) });

// Compared against when the email is wrong, so both paths take bcrypt time.
const DUMMY_HASH = "$2b$12$/lMLCs5ajjvBS7j0ZQDQ0uJb3OIrm31TI6QIWSvJePOEsExyHYnji";

export async function POST(req: Request) {
  try {
    if (!(await isTrustedOrigin(req))) throw new HttpError(403, "Cross-origin request blocked");

    const ip = clientIp(req);
    const limit = rateLimit(`login:${ip}`, 5, 15 * 60_000);
    if (!limit.ok) {
      throw new HttpError(429, `Too many attempts. Try again in ${Math.ceil(limit.retryAfter / 60)} min.`);
    }

    const parsed = body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new HttpError(400, "Enter your email and password.");
    const { email, password } = parsed.data;

    const emailOk = email === env.adminEmail;
    const passOk = await bcrypt.compare(password, emailOk ? env.adminPasswordHash : DUMMY_HASH);
    if (!emailOk || !passOk) {
      await new Promise((r) => setTimeout(r, 400 + Math.random() * 400));
      throw new HttpError(401, "Email or password is incorrect.");
    }

    resetRateLimit(`login:${ip}`);
    const token = await createSessionToken(email);
    await logActivity(email, "Signed in");
    const res = json({ ok: true });
    res.cookies.set(sessionCookie.name, token, sessionCookie.options);
    return res;
  } catch (err) {
    return errorResponse(err);
  }
}
