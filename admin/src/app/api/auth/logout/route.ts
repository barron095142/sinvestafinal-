import { sessionCookie } from "@/lib/auth";
import { json } from "@/lib/http";

export async function POST() {
  const res = json({ ok: true });
  res.cookies.set(sessionCookie.name, "", { ...sessionCookie.options, maxAge: 0 });
  return res;
}
