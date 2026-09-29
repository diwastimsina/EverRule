import { NextResponse } from "next/server";
import { z } from "zod";
import { ApprovalRecord, CandidateRule, LoopholeCheck } from "@everrule/rule-schema";
import { ruleHash } from "@everrule/loophole-engine";
import { buildMatrix, runMatrix } from "@everrule/rule-tests";
import { generateProtection } from "@everrule/policy-generator";
import { createPullRequest, prPlan, targetFromEnv } from "@/lib/github";
import { allow } from "@/lib/rate-limit";
import { requireSession } from "@/lib/session";

export function GET(req: Request) {
  const denied = requireSession(req);
  if (denied) return denied;
  const t = targetFromEnv();
  return NextResponse.json(t ? { configured: true, target: `${t.owner}/${t.repo}`, base: t.base } : { configured: false });
}

const MAX_BODY = 512 * 1024;
const line = (max: number) => z.string().max(max).refine((s) => !/[\r\n]/.test(s), "single line");

// The client sends the reviewed rule and approval. The server rebuilds the
// files itself, so nothing the client sends becomes a path or file body.
const Body = z.object({
  rule: CandidateRule.extend({ plain_english: line(600), assumptions: z.array(line(300)).max(20), missing_evidence: z.array(line(300)).max(20), evidence_citations: z.array(line(100)).max(20) }),
  approval: ApprovalRecord.extend({ approver_name: line(120), approver_role: line(120), approved_at: line(40), rationale: line(600) }),
  checks: z.array(LoopholeCheck).max(20),
  incident_id: line(40),
  exposure: z.number().nonnegative().max(1e9),
});

export async function POST(req: Request) {
  const denied = requireSession(req);
  if (denied) return denied;
  const t = targetFromEnv();
  if (!t) return NextResponse.json({ error: "GitHub PR creation is not configured on this deployment. Download the patch instead." }, { status: 501 });

  const origin = req.headers.get("origin"), host = req.headers.get("host");
  if (origin && host && new URL(origin).host !== host) return NextResponse.json({ error: "cross-origin request refused" }, { status: 403 });
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY) return NextResponse.json({ error: "request too large" }, { status: 413 });

  const ip = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",").pop()?.trim() || "local";
  if (!allow(ip, 5, 10 * 60 * 1000, 20)) return NextResponse.json({ error: "PR limit reached for now. Try again in ten minutes, or download the patch." }, { status: 429 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { rule, approval, checks, incident_id, exposure } = parsed.data;
  if (approval.rule_hash !== ruleHash(rule)) return NextResponse.json({ error: "The rule changed after it was approved. Approve the current rule first." }, { status: 409 });
  const results = runMatrix(rule, buildMatrix(rule, exposure));
  const artifact = generateProtection(rule, approval, checks, results, incident_id, exposure);
  try {
    const result = await createPullRequest(t, prPlan(artifact));
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 502 });
  }
}
