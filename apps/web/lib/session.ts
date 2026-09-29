// DEMO_PASSWORD gate for the page and every API route. The cookie holds an
// HMAC of the password, never the password. Without DEMO_PASSWORD the app is
// open locally and refuses to serve on a Vercel production deployment.
import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export const COOKIE = "everrule_session";
const MAX_AGE = 12 * 60 * 60;

type Env = Record<string, string | undefined>;

export const isProduction = (env: Env = process.env) => env.VERCEL_ENV === "production";

export function token(password: string): string {
  return createHmac("sha256", password).update("everrule-demo-session-v1").digest("hex");
}

function same(a: string, b: string): boolean {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

function cookieValue(req: Request): string | null {
  const raw = req.headers.get("cookie") ?? "";
  for (const part of raw.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === COOKIE) return decodeURIComponent(v.join("="));
  }
  return null;
}

export type SessionState = "open" | "authenticated" | "locked" | "misconfigured";

export function sessionState(req: Request, env: Env = process.env): SessionState {
  const pw = env.DEMO_PASSWORD;
  if (!pw) return isProduction(env) ? "misconfigured" : "open";
  const c = cookieValue(req);
  return c && same(c, token(pw)) ? "authenticated" : "locked";
}

/** Returns a response to send when the caller is not allowed in, or null to proceed. */
export function requireSession(req: Request, env: Env = process.env): NextResponse | null {
  const s = sessionState(req, env);
  if (s === "open" || s === "authenticated") return null;
  if (s === "misconfigured") return NextResponse.json({ error: "This deployment has no DEMO_PASSWORD set, so it is closed." }, { status: 503 });
  return NextResponse.json({ error: "Enter the demo password first." }, { status: 401 });
}

export function passwordMatches(candidate: string, env: Env = process.env): boolean {
  const pw = env.DEMO_PASSWORD;
  return !!pw && same(token(candidate), token(pw));
}

export function sessionCookie(env: Env = process.env): string {
  const pw = env.DEMO_PASSWORD ?? "";
  const secure = isProduction(env) || env.VERCEL === "1" ? "; Secure" : "";
  return `${COOKIE}=${token(pw)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}${secure}`;
}
