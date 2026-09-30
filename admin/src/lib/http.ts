import "server-only";
import { NextResponse } from "next/server";
import type { ZodError } from "zod";
import { getSession, type Session } from "./auth";
import { isTrustedOrigin } from "./origin";

export class HttpError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

export function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: { "Cache-Control": "no-store", ...init?.headers },
  });
}

/**
 * Mutating admin requests must come from our own pages. SameSite=Strict
 * already blocks cross-site cookies; this is the belt to that brace.
 */
async function assertSameOrigin(req: Request) {
  if (req.method === "GET" || req.method === "HEAD") return;
  if (!(await isTrustedOrigin(req))) throw new HttpError(403, "Cross-origin request blocked");
}

type Handler<C> = (req: Request, ctx: C & { session: Session }) => Promise<Response>;

/** Wrap an admin route handler: session required, same origin, uniform errors. */
export function adminRoute<C = object>(handler: Handler<C>) {
  return async (req: Request, ctx: C) => {
    try {
      await assertSameOrigin(req);
      const session = await getSession();
      if (!session) throw new HttpError(401, "Not signed in");
      return await handler(req, { ...ctx, session });
    } catch (err) {
      return errorResponse(err);
    }
  };
}

export function errorResponse(err: unknown) {
  if (err instanceof HttpError) {
    return json({ error: err.message, details: err.details }, { status: err.status });
  }
  console.error(err);
  return json({ error: "Something went wrong on the server." }, { status: 500 });
}

export function zodDetails(err: ZodError) {
  return err.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
}

export function clientIp(req: Request) {
  return (
    req.headers.get("x-nf-client-connection-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}
