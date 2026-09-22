import { NextResponse } from "next/server";
import { z } from "zod";
import { ProtectionArtifact } from "@everrule/rule-schema";
import { createPullRequest, prPlan, targetFromEnv } from "@/lib/github";
import { allow } from "@/lib/rate-limit";

export function GET() {
  const t = targetFromEnv();
  return NextResponse.json(t ? { configured: true, target: `${t.owner}/${t.repo}`, base: t.base } : { configured: false });
}

const Body = z.object({ artifact: ProtectionArtifact });

export async function POST(req: Request) {
  const t = targetFromEnv();
  if (!t) return NextResponse.json({ error: "GitHub PR creation is not configured on this deployment. Download the patch instead." }, { status: 501 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!allow(ip, 5, 10 * 60 * 1000)) return NextResponse.json({ error: "Too many PRs from this address. Try again in ten minutes." }, { status: 429 });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  try {
    const result = await createPullRequest(t, prPlan(parsed.data.artifact));
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 502 });
  }
}
