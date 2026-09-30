import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/auth";
import { BASE_PATH, SESSION_COOKIE } from "@/lib/constants";

/**
 * First gate for every /admin/* request: API calls without a valid session
 * get a 401 here. Pages are redirected to the login screen by the dashboard
 * layout (server-side redirect() emits a same-site relative Location, which
 * matters behind the public site's /admin proxy where this app's own host is
 * *.netlify.app). Route handlers check the session again as well.
 */
function isPublicApi(path: string, method: string) {
  return (
    path === "/api/auth/login" ||
    path.startsWith("/api/public/") ||
    (method === "GET" && /^\/api\/media\/[0-9a-f-]{36}$/.test(path))
  );
}

export async function proxy(req: NextRequest) {
  // nextUrl.pathname normally has basePath removed already; strip it defensively.
  const path = req.nextUrl.pathname.replace(new RegExp(`^${BASE_PATH}(?=/|$)`), "") || "/";

  if (path.startsWith("/api/") && !isPublicApi(path, req.method)) {
    const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
    if (!session) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }
  }

  // Tell the layout which page was asked for, so login can send the user back.
  const headers = new Headers(req.headers);
  headers.set("x-admin-path", path);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo-mark.png).*)"],
};
