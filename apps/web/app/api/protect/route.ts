import { NextResponse } from "next/server";
import { z } from "zod";
import { ApprovalRecord, CandidateRule, LoopholeCheck } from "@everrule/rule-schema";
import { buildMatrix, runMatrix } from "@everrule/rule-tests";
import { generateProtection } from "@everrule/policy-generator";

const Body = z.object({
  rule: CandidateRule,
  approval: ApprovalRecord,
  checks: z.array(LoopholeCheck),
  incident_id: z.string(),
  exposure: z.number(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { rule, approval, checks, incident_id, exposure } = parsed.data;
  const accepted = checks.filter((c) => c.real && c.closed);
  const results = runMatrix(rule, buildMatrix(rule, exposure, accepted));
  const artifact = generateProtection(rule, approval, checks, results, incident_id, exposure);
  return NextResponse.json({ results, artifact });
}
