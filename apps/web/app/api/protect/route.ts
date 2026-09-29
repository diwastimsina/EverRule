import { NextResponse } from "next/server";
import { z } from "zod";
import { ApprovalInput, CandidateRule, LoopholeCheck } from "@everrule/rule-schema";
import { ruleHash } from "@everrule/loophole-engine";
import { buildMatrix, runMatrix } from "@everrule/rule-tests";
import { generateProtection } from "@everrule/policy-generator";
import { requireSession } from "@/lib/session";

const Body = z.object({
  rule: CandidateRule,
  approval: ApprovalInput,
  checks: z.array(LoopholeCheck).max(20),
  incident_id: z.string().max(40),
  exposure: z.number().nonnegative().max(1e9),
});

// Binds the approval to the exact rule the approver saw, runs the tests, and
// renders the artifact.
export async function POST(req: Request) {
  const denied = requireSession(req);
  if (denied) return denied;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Send the rule, the approval and the loophole checks." }, { status: 400 });
  const { rule, approval, checks, incident_id, exposure } = parsed.data;
  const record = { ...approval, decision: "approved" as const, rule_hash: ruleHash(rule) };
  const results = runMatrix(rule, buildMatrix(rule, exposure));
  const artifact = generateProtection(rule, record, checks, results, incident_id, exposure);
  return NextResponse.json({ results, artifact });
}
