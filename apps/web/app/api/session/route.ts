import { NextResponse } from "next/server";
import { z } from "zod";
import { mode, uploadsAllowed } from "@/lib/config";
import { targetFromEnv } from "@/lib/github";
import { allow } from "@/lib/rate-limit";
import { passwordMatches, sessionCookie, sessionState } from "@/lib/session";

export function GET(req: Request) {
  const state = sessionState(req);
  const inside = state === "open" || state === "authenticated";
  return NextResponse.json({
    state,
    mode: inside ? mode() : null,
    uploads: inside ? uploadsAllowed() : false,
    pr_target: inside ? (() => { const t = targetFromEnv(); return t ? `${t.owner}/${t.repo}` : null; })() : null,
  });
}

const Body = z.object({ password: z.string().min(1).max(200) });

export async function POST(req: Request) {
  const ip = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",").pop()?.trim() || "local";
  if (!allow(`login:${ip}`, 10, 10 * 60 * 1000, 100)) return NextResponse.json({ error: "Too many attempts. Try again in ten minutes." }, { status: 429 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !passwordMatches(parsed.data.password)) return NextResponse.json({ error: "That password is not right." }, { status: 401 });
  const res = NextResponse.json({ ok: true });
  res.headers.set("set-cookie", sessionCookie());
  return res;
}
