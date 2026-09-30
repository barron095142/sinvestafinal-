import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { BASE_PATH, SESSION_COOKIE, SESSION_TTL_SECONDS } from "./constants";
import { env } from "./env";

export interface Session {
  email: string;
  exp: number;
}

export async function createSessionToken(email: string) {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(email)
    .setIssuedAt()
    .setIssuer("sinvesta-admin")
    .setAudience("sinvesta-admin")
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(env.authSecret);
}

export async function verifySessionToken(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, env.authSecret, {
      issuer: "sinvesta-admin",
      audience: "sinvesta-admin",
      algorithms: ["HS256"],
    });
    // Only the configured admin is valid — rotating ADMIN_EMAIL logs everyone out.
    if (typeof payload.email !== "string" || payload.email !== env.adminEmail) return null;
    return { email: payload.email, exp: payload.exp ?? 0 };
  } catch {
    return null;
  }
}

export const sessionCookie = {
  name: SESSION_COOKIE,
  options: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: BASE_PATH,
    maxAge: SESSION_TTL_SECONDS,
  },
};

/** For server components and route handlers. */
export async function getSession() {
  const jar = await cookies();
  return verifySessionToken(jar.get(SESSION_COOKIE)?.value);
}
